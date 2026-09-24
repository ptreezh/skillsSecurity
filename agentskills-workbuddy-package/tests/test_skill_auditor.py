"""
测试 skill-auditor 脚本
"""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "skills", "skill-auditor", "scripts"))

from audit_runner import audit_skill


def _write_tmp_skill(content: str) -> str:
    import tempfile
    from pathlib import Path

    tmpdir = tempfile.mkdtemp()
    Path(tmpdir, "SKILL.md").write_text(content, encoding="utf-8")
    return tmpdir


def test_audit_approved_skill():
    skill_dir = _write_tmp_skill(
        """---
name: good-skill
display_name: Good Skill
description: A good skill for testing the audit workflow end to end.
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---
# Good Skill
Body.
"""
    )
    result = audit_skill(skill_dir)
    assert result["recommendation"] == "approved", result
    assert result["passed"] is True
    print("✓ test_audit_approved_skill")


def test_audit_rejects_missing_frontmatter():
    skill_dir = _write_tmp_skill(
        """# No frontmatter
Body.
"""
    )
    result = audit_skill(skill_dir)
    assert result["recommendation"] == "rejected", result
    print("✓ test_audit_rejects_missing_frontmatter")


def test_audit_needs_review_for_long_description():
    skill_dir = _write_tmp_skill(
        """---
name: long-desc-skill
display_name: Long Desc
description: """ + "x" * 150 + """
category: 开发工具
version: 1.0.0
author: Test
---
# Body
"""
    )
    result = audit_skill(skill_dir)
    assert result["recommendation"] in ("needs_review", "rejected"), result
    print("✓ test_audit_needs_review_for_long_description")


if __name__ == "__main__":
    test_audit_approved_skill()
    test_audit_rejects_missing_frontmatter()
    test_audit_needs_review_for_long_description()
    print("\n✓ All skill-auditor tests passed")
