#!/usr/bin/env python3
"""
Backend MCP Connector
封装与 AgentSkills 后端的交互
"""

import sys
import os
import json
from typing import Optional

try:
    import requests
except ImportError:
    requests = None


class BackendMCP:
    """后端 MCP 连接器"""

    def __init__(self, base_url: str = "http://localhost:10001", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self._session = requests.Session() if requests else None

    def _headers(self) -> dict:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def health(self) -> dict:
        """健康检查"""
        if not self._session:
            return {"status": "error", "message": "requests not installed"}
        try:
            resp = self._session.get(f"{self.base_url}/health", timeout=5)
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def register_skill(self, skill_path: str) -> dict:
        """注册技能"""
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))
        try:
            from packager import pack_skill
            zip_path, manifest = pack_skill(skill_path)
        except Exception as e:
            return {"status": "error", "message": f"Packaging failed: {e}"}

        try:
            with open(zip_path, "rb") as f:
                files = {"file": (zip_path.name, f, "application/zip")}
                data = {"manifest": json.dumps(manifest)}
                headers = {}
                if self.api_key:
                    headers["Authorization"] = f"Bearer {self.api_key}"
                resp = self._session.post(
                    f"{self.base_url}/api/skills/register",
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=30,
                )
                resp.raise_for_status()
                result = resp.json()
                result["zip_path"] = str(zip_path)
                return result
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            if zip_path.exists():
                zip_path.unlink()

    def get_skills(self, limit: int = 100, offset: int = 0) -> dict:
        """获取技能列表"""
        if not self._session:
            return {"status": "error", "message": "requests not installed"}
        try:
            resp = self._session.get(
                f"{self.base_url}/api/skills",
                params={"limit": limit, "offset": offset},
                headers=self._headers(),
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_reputation(self, address: Optional[str] = None) -> dict:
        """获取声誉数据"""
        if not self._session:
            return {"status": "error", "message": "requests not installed"}
        try:
            params = {}
            if address:
                params["address"] = address
            resp = self._session.get(
                f"{self.base_url}/api/reputation",
                params=params,
                headers=self._headers(),
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_stats(self) -> dict:
        """获取统计数据"""
        if not self._session:
            return {"status": "error", "message": "requests not installed"}
        try:
            resp = self._session.get(
                f"{self.base_url}/api/stats",
                headers=self._headers(),
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Backend MCP Connector CLI")
    parser.add_argument("action", choices=["health", "register", "skills", "reputation", "stats"])
    parser.add_argument("--path", help="Skill path for register action")
    parser.add_argument("--url", default="http://localhost:10001", help="Backend URL")
    parser.add_argument("--api-key", help="API key")
    args = parser.parse_args()

    client = BackendMCP(args.url, args.api_key)

    if args.action == "health":
        print(json.dumps(client.health(), ensure_ascii=False, indent=2))
    elif args.action == "register":
        if not args.path:
            print("Error: --path required for register action")
            sys.exit(1)
        print(json.dumps(client.register_skill(args.path), ensure_ascii=False, indent=2))
    elif args.action == "skills":
        print(json.dumps(client.get_skills(), ensure_ascii=False, indent=2))
    elif args.action == "reputation":
        print(json.dumps(client.get_reputation(), ensure_ascii=False, indent=2))
    elif args.action == "stats":
        print(json.dumps(client.get_stats(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
