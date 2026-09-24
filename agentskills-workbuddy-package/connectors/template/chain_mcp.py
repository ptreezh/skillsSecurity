#!/usr/bin/env python3
"""
Chain MCP Connector
封装与区块链的交互（ChainMaker 私有链）
"""

import sys
import os
import json
from typing import Optional

try:
    import requests
except ImportError:
    requests = None


class ChainMCP:
    """链上 MCP 连接器"""

    def __init__(self):
        self.chain_url = os.getenv("CHAINMAKER_URL", "http://localhost:1234")
        self.gateway_url = os.getenv("CHAINMAKER_GATEWAY", "http://localhost:8080")
        self.registry_address = os.getenv("SKILL_REGISTRY_ADDRESS")

    def query_skill(self, skill_id: str) -> dict:
        """查询链上技能信息"""
        if not requests:
            return {"status": "error", "message": "requests not installed"}

        try:
            resp = requests.get(
                f"{self.gateway_url}/api/query",
                params={"address": self.registry_address, "method": "getSkill", "params": [skill_id]},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def verify_fingerprint(self, skill_id: str, sha256: str) -> dict:
        """验证技能指纹"""
        if not requests:
            return {"status": "error", "message": "requests not installed"}

        try:
            resp = requests.post(
                f"{self.gateway_url}/api/invoke",
                json={
                    "address": self.registry_address,
                    "method": "verifyFingerprint",
                    "params": [skill_id, sha256],
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Chain MCP Connector CLI")
    parser.add_argument("action", choices=["query", "verify"])
    parser.add_argument("--skill-id", required=True, help="Skill ID")
    parser.add_argument("--sha256", help="SHA256 for verify action")
    args = parser.parse_args()

    client = ChainMCP()

    if args.action == "query":
        print(json.dumps(client.query_skill(args.skill_id), ensure_ascii=False, indent=2))
    elif args.action == "verify":
        if not args.sha256:
            print("Error: --sha256 required for verify action")
            sys.exit(1)
        print(json.dumps(client.verify_fingerprint(args.skill_id, args.sha256), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
