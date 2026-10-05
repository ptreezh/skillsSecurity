"""
测试 .codebuddy-plugin/plugin.json 与真实文件的一致性

防止出现「声明了不存在的技能」或「存在但未声明的技能」这类漂移。
"""

import json
import os
import sys
from pathlib import Path

PKG_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_JSON = PKG_ROOT / ".codebuddy-plugin" / "plugin.json"

# template 是脚手架参考，不作为可上架技能
NOT_SUBMITTABLE = {"template"}


def load_plugin():
    with open(PLUGIN_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def test_plugin_json_is_valid():
    """plugin.json 可解析且含必需字段"""
    plugin = load_plugin()
    for key in ("name", "version", "description", "teamLead", "members", "skills"):
        assert key in plugin, f"plugin.json 缺少字段: {key}"
    assert isinstance(plugin["members"], list) and plugin["members"]
    assert isinstance(plugin["skills"], list) and plugin["skills"]
    print("✓ test_plugin_json_is_valid")


def test_declared_agents_exist():
    """teamLead 与 members 引用的 agent 文件必须存在"""
    plugin = load_plugin()
    refs = [plugin["teamLead"]] + list(plugin["members"])
    missing = [r for r in refs if not (PKG_ROOT / r).exists()]
    assert not missing, f"plugin.json 引用了不存在的 agent 文件: {missing}"
    print("✓ test_declared_agents_exist")


def test_declared_skills_exist():
    """skills[] 中每一项都必须存在 skills/<name>/SKILL.md"""
    plugin = load_plugin()
    missing = []
    for name in plugin["skills"]:
        skill_md = PKG_ROOT / "skills" / name / "SKILL.md"
        if not skill_md.exists():
            missing.append(name)
    assert not missing, (
        f"plugin.json 声明了不存在的技能: {missing}。"
        "请删除这些条目，或补齐 skills/<name>/SKILL.md"
    )
    print("✓ test_declared_skills_exist")


def test_no_undeclared_submittable_skills():
    """磁盘上所有可上架技能都必须在 skills[] 中声明"""
    plugin = load_plugin()
    declared = set(plugin["skills"])
    skills_root = PKG_ROOT / "skills"
    on_disk = {
        d.name
        for d in skills_root.iterdir()
        if d.is_dir() and (d / "SKILL.md").exists()
    }
    undeclared = sorted(on_disk - declared - NOT_SUBMITTABLE)
    assert not undeclared, (
        f"以下技能存在于磁盘但未在 plugin.json 声明: {undeclared}。"
        "请补充到 skills[] 数组"
    )
    print("✓ test_no_undeclared_submittable_skills")


def test_declared_skills_not_in_not_submittable():
    """template 不应出现在可上架清单中"""
    plugin = load_plugin()
    leaked = sorted(set(plugin["skills"]) & NOT_SUBMITTABLE)
    assert not leaked, f"脚手架目录不应作为可上架技能声明: {leaked}"
    print("✓ test_declared_skills_not_in_not_submittable")


def test_skill_frontmatter_name_matches_dir():
    """技能 frontmatter 的 name 应与目录名一致（避免 zip 名与目录混淆）"""
    plugin = load_plugin()
    mismatches = []
    for name in plugin["skills"]:
        skill_md = PKG_ROOT / "skills" / name / "SKILL.md"
        if not skill_md.exists():
            continue
        text = skill_md.read_text(encoding="utf-8")
        if not text.startswith("---"):
            mismatches.append(f"{name}: 缺少 frontmatter")
            continue
        end = text.find("\n---", 3)
        block = text[3:end] if end != -1 else ""
        fm_name = None
        for line in block.splitlines():
            if line.startswith("name:"):
                fm_name = line.split(":", 1)[1].strip().strip("\"'")
                break
        if fm_name != name:
            mismatches.append(f"目录={name} frontmatter.name={fm_name}")
    assert not mismatches, (
        "技能目录名与 frontmatter name 不一致（WorkBuddy 以 frontmatter 为标识，"
        f"不一致会导致 zip 名与目录混淆）:\n  " + "\n  ".join(mismatches)
    )
    print("✓ test_skill_frontmatter_name_matches_dir")


if __name__ == "__main__":
    test_plugin_json_is_valid()
    test_declared_agents_exist()
    test_declared_skills_exist()
    test_no_undeclared_submittable_skills()
    test_declared_skills_not_in_not_submittable()
    test_skill_frontmatter_name_matches_dir()
    print("\n✓ All plugin manifest tests passed")
