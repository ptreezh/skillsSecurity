"""
测试 skill-lint.py 的功能
"""

import sys
import os

# 添加 tools 目录到路径
tools_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools")
sys.path.insert(0, tools_dir)

from skill_lint import lint_skill


def test_template_skill_passes():
    """测试模板技能通过检查"""
    result = lint_skill("skills/template")
    assert result["passed"] is True, f"Template skill should pass, got: {result}"
    assert len(result["errors"]) == 0, f"Should have no errors, got: {result['errors']}"
    print("✓ test_template_skill_passes")


def test_missing_skill_md_fails():
    """测试缺少 SKILL.md 的目录失败"""
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        result = lint_skill(tmpdir)
        assert "error" in result, f"Should have error, got: {result}"
        print("✓ test_missing_skill_md_fails")


def test_missing_required_field_fails():
    """测试缺少必填字段失败"""
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        skill_md = Path(tmpdir) / "SKILL.md"
        skill_md.write_text(
            """---
name: test-skill
description: Test
---
# Test Skill
""",
            encoding="utf-8",
        )
        result = lint_skill(tmpdir)
        assert result["passed"] is False, f"Should fail, got: {result}"
        print("✓ test_missing_required_field_fails")


def test_empty_description_warning():
    """测试空 description 产生警告"""
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        skill_md = Path(tmpdir) / "SKILL.md"
        skill_md.write_text(
            """---
name: test-skill
display_name: Test
description: ""
category: 开发工具
version: 1.0.0
author: Test
---
# Test Skill
""",
            encoding="utf-8",
        )
        result = lint_skill(tmpdir)
        assert result["passed"] is False, f"Should fail, got: {result}"
        print("✓ test_empty_description_warning")


def test_valid_skill_passes():
    """测试合法技能通过检查"""
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        skill_md = Path(tmpdir) / "SKILL.md"
        skill_md.write_text(
            """---
name: valid-skill
display_name: Valid Skill
description: A valid test skill
category: 开发工具
version: 1.0.0
author: Test Author
---
# Valid Skill
This is a valid skill.
""",
            encoding="utf-8",
        )
        result = lint_skill(tmpdir)
        assert result["passed"] is True, f"Should pass, got: {result}"
        print("✓ test_valid_skill_passes")


if __name__ == "__main__":
    test_template_skill_passes()
    test_missing_skill_md_fails()
    test_missing_required_field_fails()
    test_empty_description_warning()
    test_valid_skill_passes()
    print("\n✓ All skill-lint tests passed")
