"""
测试 packager.py 的功能
"""

import sys
import os
import zipfile

# 添加 tools 目录到路径
tools_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools")
sys.path.insert(0, tools_dir)

from packager import pack_skill


def test_pack_template_creates_zip():
    """测试打包模板技能生成有效 zip"""
    zip_path, manifest = pack_skill("skills/template")
    assert zip_path.exists(), f"Zip file not created: {zip_path}"

    # 验证 zip 内容
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()
        assert "SKILL.md" in names, f"SKILL.md not in zip: {names}"
        assert "manifest.yaml" in names, f"manifest.yaml not in zip: {names}"

    # 验证 manifest
    assert manifest["name"] == "template"
    assert manifest["version"] == "1.0.0"
    assert manifest["category"] == "开发工具"

    print("✓ test_pack_template_creates_zip")
    zip_path.unlink()  # 清理


def test_manifest_content():
    """测试 manifest.yaml 内容正确"""
    zip_path, manifest = pack_skill("skills/template")
    assert manifest["name"] == "template"
    assert manifest["version"] == "1.0.0"
    assert manifest["description"]
    assert manifest["author"] == "AgentSkills Team"
    print("✓ test_manifest_content")
    zip_path.unlink()


if __name__ == "__main__":
    test_pack_template_creates_zip()
    test_manifest_content()
    print("\n✓ All packager tests passed")
