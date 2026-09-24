"""
本地端到端验证测试
覆盖 13 个核心场景
"""

import sys
import os
import json
import zipfile
import tempfile
from pathlib import Path

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir / "tools"))
sys.path.insert(0, str(base_dir / "skills" / "skill-auditor" / "scripts"))
sys.path.insert(0, str(base_dir / "skills" / "skill-publisher" / "scripts"))
sys.path.insert(0, str(base_dir / "skills" / "skill-registry" / "scripts"))
sys.path.insert(0, str(base_dir / "connectors" / "template"))

from skill_lint import lint_skill
from audit_runner import audit_skill
from publish_runner import publish_skill
from register_runner import register_skill
from backend_mcp import BackendMCP


def _write_tmp_skill(content: str) -> str:
    tmpdir = tempfile.mkdtemp()
    Path(tmpdir, "SKILL.md").write_text(content, encoding="utf-8")
    return tmpdir


def test_01_lint_template_passes():
    result = lint_skill(base_dir / "skills" / "template")
    assert result["passed"] is True
    print("✓ test_01_lint_template_passes")


def test_02_audit_approved_skill():
    skill_dir = _write_tmp_skill(
        """---
name: e2e-good
display_name: E2E Good
description: A good skill for e2e testing purposes only.
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---
# E2E Good
Body.
"""
    )
    result = audit_skill(skill_dir)
    assert result["recommendation"] == "approved"
    print("✓ test_02_audit_approved_skill")


def test_03_audit_rejects_bad_skill():
    skill_dir = _write_tmp_skill(
        """# No frontmatter
Body.
"""
    )
    result = audit_skill(skill_dir)
    assert result["recommendation"] == "rejected"
    print("✓ test_03_audit_rejects_bad_skill")


def test_04_packager_creates_valid_zip():
    result = publish_skill(str(base_dir / "skills" / "template"))
    assert result["success"] is True
    zip_path = Path(result["zip_path"])
    assert zip_path.exists()
    with zipfile.ZipFile(zip_path, "r") as zf:
        assert "SKILL.md" in zf.namelist()
        assert "manifest.yaml" in zf.namelist()
    print("✓ test_04_packager_creates_valid_zip")


def test_05_backend_health_check():
    client = BackendMCP("http://localhost:19999")
    result = client.health()
    assert result["status"] == "error"
    print("✓ test_05_backend_health_check")


def test_06_register_errors_on_down_backend():
    result = register_skill(str(base_dir / "skills" / "template"), backend_url="http://localhost:19999")
    assert result["status"] == "error"
    print("✓ test_06_register_errors_on_down_backend")


def test_07_chain_connector_importable():
    from chain_mcp import ChainMCP
    client = ChainMCP()
    assert client is not None
    print("✓ test_07_chain_connector_importable")


def test_08_template_skill_has_all_dirs():
    skill_dir = base_dir / "skills" / "template"
    assert (skill_dir / "SKILL.md").exists()
    assert (skill_dir / "references").exists()
    assert (skill_dir / "scripts").exists()
    assert (skill_dir / "templates").exists()
    print("✓ test_08_template_skill_has_all_dirs")


def test_09_plugin_json_valid():
    plugin = json.loads((base_dir / ".codebuddy-plugin" / "plugin.json").read_text(encoding="utf-8"))
    assert plugin["name"] == "AgentSkills Team"
    assert len(plugin["members"]) == 7
    print("✓ test_09_plugin_json_valid")


def test_10_agents_exist():
    agents_dir = base_dir / "agents"
    expected = ["agentskills-team-lead.md", "skill-auditor.md", "skill-publisher.md",
                "skill-registry.md", "reputation-analyst.md", "skill-browser.md",
                "fingerprint-verifier.md", "risk-classifier.md"]
    for name in expected:
        assert (agents_dir / name).exists(), f"Missing agent: {name}"
    print("✓ test_10_agents_exist")


def test_11_all_tests_pass():
    """汇总测试：运行所有单元测试"""
    import subprocess
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(base_dir / "tests"), "-v"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"Tests failed: {result.stdout}\n{result.stderr}"
    print("✓ test_11_all_tests_pass")


def test_12_zip_contents_complete():
    result = publish_skill(str(base_dir / "skills" / "template"))
    zip_path = Path(result["zip_path"])
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()
        assert "SKILL.md" in names
        assert "manifest.yaml" in names
        assert any("references/" in n for n in names)
        assert any("scripts/" in n for n in names)
        assert any("templates/" in n for n in names)
    print("✓ test_12_zip_contents_complete")


def test_13_manifest_fields_correct():
    result = publish_skill(str(base_dir / "skills" / "template"))
    manifest = result["manifest"]
    assert manifest["name"] == "template"
    assert manifest["version"] == "1.0.0"
    assert manifest["category"] == "开发工具"
    assert manifest["author"] == "AgentSkills Team"
    print("✓ test_13_manifest_fields_correct")


if __name__ == "__main__":
    tests = [
        test_01_lint_template_passes,
        test_02_audit_approved_skill,
        test_03_audit_rejects_bad_skill,
        test_04_packager_creates_valid_zip,
        test_05_backend_health_check,
        test_06_register_errors_on_down_backend,
        test_07_chain_connector_importable,
        test_08_template_skill_has_all_dirs,
        test_09_plugin_json_valid,
        test_10_agents_exist,
        test_11_all_tests_pass,
        test_12_zip_contents_complete,
        test_13_manifest_fields_correct,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__}: {e}")
            failed += 1

    print(f"\n{'='*50}")
    print(f"E2E Results: {passed} passed, {failed} failed")
    print(f"{'='*50}")

    sys.exit(0 if failed == 0 else 1)
