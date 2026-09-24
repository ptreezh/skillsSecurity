#!/usr/bin/env python3
"""
技能注册脚本
将技能注册到 AgentSkills 后端
"""

import sys
import os
import json
import hashlib
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None


def _import_packager():
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "tools"))
    from packager import pack_skill
    return pack_skill


def compute_sha256(file_path):
    """计算文件 SHA256"""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def register_skill(skill_path, backend_url="http://localhost:10001", api_key=None):
    """
    注册技能到后端

    Args:
        skill_path: 技能目录或 zip 文件路径
        backend_url: 后端 API 地址
        api_key: API 密钥（可选）

    Returns:
        dict: 注册结果
    """
    if requests is None:
        return {
            "error": "requests library not installed. Install with: pip install requests",
            "skill_id": None,
            "tx_hash": None,
            "status": "error",
        }

    skill_path = Path(skill_path)
    if not skill_path.exists():
        return {"error": f"Path not found: {skill_path}", "status": "error"}

    # 如果是目录，先打包
    zip_path = None
    if skill_path.is_dir():
        try:
            pack_skill = _import_packager()
            zip_path, _ = pack_skill(skill_path)
        except Exception as e:
            return {"error": f"Packaging failed: {e}", "status": "error"}
    else:
        zip_path = skill_path

    # 计算哈希
    sha256 = compute_sha256(zip_path)

    # 调用后端 API
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "skill_name": skill_path.stem if skill_path.is_file() else skill_path.name,
        "file_path": str(zip_path),
        "sha256": sha256,
    }

    try:
        resp = requests.post(
            f"{backend_url}/api/skills/register",
            headers=headers,
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "skill_id": data.get("skill_id"),
            "tx_hash": data.get("tx_hash"),
            "status": data.get("status", "registered"),
            "message": data.get("message", "Registered successfully"),
            "sha256": sha256,
        }
    except requests.exceptions.ConnectionError:
        return {
            "error": f"Cannot connect to backend at {backend_url}",
            "status": "error",
            "skill_id": None,
            "tx_hash": None,
        }
    except requests.exceptions.Timeout:
        return {"error": "Request timeout", "status": "error", "skill_id": None, "tx_hash": None}
    except Exception as e:
        return {"error": str(e), "status": "error", "skill_id": None, "tx_hash": None}
    finally:
        # 清理临时 zip
        if zip_path and zip_path.suffix == ".zip" and skill_path.is_dir():
            try:
                zip_path.unlink()
            except Exception:
                pass


def main():
    if len(sys.argv) < 2:
        print("Usage: python register_runner.py <skill-path> [backend-url] [api-key]")
        sys.exit(1)

    skill_path = sys.argv[1]
    backend_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:10001"
    api_key = sys.argv[3] if len(sys.argv) > 3 else None

    result = register_skill(skill_path, backend_url, api_key)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    sys.exit(0 if result.get("status") == "registered" else 1)


if __name__ == "__main__":
    main()
