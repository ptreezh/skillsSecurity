"""
On-chain integration module for skill-packager-universal.

Interaction modes (in priority order):
1. HTTP: call existing backend API at http://localhost:10001/api/chain
2. Node.js subprocess: reuse server/chain-submit.js + chainmaker-client.js
3. Direct ChainMaker cmc: not implemented in MVP (requires Go SDK)

Environment variables:
- BACKEND_API_URL: default http://localhost:10001
- CHAINMAKER_CONTAINER_CMD: docker exec cmc-debug
- CHAINMAKER_CMC_CMD: <CONTAINER_CMD> cmc
- CHAINMAKER_SDK_CONF: /work/sdk_config.yml
- CHAINMAKER_CERT_DIR: /work
- CHAINMAKER_ABI_DIR: /work
- CHAINMAKER_CHAIN_ID: chain1
- CHAINMAKER_ORG_ID: wx-org.chainmaker.org
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from pydantic import Field

from skill_packager.schema import FreeSkillEnhanced, OnChainReceipt, RiskLevel


@dataclass
class ChainConfig:
    backendUrl: str = Field(default_factory=lambda: os.getenv("BACKEND_API_URL", "http://localhost:10001"))
    chainId: str = Field(default_factory=lambda: os.getenv("CHAINMAKER_CHAIN_ID", "chain1"))
    contractName: str = "AS2_SkillRegistry"
    timeout: int = 120

    def __post_init__(self):
        self.backendUrl = self.backendUrl.rstrip("/")


@dataclass
class OnChainResult:
    receipt: OnChainReceipt
    success: bool
    message: str = ""


class ChainClient:
    """链上交互客户端：优先 HTTP，降级 Node.js 子进程。"""

    def __init__(self, config: Optional[ChainConfig] = None):
        self.config = config or ChainConfig()
        self._nodeScriptDir: Optional[Path] = None

    def _find_node_script_dir(self) -> Optional[Path]:
        """定位 server/ 目录（包含 chain-submit.js 的 Node.js 项目根）"""
        if self._nodeScriptDir:
            return self._nodeScriptDir
        candidates = [
            Path(__file__).resolve().parents[4] / "server",  # tools/.../server
            Path(__file__).resolve().parents[3] / "server",  # project/server
            Path.cwd() / "server",
            Path.cwd().parent / "server",
        ]
        for c in candidates:
            if (c / "chain-submit.js").exists() and (c / "chainmaker-client.js").exists():
                self._nodeScriptDir = c
                return c
        return None

    def register_skill(self, universal: FreeSkillEnhanced, creator: Optional[str] = None) -> OnChainResult:
        """Register skill on-chain. Returns OnChainReceipt."""
        skill = universal.skill or universal.agent
        if not skill:
            return OnChainResult(
                receipt=OnChainReceipt(status="failed"),
                success=False,
                message="No skill or agent definition found in universal format",
            )

        # 1) 优先尝试 HTTP 后端
        result = self._register_via_http(universal, creator)
        if result is not None:
            return result

        # 2) 降级 Node.js 子进程
        result = self._register_via_node(universal, creator)
        if result is not None:
            return result

        return OnChainResult(
            receipt=OnChainReceipt(status="failed"),
            success=False,
            message="No on-chain backend available. Start backend server or configure ChainMaker.",
        )

    def _register_via_http(self, universal: FreeSkillEnhanced, creator: Optional[str]) -> Optional[OnChainResult]:
        """Try HTTP backend."""
        try:
            payload = self._build_http_payload(universal, creator)
            resp = requests.post(
                f"{self.config.backendUrl}/api/chain",
                json=payload,
                timeout=self.config.timeout,
            )
            if resp.status_code == 200:
                data = resp.json()
                return self._build_result_from_http(data, universal)
            if resp.status_code == 404:
                return None
            return OnChainResult(
                receipt=OnChainReceipt(status="failed"),
                success=False,
                message=f"HTTP {resp.status_code}: {resp.text[:500]}",
            )
        except requests.ConnectionError:
            return None
        except requests.Timeout:
            return OnChainResult(
                receipt=OnChainReceipt(status="failed"),
                success=False,
                message=f"HTTP timeout after {self.config.timeout}s",
            )
        except Exception as e:
            return OnChainResult(
                receipt=OnChainReceipt(status="failed"),
                success=False,
                message=f"HTTP error: {e}",
            )

    def _build_http_payload(self, universal: FreeSkillEnhanced, creator: Optional[str]) -> Dict[str, Any]:
        skill = universal.skill or universal.agent
        meta = universal.freeskill
        skill_name = getattr(skill, "name", "unknown")
        description = getattr(skill, "description", "")
        version = getattr(skill, "version", "1.0.0")
        risk_map = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        risk_level = risk_map.get(meta.riskLevel.value if hasattr(meta.riskLevel, "value") else str(meta.riskLevel), 0)
        content_hash = meta.ipfsHash or meta.fingerprint or ""

        payload = {
            "name": skill_name,
            "description": description,
            "trigger": universal.skill.trigger.description if universal.skill and universal.skill.trigger else "",
            "metadataIPFS": content_hash,
            "riskLevel": risk_level,
            "version": version,
            "creator": creator or meta.creator or "",
            "skillData": universal.model_dump(mode="json", exclude_none=True),
        }

        if meta.parentSkillId is not None:
            payload["parentSkillId"] = meta.parentSkillId
        if meta.parentFingerprint:
            payload["parentFingerprint"] = meta.parentFingerprint
        if meta.forkType and meta.forkType != "original":
            payload["forkType"] = meta.forkType.value if hasattr(meta.forkType, "value") else str(meta.forkType)

        contributors = []
        for c in universal.responsibility.contributors:
            contributors.append({
                "address": c.address,
                "role": c.role,
                "weight": c.weight,
                "skillId": c.skillId,
                "contribution": c.contribution,
                "timestamp": c.timestamp,
            })
        if contributors:
            payload["contributors"] = contributors

        return payload

    def _build_result_from_http(self, data: Dict[str, Any], universal: FreeSkillEnhanced) -> OnChainResult:
        receipt = OnChainReceipt(
            skillId=data.get("skillId"),
            txHash=data.get("txHash") or data.get("txId"),
            blockNumber=data.get("blockNumber") or data.get("blockHeight"),
            contractAddress=data.get("contractAddress"),
            chainId=self.config.chainId,
            submitter=data.get("submitter") or universal.freeskill.creator,
            creator=universal.freeskill.creator,
            registeredAt=int(datetime.utcnow().timestamp()) if hasattr(__builtins__, "datetime") else None,
            gasUsed=data.get("gasUsed"),
            status="confirmed" if data.get("success", False) else "failed",
        )
        universal.onChain = receipt
        return OnChainResult(receipt=receipt, success=receipt.status == "confirmed", message=data.get("message", ""))

    def _register_via_node(self, universal: FreeSkillEnhanced, creator: Optional[str]) -> Optional[OnChainResult]:
        """Fallback: reuse server/chain-submit.js via subprocess."""
        node_dir = self._find_node_script_dir()
        if not node_dir:
            return None

        skill = universal.skill or universal.agent
        skill_name = getattr(skill, "name", "unknown")
        description = getattr(skill, "description", "")
        version = getattr(skill, "version", "1.0.0")
        content = json.dumps(universal.model_dump(mode="json", exclude_none=True))

        # Write temp skill file
        tmp_dir = Path(os.getenv("TEMP", "/tmp")) / "skill-packager"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        tmp_file = tmp_dir / f"skill-{skill_name}.json"
        tmp_file.write_text(content, encoding="utf-8")

        env = os.environ.copy()
        env.update({
            "SKILL_PACKAGER_MODE": "1",
            "SKILL_NAME": skill_name,
            "SKILL_DESCRIPTION": description,
            "SKILL_VERSION": version,
            "SKILL_RISK": str(universal.freeskill.riskLevel.value if hasattr(universal.freeskill.riskLevel, "value") else universal.freeskill.riskLevel),
            "SKILL_CREATOR": creator or universal.freeskill.creator or "",
            "SKILL_TEMP_FILE": str(tmp_file),
        })

        try:
            proc = subprocess.run(
                [sys.executable, str(node_dir / "chain-submit.js")],
                cwd=str(node_dir),
                capture_output=True,
                text=True,
                timeout=self.config.timeout,
                env=env,
            )
            # chain-submit.js prints JSON result to stdout
            stdout = proc.stdout.strip()
            if stdout.startswith("{"):
                data = json.loads(stdout)
                return self._build_result_from_http(data, universal)
            return OnChainResult(
                receipt=OnChainReceipt(status="failed"),
                success=False,
                message=f"Node subprocess failed: {proc.stderr[:500]}",
            )
        except subprocess.TimeoutExpired:
            return OnChainResult(
                receipt=OnChainReceipt(status="failed"),
                success=False,
                message=f"Node subprocess timeout after {self.config.timeout}s",
            )
        except Exception as e:
            return OnChainResult(
                receipt=OnChainReceipt(status="failed"),
                success=False,
                message=f"Node subprocess error: {e}",
            )

    def verify_skill(self, skill_id: int) -> Dict[str, Any]:
        """Verify skill on-chain (read)."""
        # Try HTTP backend first
        try:
            resp = requests.get(f"{self.config.backendUrl}/api/chain/skills/{skill_id}", timeout=30)
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass

        # Fallback: query via chainmaker-client subprocess
        node_dir = self._find_node_script_dir()
        if not node_dir:
            return {"error": "No backend available for verification"}

        try:
            proc = subprocess.run(
                [sys.executable, "-c", f"""
import sys
sys.path.insert(0, '{node_dir}')
from chain_read import getSkillById
import asyncio
result = asyncio.run(getSkillById({skill_id}))
print(json.dumps(result, default=str))
"""],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if proc.stdout.strip():
                return json.loads(proc.stdout)
        except Exception as e:
            return {"error": str(e)}
        return {"error": "Verification failed"}
