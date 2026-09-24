#!/usr/bin/env python3
"""
技能审计脚本
复用现有 audit-agent.js 的 runAudit 逻辑，输出结构化 JSON 报告
"""

import sys
import os
import json
import re
from pathlib import Path

# 确保能导入 tools 下的 skill_lint
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "tools"))

try:
    from skill_lint import lint_skill
except Exception:
    def lint_skill(path):
        return {"passed": True, "errors": [], "warnings": []}


def audit_skill(skill_path_or_content, skill_name=None, locale="zh-CN"):
    """
    审计技能文件

    Args:
        skill_path_or_content: 技能文件路径或 SKILL.md 内容
        skill_name: 技能名称（可选）
        locale: 语言（默认 zh-CN）

    Returns:
        dict: 审计报告
    """
    # 确定输入是路径还是内容
    if os.path.exists(skill_path_or_content):
        skill_path = Path(skill_path_or_content)
        skill_file = skill_path / "SKILL.md"
        if not skill_file.exists():
            return {
                "passed": False,
                "skill_name": skill_name or Path(skill_path_or_content).name,
                "counts": {"critical": 1, "high": 0, "medium": 0, "low": 0},
                "tier1": {"errors": ["SKILL.md not found"], "warnings": []},
                "tier2": {"errors": [], "warnings": []},
                "tier3": {"errors": [], "warnings": []},
                "tier4": {"errors": [], "warnings": []},
                "recommendation": "rejected",
                "message": "SKILL.md 文件不存在",
            }
        skill_content = skill_file.read_text(encoding="utf-8")
        skill_name = skill_name or skill_path.name
    else:
        skill_content = skill_path_or_content
        skill_name = skill_name or "unknown"

    # 使用 skill-lint 进行基础检查
    lint_result = lint_skill_from_content(skill_content)

    # 计算 tier1-4 的 counts
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    # Tier 1: 结构完整性
    tier1_errors = []
    tier1_warnings = []
    if not skill_content.startswith("---"):
        tier1_errors.append("Missing frontmatter")
        counts["critical"] += 1
    if "name:" not in skill_content:
        tier1_errors.append("Missing name field")
        counts["critical"] += 1
    if "description:" not in skill_content:
        tier1_errors.append("Missing description field")
        counts["high"] += 1

    # Tier 2: 语法正确性
    tier2_errors = []
    tier2_warnings = []
    if "：" in skill_content:
        tier2_warnings.append("Found full-width colon")
        counts["medium"] += 1
    if re.search(r"[\u201c\u201d]", skill_content):
        tier2_warnings.append("Found full-width quotes")
        counts["medium"] += 1

    # Tier 3: 内容质量
    tier3_errors = []
    tier3_warnings = []
    desc_match = re.search(r"description:\s*(.+)", skill_content)
    if desc_match:
        desc = desc_match.group(1).strip().strip('"').strip("'")
        if len(desc) < 10:
            tier3_warnings.append(f"Description too short ({len(desc)} chars)")
            counts["low"] += 1
        elif len(desc) > 100:
            tier3_warnings.append(f"Description too long ({len(desc)} chars)")
            counts["low"] += 1

    # Tier 4: 安全与治理
    tier4_errors = []
    tier4_warnings = []
    # 检查是否有危险脚本模式
    dangerous_patterns = [
        r"rm\s+-rf",
        r"del\s+/f",
        r"format\s+[a-zA-Z]:",
        r"DROP\s+TABLE",
        r"DELETE\s+FROM",
    ]
    for pattern in dangerous_patterns:
        if re.search(pattern, skill_content, re.IGNORECASE):
            tier4_errors.append(f"Dangerous pattern found: {pattern}")
            counts["critical"] += 1

    # 检查是否有硬编码的 API key
    api_key_patterns = [
        r"[a-zA-Z0-9_-]{20,}",
        r"sk-[a-zA-Z0-9]{20,}",
        r"api_key\s*[:=]",
    ]
    for pattern in api_key_patterns:
        if re.search(pattern, skill_content):
            tier4_warnings.append(f"Possible hardcoded credential: {pattern}")
            counts["high"] += 1

    # 判定结果
    passed = counts["critical"] == 0 and len(tier1_errors) == 0
    if counts["critical"] > 0:
        recommendation = "rejected"
        message = "发现严重安全问题"
    elif len(tier1_errors) > 0:
        recommendation = "rejected"
        message = "结构不完整"
    elif counts["high"] > 0 or len(tier4_errors) > 0:
        recommendation = "needs_review"
        message = "存在高风险问题，需要人工审核"
    elif counts["medium"] > 0 or len(tier2_warnings) > 0 or len(tier3_warnings) > 0:
        recommendation = "needs_review"
        message = "存在中等风险问题，建议优化"
    else:
        recommendation = "approved"
        message = "审计通过"

    return {
        "passed": passed,
        "skill_name": skill_name,
        "counts": counts,
        "tier1": {"errors": tier1_errors, "warnings": tier1_warnings},
        "tier2": {"errors": tier2_errors, "warnings": tier2_warnings},
        "tier3": {"errors": tier3_errors, "warnings": tier3_warnings},
        "tier4": {"errors": tier4_errors, "warnings": tier4_warnings},
        "recommendation": recommendation,
        "message": message,
    }


def lint_skill_from_content(content):
    """从内容进行 lint 检查（简化版）"""
    errors = []
    warnings = []

    if not content.startswith("---"):
        errors.append("Missing frontmatter")
    if "name:" not in content:
        errors.append("Missing name field")
    if "description:" not in content:
        warnings.append("Missing description field")

    return {"errors": errors, "warnings": warnings}


def main():
    if len(sys.argv) < 2:
        print("Usage: python audit_runner.py <skill-file-or-directory> [skill-name]")
        sys.exit(1)

    input_path = sys.argv[1]
    skill_name = sys.argv[2] if len(sys.argv) > 2 else None

    result = audit_skill(input_path, skill_name)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # 返回退出码
    if result["recommendation"] == "approved":
        sys.exit(0)
    elif result["recommendation"] == "needs_review":
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()
