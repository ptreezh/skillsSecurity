#!/usr/bin/env python3
"""
示例脚本：简单的技能信息提取器
演示 WorkBuddy 技能脚本的标准结构
"""

import sys
import json
import re
from pathlib import Path


def extract_skill_info(skill_path):
    """从 SKILL.md 提取基本信息"""
    skill_file = Path(skill_path) / "SKILL.md"
    if not skill_file.exists():
        return {"error": "SKILL.md not found"}

    content = skill_file.read_text(encoding="utf-8")

    # 提取 frontmatter
    frontmatter = {}
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            fm_text = content[3:end]
            for line in fm_text.strip().split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    frontmatter[key.strip()] = value.strip()

    # 提取正文
    body_start = content.find("---", 3)
    body = content[body_start + 3 :].strip() if body_start != -1 else ""

    return {
        "name": frontmatter.get("name", ""),
        "display_name": frontmatter.get("display_name", ""),
        "description": frontmatter.get("description", ""),
        "version": frontmatter.get("version", ""),
        "author": frontmatter.get("author", ""),
        "body_length": len(body),
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python example.py <skill-directory>")
        sys.exit(1)

    skill_path = sys.argv[1]
    info = extract_skill_info(skill_path)
    print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
