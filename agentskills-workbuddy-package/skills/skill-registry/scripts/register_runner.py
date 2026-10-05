#!/usr/bin/env python3
"""
技能注册脚本（AgentSkills 后端）

两个阶段：

1) prepare（离线）——打包并计算 SHA256 指纹，不触碰网络。
2) register（需后端）——以 multipart/form-data 上传至审计队列。

后端地址与访问令牌不再硬编码，必须由调用方提供：

  后端地址   命令行 ``--url``，或环境变量 ``AGENTSKILLS_API_URL``
  访问令牌   命令行 ``--token``，或环境变量 ``AGENTSKILLS_API_TOKEN``

未提供后端地址时，脚本自动降级为离线 prepare 模式，并明确说明原因。
``/api/upload`` 与 ``/api/chain`` 均要求 Bearer 令牌，且链上存证是
独立于上传审计的第二个步骤，本脚本不会隐式代替用户完成它。
"""

import hashlib
import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

ENV_URL = "AGENTSKILLS_API_URL"
ENV_TOKEN = "AGENTSKILLS_API_TOKEN"
REQUEST_TIMEOUT = 30
UPLOAD_FIELD = "file"


def _import_packager():
    """导入仓库内的打包工具，随包分发时不依赖全局安装。"""
    # 优先使用随包分发的 tools/（scripts/tools/），回退到仓库内 tools/
    here = os.path.dirname(os.path.abspath(__file__))
    for tools_dir in (
        os.path.join(here, "tools"),
        os.path.join(here, "..", "..", "..", "tools"),
    ):
        if os.path.isdir(tools_dir) and tools_dir not in sys.path:
            sys.path.insert(0, tools_dir)
    from packager import pack_skill

    return pack_skill


def compute_sha256(file_path):
    """计算文件 SHA256。"""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _package(skill_path):
    """把技能目录打包为 zip；已是文件则原样返回。返回 (路径, 是否临时文件)。"""
    if not skill_path.is_dir():
        return skill_path, False
    pack_skill = _import_packager()
    zip_path, _ = pack_skill(skill_path)
    return Path(zip_path), True


def _cleanup(path):
    """删除临时 zip；失败只告警，不影响主流程。"""
    try:
        path.unlink()
    except OSError as exc:
        print(f"warning: 无法清理临时文件 {path}: {exc}", file=sys.stderr)


def prepare_skill(skill_path):
    """离线准备技能：打包 + 计算指纹。不需要后端。"""
    skill_path = Path(skill_path)
    if not skill_path.exists():
        return {"status": "error", "error": f"Path not found: {skill_path}"}

    try:
        archive, is_temp = _package(skill_path)
    except Exception as exc:
        return {"status": "error", "error": f"Packaging failed: {exc}"}

    try:
        sha256 = compute_sha256(archive)
        size_bytes = archive.stat().st_size
    except OSError as exc:
        return {"status": "error", "error": f"Cannot read package: {exc}"}
    finally:
        if is_temp:
            _cleanup(archive)

    return {
        "status": "prepared",
        "skill_name": skill_path.name,
        "sha256": sha256,
        "size_bytes": size_bytes,
        "registered": False,
        "next_step": f"设置 ${ENV_URL} 与 ${ENV_TOKEN} 后重跑，以提交至审计队列",
    }


def register_skill(skill_path, backend_url=None, api_key=None):
    """
    上传技能至后端审计队列。

    Args:
        skill_path: 技能目录或 zip 文件路径
        backend_url: 后端地址；为空时返回错误并提示配置方式
        api_key: Bearer 令牌；``/api/upload`` 强制要求

    Returns:
        dict: 结构化结果，``status`` 为 uploaded / prepared / error
    """
    if not backend_url:
        return {
            "status": "error",
            "error": f"未提供后端地址：请传入 --url 或设置环境变量 ${ENV_URL}",
        }
    if not api_key:
        return {
            "status": "error",
            "error": f"未提供访问令牌：/api/upload 需要 Bearer 令牌，请设置 ${ENV_TOKEN}",
        }
    if requests is None:
        return {
            "status": "error",
            "error": "requests library not installed. Install with: pip install requests",
        }

    skill_path = Path(skill_path)
    if not skill_path.exists():
        return {"status": "error", "error": f"Path not found: {skill_path}"}

    try:
        archive, is_temp = _package(skill_path)
    except Exception as exc:
        return {"status": "error", "error": f"Packaging failed: {exc}"}

    base_url = backend_url.rstrip("/")
    try:
        sha256 = compute_sha256(archive)
        with archive.open("rb") as handle:
            resp = requests.post(
                f"{base_url}/api/upload",
                headers={"Authorization": f"Bearer {api_key}"},
                files={UPLOAD_FIELD: (archive.name, handle, "application/zip")},
                timeout=REQUEST_TIMEOUT,
            )
    except requests.exceptions.ConnectionError:
        return {"status": "error", "error": f"Cannot connect to backend at {base_url}"}
    except requests.exceptions.Timeout:
        return {"status": "error", "error": f"Request timeout after {REQUEST_TIMEOUT}s"}
    except requests.exceptions.RequestException as exc:
        return {"status": "error", "error": f"Request failed: {exc}"}
    except OSError as exc:
        return {"status": "error", "error": f"Cannot read package: {exc}"}
    finally:
        if is_temp:
            _cleanup(archive)

    if resp.status_code >= 400:
        return {
            "status": "error",
            "http_status": resp.status_code,
            "error": resp.text[:500],
        }

    try:
        data = resp.json()
    except ValueError as exc:
        return {"status": "error", "error": f"响应不是合法 JSON: {exc}"}

    job_id = data.get("jobId") or data.get("job_id")
    return {
        "status": "uploaded",
        "skill_name": skill_path.name,
        "sha256": sha256,
        "job_id": job_id,
        "status_endpoint": f"{base_url}/api/status/{job_id}",
        "note": "审计通过后仍需单独调用 POST /api/chain 完成链上存证；本脚本不代为执行",
    }


def _flag_value(args, name):
    """读取 ``--name value`` 形式的参数值。"""
    if name in args:
        index = args.index(name)
        if index + 1 < len(args):
            return args[index + 1]
    return None


USAGE = f"""用法: python register_runner.py <skill-path> [--url URL] [--token TOKEN]

  --url    后端地址（默认取环境变量 ${ENV_URL}）
  --token  访问令牌（默认取环境变量 ${ENV_TOKEN}）

未提供后端地址时自动降级为离线 prepare：仅打包并计算指纹，不触网。"""


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    if not args:
        print(USAGE)
        return 1

    skill_path = args[0]
    backend_url = _flag_value(args, "--url") or os.environ.get(ENV_URL)
    api_key = _flag_value(args, "--token") or os.environ.get(ENV_TOKEN)

    if backend_url:
        result = register_skill(skill_path, backend_url, api_key)
    else:
        result = prepare_skill(skill_path)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("status") in ("prepared", "uploaded") else 1


if __name__ == "__main__":
    sys.exit(main())
