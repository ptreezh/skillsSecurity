"""
测试 skill-publisher 脚本
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))
publisher_scripts_dir = os.path.join(os.path.dirname(__file__), "..", "skills", "skill-publisher", "scripts")
sys.path.insert(0, publisher_scripts_dir)

from publish_runner import publish_skill


def test_publish_template_skill():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    skill_dir = os.path.join(base_dir, "skills", "template")
    result = publish_skill(skill_dir)
    assert result["success"] is True, result
    assert "zip_path" in result
    assert "manifest" in result
    assert result["manifest"]["name"] == "template"
    print("✓ test_publish_template_skill")


if __name__ == "__main__":
    test_publish_template_skill()
    print("\n✓ All skill-publisher tests passed")
