"""
测试 skill-registry 脚本
"""

import sys
import os

registry_scripts_dir = os.path.join(os.path.dirname(__file__), "..", "skills", "skill-registry", "scripts")
sys.path.insert(0, registry_scripts_dir)

from register_runner import register_skill


def test_register_returns_error_when_backend_down():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    skill_dir = os.path.join(base_dir, "skills", "template")
    result = register_skill(skill_dir, backend_url="http://localhost:19999")
    assert result["status"] == "error"
    print("✓ test_register_returns_error_when_backend_down")


if __name__ == "__main__":
    test_register_returns_error_when_backend_down()
    print("\n✓ All skill-registry tests passed")
