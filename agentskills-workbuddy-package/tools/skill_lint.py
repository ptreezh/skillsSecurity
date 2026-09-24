#!/usr/bin/env python3
"""
SKILL.md 规范检查器
验证 WorkBuddy 技能包的 frontmatter、YAML 语法和目录结构
"""

import sys
import os
import re
from pathlib import Path

REQUIRED_FRONTMATTER_FIELDS = [
    "name",
    "display_name",
    "description",
    "category",
    "version",
    "author",
]

OPTIONAL_FRONTMATTER_FIELDS = [
    "display_name_en",
    "description_zh",
    "description_en",
    "version",
    "author",
]

ALLOWED_CATEGORIES = [
    "开发工具",
    "区块链",
    "数据分析",
    "办公效率",
    "代码生成",
    "文档处理",
    "图像处理",
    "音视频处理",
    "网络请求",
    "系统管理",
]


def check_frontmatter(content):
    """检查 frontmatter 是否完整且格式正确"""
    errors = []
    warnings = []

    if not content.startswith("---"):
        errors.append("Missing frontmatter start (---)")
        return errors, warnings

    # 找到 frontmatter 结束位置
    end_match = re.search(r"\n---\n", content[3:])
    if not end_match:
        errors.append("Missing frontmatter end (---)")
        return errors, warnings

    frontmatter_text = content[3 : end_match.start() + 3]

    # 解析 YAML（简单实现，不依赖 pyyaml）
    fields = {}
    for line in frontmatter_text.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        # 去除引号
        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
        elif value.startswith("'") and value.endswith("'"):
            value = value[1:-1]
        fields[key] = value

    # 检查必填字段
    for field in REQUIRED_FRONTMATTER_FIELDS:
        if field not in fields:
            errors.append(f"Missing required field: {field}")
        elif not fields[field]:
            errors.append(f"Empty required field: {field}")

    # 检查 category 是否合法
    if "category" in fields and fields["category"] not in ALLOWED_CATEGORIES:
        warnings.append(f"Category '{fields['category']}' not in standard list")

    # 检查 version 格式
    if "version" in fields:
        version = fields["version"]
        if not re.match(r"^\d+\.\d+\.\d+$", version):
            warnings.append(f"Version '{version}' doesn't follow semver (x.y.z)")

    # 检查 description 长度
    if "description" in fields:
        desc_len = len(fields["description"])
        if desc_len > 100:
            warnings.append(f"Description too long ({desc_len} chars, recommended < 100)")
        elif desc_len < 10:
            warnings.append(f"Description too short ({desc_len} chars, recommended >= 10)")

    return errors, warnings


def check_yaml_syntax(content):
    """检查 YAML 语法常见问题"""
    errors = []
    warnings = []

    # 检查 frontmatter 部分
    if not content.startswith("---"):
        errors.append("Missing frontmatter delimiter (---)")
        return errors, warnings

    # 提取 frontmatter
    end_match = re.search(r"\n---\n", content[3:])
    if not end_match:
        errors.append("Missing frontmatter end delimiter (---)")
        return errors, warnings

    frontmatter = content[3 : end_match.start() + 3]

    # 检查冒号后是否有空格
    for line_no, line in enumerate(frontmatter.split("\n"), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line and not line.startswith(" "):
            key, _, value = line.partition(":")
            if key and value and not value.startswith(" "):
                warnings.append(f"Line {line_no}: Missing space after colon in '{line}'")

    # 检查是否使用了中文全角冒号
    if "：" in frontmatter:
        errors.append("Found full-width colon (：) in frontmatter, use half-width colon (:) instead")

    # 检查是否使用了中文全角引号
    if '"' in frontmatter or '"' in frontmatter or '"' in frontmatter:
        warnings.append("Found full-width quotes in frontmatter, use half-width quotes (\") instead")

    return errors, warnings


def check_scripts(scripts_dir):
    """检查 scripts/ 目录下的脚本"""
    errors = []
    warnings = []

    if not scripts_dir.exists():
        return errors, warnings

    scripts = list(scripts_dir.glob("*.py")) + list(scripts_dir.glob("*.js"))
    if not scripts:
        warnings.append("No scripts found in scripts/ directory")
        return errors, warnings

    for script in scripts:
        # 检查文件大小
        size = script.stat().st_size
        if size == 0:
            warnings.append(f"Script {script.name} is empty")
        elif size > 1024 * 1024:
            warnings.append(f"Script {script.name} is too large ({size} bytes)")

        # 检查是否有 shebang
        try:
            first_line = script.read_text(encoding="utf-8").split("\n")[0].strip()
            if not first_line.startswith("#!"):
                warnings.append(f"Script {script.name} missing shebang")
        except Exception as e:
            warnings.append(f"Script {script.name} read error: {e}")

    return errors, warnings


def check_references(references_dir):
    """检查 references/ 目录"""
    errors = []
    warnings = []

    if not references_dir.exists():
        warnings.append("No references/ directory found")
        return errors, warnings

    refs = list(references_dir.glob("*.md"))
    if not refs:
        warnings.append("No reference documents found in references/ directory")

    return errors, warnings


def check_templates(templates_dir):
    """检查 templates/ 目录"""
    errors = []
    warnings = []

    if not templates_dir.exists():
        warnings.append("No templates/ directory found")
        return errors, warnings

    templates = list(templates_dir.glob("*"))
    if not templates:
        warnings.append("No template files found in templates/ directory")

    return errors, warnings


def lint_skill(skill_dir):
    """对单个技能进行完整检查"""
    skill_path = Path(skill_dir)
    if not skill_path.exists():
        return {"error": f"Directory not found: {skill_dir}"}

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return {"error": "SKILL.md not found"}

    content = skill_md.read_text(encoding="utf-8")

    all_errors = []
    all_warnings = []

    # 检查 frontmatter
    errors, warnings = check_frontmatter(content)
    all_errors.extend(errors)
    all_warnings.extend(warnings)

    # 检查 YAML 语法
    errors, warnings = check_yaml_syntax(content)
    all_errors.extend(errors)
    all_warnings.extend(warnings)

    # 检查 scripts/
    errors, warnings = check_scripts(skill_path / "scripts")
    all_errors.extend(errors)
    all_warnings.extend(warnings)

    # 检查 references/
    errors, warnings = check_references(skill_path / "references")
    all_errors.extend(errors)
    all_warnings.extend(warnings)

    # 检查 templates/
    errors, warnings = check_templates(skill_path / "templates")
    all_errors.extend(errors)
    all_warnings.extend(warnings)

    passed = len(all_errors) == 0

    return {
        "passed": passed,
        "errors": all_errors,
        "warnings": all_warnings,
        "skill": skill_path.name,
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python skill-lint.py <skill-directory>")
        sys.exit(1)

    skill_dir = sys.argv[1]
    result = lint_skill(skill_dir)

    if "error" in result:
        print(f"ERROR: {result['error']}")
        sys.exit(1)

    status = "PASS" if result["passed"] else "FAIL"
    print(f"[{status}] {result['skill']}")

    if result["errors"]:
        print("\nErrors:")
        for error in result["errors"]:
            print(f"  ✗ {error}")

    if result["warnings"]:
        print("\nWarnings:")
        for warning in result["warnings"]:
            print(f"  ⚠️ {warning}")

    if not result["errors"] and not result["warnings"]:
        print("  ✓ All checks passed")

    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
