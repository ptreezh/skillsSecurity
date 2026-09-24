#!/usr/bin/env python3
"""
技能打包工具
将技能目录打包为符合 WorkBuddy 标准的 .zip 包，并生成 manifest.yaml
"""

import sys
import os
import re
import zipfile
from pathlib import Path

import yaml


def parse_skill_md(skill_dir):
    """解析 SKILL.md frontmatter"""
    skill_md = Path(skill_dir) / "SKILL.md"
    if not skill_md.exists():
        raise FileNotFoundError(f"SKILL.md not found in {skill_dir}")

    content = skill_md.read_text(encoding="utf-8")
    if not content.startswith("---"):
        raise ValueError("SKILL.md missing frontmatter")

    end_match = re.search(r"\n---\n", content[3:])
    if not end_match:
        raise ValueError("SKILL.md missing frontmatter end")

    frontmatter_text = content[3 : end_match.start() + 3]
    try:
        frontmatter = yaml.safe_load(frontmatter_text) or {}
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in frontmatter: {e}")

    return frontmatter


def generate_manifest(skill_dir, frontmatter):
    """生成 manifest.yaml"""
    manifest = {
        "name": frontmatter.get("name", Path(skill_dir).name),
        "version": frontmatter.get("version", "1.0.0"),
        "description": frontmatter.get("description", ""),
        "category": frontmatter.get("category", "开发工具"),
        "author": frontmatter.get("author", "Unknown"),
        "skill_file": "SKILL.md",
        "structure": ["SKILL.md", "references/", "scripts/", "templates/"],
    }
    return manifest


def pack_skill(skill_dir, output_path=None):
    """将技能目录打包为 .zip"""
    skill_path = Path(skill_dir).resolve()
    if not skill_path.exists():
        raise FileNotFoundError(f"Skill directory not found: {skill_dir}")

    # 解析 frontmatter
    frontmatter = parse_skill_md(skill_path)

    # 生成 manifest
    manifest = generate_manifest(skill_path, frontmatter)

    # 确定输出路径
    if output_path is None:
        skill_name = frontmatter.get("name", skill_path.name)
        version = frontmatter.get("version", "1.0.0")
        output_path = skill_path.parent / f"{skill_name}-{version}.zip"
    else:
        output_path = Path(output_path)

    # 创建 zip
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # 添加 manifest.yaml
        zf.writestr("manifest.yaml", yaml.dump(manifest, allow_unicode=True, default_flow_style=False))

        # 添加 SKILL.md
        skill_md = skill_path / "SKILL.md"
        if skill_md.exists():
            zf.write(skill_md, "SKILL.md")

        # 添加 references/
        refs_dir = skill_path / "references"
        if refs_dir.exists():
            for ref_file in refs_dir.rglob("*"):
                if ref_file.is_file():
                    arcname = f"references/{ref_file.relative_to(refs_dir)}"
                    zf.write(ref_file, arcname)

        # 添加 scripts/
        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists():
            for script_file in scripts_dir.rglob("*"):
                if script_file.is_file():
                    arcname = f"scripts/{script_file.relative_to(scripts_dir)}"
                    zf.write(script_file, arcname)

        # 添加 templates/
        templates_dir = skill_path / "templates"
        if templates_dir.exists():
            for template_file in templates_dir.rglob("*"):
                if template_file.is_file():
                    arcname = f"templates/{template_file.relative_to(templates_dir)}"
                    zf.write(template_file, arcname)

    return output_path, manifest


def main():
    if len(sys.argv) < 2:
        print("Usage: python packager.py <skill-directory> [output.zip]")
        sys.exit(1)

    skill_dir = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        zip_path, manifest = pack_skill(skill_dir, output_path)
        print(f"✓ Packaged: {zip_path}")
        print(f"\nManifest:")
        for key, value in manifest.items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
