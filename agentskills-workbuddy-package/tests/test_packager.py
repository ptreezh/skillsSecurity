"""
测试 packager.py 的功能
"""

import sys
import os
import shutil
import zipfile
from pathlib import Path

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


def test_packager_excludes_build_artifacts():
    """测试打包器排除 __pycache__ / *.pyc / .DS_Store 等产物"""
    import tempfile
    import textwrap

    tmp = Path(tempfile.mkdtemp())
    try:
        skill_dir = tmp / "junky-skill"
        (skill_dir / "scripts" / "__pycache__").mkdir(parents=True)
        (skill_dir / "assets").mkdir(parents=True)

        (skill_dir / "SKILL.md").write_text(
            textwrap.dedent(
                """\
                ---
                name: junky-skill
                version: 0.0.1
                description: 测试用
                category: 开发工具
                author: Test
                ---

                # junky
                """
            ),
            encoding="utf-8",
        )
        # 应被排除的产物
        (skill_dir / "scripts" / "__pycache__" / "x.cpython-312.pyc").write_bytes(b"\x00\x01")
        (skill_dir / "scripts" / "__pycache__").joinpath("keep.py").write_text("x=1\n", encoding="utf-8")
        (skill_dir / "assets" / ".DS_Store").write_bytes(b"\x00")
        # 应保留的真实内容
        (skill_dir / "scripts" / "run.py").write_text("print('ok')\n", encoding="utf-8")
        (skill_dir / "assets" / "icon.svg").write_text("<svg/>\n", encoding="utf-8")

        out = tmp / "out.zip"
        zip_path, _ = pack_skill(str(skill_dir), output_path=str(out), report=False)

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()

        assert not any(".pyc" in n for n in names), f"__pycache__ leaked: {names}"
        assert not any("__pycache__" in n for n in names), f"__pycache__ leaked: {names}"
        assert not any(".DS_Store" in n for n in names), f".DS_Store leaked: {names}"
        assert "scripts/run.py" in names, f"real script missing: {names}"
        assert "assets/icon.svg" in names, f"assets not packaged: {names}"
        print("✓ test_packager_excludes_build_artifacts")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_manifest_structure_reflects_reality():
    """测试 manifest.structure 不再硬编码，反映实际内容"""
    zip_path, manifest = pack_skill("skills/template", report=False)
    structure = manifest["structure"]
    assert "SKILL.md" in structure
    # template 无 assets/ 时不得声称含有
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()
    if not any(n.startswith("assets/") for n in names):
        assert "assets/" not in structure, f"structure 声称不存在的目录: {structure}"
    zip_path.unlink()
    print("✓ test_manifest_structure_reflects_reality")


if __name__ == "__main__":
    test_pack_template_creates_zip()
    test_manifest_content()
    test_packager_excludes_build_artifacts()
    test_manifest_structure_reflects_reality()
    print("\n✓ All packager tests passed")
