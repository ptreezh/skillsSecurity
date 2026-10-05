"""
测试 skill-registry 脚本
"""

import os
import sys

registry_scripts_dir = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "skills", "skill-registry", "scripts"
)
package_root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, registry_scripts_dir)

from register_runner import ENV_TOKEN, ENV_URL, prepare_skill, register_skill


def _template_skill():
    return os.path.join(package_root, "skills", "template")


def test_prepare_skill_works_offline():
    result = prepare_skill(_template_skill())
    assert result["status"] == "prepared", result
    assert len(result["sha256"]) == 64, result
    assert result["size_bytes"] > 0, result
    assert result["registered"] is False, result
    print("✓ test_prepare_skill_works_offline")


def test_register_requires_backend_url():
    result = register_skill(_template_skill())
    assert result["status"] == "error", result
    assert ENV_URL in result["error"], result
    print("✓ test_register_requires_backend_url")


def test_register_requires_token():
    result = register_skill(_template_skill(), backend_url="http://localhost:19999")
    assert result["status"] == "error", result
    assert ENV_TOKEN in result["error"], result
    print("✓ test_register_requires_token")


def test_register_returns_error_when_backend_down():
    result = register_skill(_template_skill(), backend_url="http://localhost:19999", api_key="test-token")
    assert result["status"] == "error", result
    print("✓ test_register_returns_error_when_backend_down")


def test_register_rejects_missing_path():
    result = register_skill(os.path.join(package_root, "skills", "does-not-exist"), backend_url="http://x", api_key="t")
    assert result["status"] == "error", result
    assert "not found" in result["error"].lower(), result
    print("✓ test_register_rejects_missing_path")


TESTS = [
    test_prepare_skill_works_offline,
    test_register_requires_backend_url,
    test_register_requires_token,
    test_register_returns_error_when_backend_down,
    test_register_rejects_missing_path,
]


if __name__ == "__main__":
    for test in TESTS:
        test()
    print("\n✓ All skill-registry tests passed")
