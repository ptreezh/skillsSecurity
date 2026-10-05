#!/usr/bin/env python3
"""
技能发布脚本
将技能目录打包并生成发布清单
"""

import sys
import os
import json
import hashlib
from pathlib import Path

# 优先使用随包分发的 tools/（scripts/tools/），回退到仓库内 tools/
_LOCAL_TOOLS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools")
_REPO_TOOLS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "tools")
for _tools_dir in (_LOCAL_TOOLS, _REPO_TOOLS):
    if os.path.isdir(_tools_dir):
        sys.path.insert(0, _tools_dir)

# 不再静默降级：打包能力缺失必须让发布流程失败，而不是伪装成功
from packager import pack_skill


def generate_manifest(skill_dir):
    """生成发布清单"""
    skill_path = Path(skill_dir)
    manifest_path = skill_path / "manifest.yaml"

    if not manifest_path.exists():
        return {"error": "manifest.yaml not found. Run packager.py first."}

    manifest_content = manifest_path.read_text(encoding="utf-8")
    return {"manifest": manifest_content}


def publish_skill(skill_dir, output_dir=None):
    """
    发布技能

    Args:
        skill_dir: 技能目录路径
        output_dir: 输出目录（可选）

    Returns:
        dict: 发布结果
    """
    skill_path = Path(skill_dir)
    if not skill_path.exists():
        return {"error": f"Skill directory not found: {skill_dir}"}

    # 打包
    try:
        zip_path, manifest = pack_skill(skill_dir, output_dir)
    except Exception as e:
        return {"error": f"Packaging failed: {e}"}

    # 生成校验和
    zip_hash = hashlib.sha256(zip_path.read_bytes()).hexdigest()

    # 生成发布清单
    manifest_content = manifest.copy()
    manifest_content["sha256"] = zip_hash
    manifest_content["zip_path"] = str(zip_path)
    manifest_content["zip_size"] = zip_path.stat().st_size

    return {
        "success": True,
        "zip_path": str(zip_path),
        "manifest": manifest_content,
        "message": f"Skill packaged successfully: {zip_path.name}",
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python publish_runner.py <skill-directory> [output-dir]")
        sys.exit(1)

    skill_dir = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    result = publish_skill(skill_dir, output_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
