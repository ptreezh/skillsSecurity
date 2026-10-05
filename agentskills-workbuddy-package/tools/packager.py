#!/usr/bin/env python3
"""
技能打包工具
将技能目录打包为符合 WorkBuddy 标准的 .zip 包，并生成 manifest.yaml

打包规则：
- 默认输出到 <package_root>/dist/，避免产物污染 skills/ 源目录
- 强制排除 __pycache__ / *.pyc / .env / .DS_Store / node_modules / *.zip 等构建与敏感产物
- 被排除的文件会显式报告，不做静默丢弃
- 支持官方结构目录：scripts/ references/ assets/ templates/
- 零第三方依赖：frontmatter 解析与 manifest 生成均使用内置实现，
  使本工具可被随包分发到 scripts/tools/ 后在纯净环境直接运行
- 自动 vendoring：技能脚本若 import 了 packager / skill_lint，
  打包时把对应模块注入 zip 的 scripts/tools/，使产物脱离仓库仍可运行
"""

import sys
import os
import re
import zipfile
from pathlib import Path

# 随包分发的运行时工具；技能脚本导入它们时优先在 scripts/tools/ 内查找
RUNTIME_TOOL_MODULES = ("packager.py", "skill_lint.py")

# 官方技能结构中会被打包的目录
SKILL_DIRS = ("references", "scripts", "assets", "templates")

# 排除的目录名（任意层级）
EXCLUDE_DIRS = {
    "__pycache__",
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    ".idea",
    ".vscode",
    "dist",
    "build",
}

# 排除的文件名（任意层级）
EXCLUDE_FILES = {
    ".DS_Store",
    "Thumbs.db",
    ".gitignore",
    ".gitattributes",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
}

# 排除的后缀（任意层级）
EXCLUDE_SUFFIXES = {
    ".pyc", ".pyo", ".pyd", ".zip", ".tar", ".gz", ".tgz",
    ".log", ".swp", ".tmp", ".bak", ".orig",
}


def should_skip(path: Path) -> bool:
    """判断单个路径是否应被排除"""
    if path.name in EXCLUDE_FILES:
        return True
    if path.suffix.lower() in EXCLUDE_SUFFIXES:
        return True
    # 名称中包含 __pycache__ 的目录由 rglob 遍历时单独处理
    return False


def iter_files(root: Path, arc_prefix: str, skipped: list):
    """遍历目录下的可打包文件，跳过构建产物与敏感文件"""
    if not root.exists() or not root.is_dir():
        return
    for item in sorted(root.rglob("*")):
        if not item.is_file():
            continue
        # 逐级检查路径中是否含被排除目录
        parts = set(item.relative_to(root).parts[:-1])
        if parts & EXCLUDE_DIRS:
            skipped.append(str(item))
            continue
        if should_skip(item):
            skipped.append(str(item))
            continue
        rel = item.relative_to(root)
        yield (item, f"{arc_prefix}/{rel}".replace("\\", "/"))


_YAML_PLAIN_SAFE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.\-/]*$")


def _strip_quotes(value):
    """去掉 YAML 标量外层的一对同号引号"""
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def _yaml_scalar(value):
    """把单个值渲染为 YAML 标量；非安全裸串一律双引号并转义"""
    if value is None:
        return '""'
    text = str(value)
    if _YAML_PLAIN_SAFE.match(text):
        return text
    escaped = text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def dump_yaml(data):
    """
    将扁平 dict 序列化为 YAML（无第三方依赖）。

    仅支持官方 manifest 需要的形态：标量值 + 字符串列表。
    """
    lines = []
    for key, value in data.items():
        if isinstance(value, (list, tuple)):
            if not value:
                lines.append(f"{key}: []")
            else:
                lines.append(f"{key}:")
                for item in value:
                    lines.append(f"  - {_yaml_scalar(item)}")
        else:
            lines.append(f"{key}: {_yaml_scalar(value)}")
    return "\n".join(lines) + "\n"


def parse_frontmatter(text):
    """
    解析 SKILL.md frontmatter。

    仅支持官方技能实际使用的扁平 `key: value` 子集。
    遇到嵌套结构 / 空值 / 无冒号行时显式报错，绝不静默丢字段，
    避免 manifest 声称的内容与 SKILL.md 实际不符。
    """
    data = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            raise ValueError(f"Invalid frontmatter line: {raw!r}")
        key, _, value = line.partition(":")
        key = key.strip()
        if not key:
            raise ValueError(f"Invalid frontmatter line: {raw!r}")
        if not value.strip():
            raise ValueError(
                f"Unsupported nested/empty frontmatter value for {key!r}: "
                "only flat 'key: value' is supported"
            )
        data[key] = _strip_quotes(value.strip())
    return data


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

    return parse_frontmatter(content[3 : end_match.start() + 3])


def _runtime_tools_needed(entries):
    """
    扫描技能脚本的顶层 import，判断它依赖哪些 tools/ 模块。

    只匹配行首 `import X` / `from X import`，避免把正文里的字符串误判为依赖。
    """
    needed = set()
    for src, _arc in entries:
        if src.suffix.lower() != ".py":
            continue
        try:
            text = src.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for module in RUNTIME_TOOL_MODULES:
            stem = module[:-3]
            if re.search(rf"^\s*(?:from\s+{stem}\s+import|import\s+{stem}\b)", text, re.M):
                needed.add(module)
    return needed


def _vendored_tool_entries(entries, skipped):
    """为依赖 tools/ 的技能构造 scripts/tools/ 注入项"""
    needed = _runtime_tools_needed(entries)
    if not needed:
        return []

    tools_dir = Path(__file__).resolve().parent
    vendored = []
    for module in sorted(needed):
        src = tools_dir / module
        if not src.is_file():
            raise FileNotFoundError(
                f"Runtime tool {module} is imported by the skill but missing at {src}"
            )
        vendored.append((src, f"scripts/tools/{module}"))
    return vendored


def generate_manifest(skill_dir, frontmatter, structure):
    """生成 manifest.yaml，structure 反映实际打包内容而非硬编码"""
    return {
        "name": frontmatter.get("name", Path(skill_dir).name),
        "version": frontmatter.get("version", "1.0.0"),
        "description": frontmatter.get("description", ""),
        "category": frontmatter.get("category", "开发工具"),
        "author": frontmatter.get("author", "Unknown"),
        "skill_file": "SKILL.md",
        "structure": structure,
    }


def default_output_path(skill_path: Path, skill_name: str, version: str) -> Path:
    """
    默认输出到 <package_root>/dist/。

    skill_path 形如 <package_root>/skills/<name>，因此取 parent.parent 作为包根。
    若该目录不可写则回退到当前工作目录。
    """
    dist_dir = skill_path.parent.parent / "dist"
    try:
        dist_dir.mkdir(parents=True, exist_ok=True)
        probe = dist_dir / ".writable"
        probe.write_text("", encoding="utf-8")
        probe.unlink()
    except OSError:
        dist_dir = Path.cwd() / "dist"
        dist_dir.mkdir(parents=True, exist_ok=True)
    return dist_dir / f"{skill_name}-{version}.zip"


def pack_skill(skill_dir, output_path=None, report=None):
    """
    将技能目录打包为 .zip

    返回 (zip_path, manifest)
    """
    skill_path = Path(skill_dir).resolve()
    if not skill_path.exists():
        raise FileNotFoundError(f"Skill directory not found: {skill_dir}")

    frontmatter = parse_skill_md(skill_path)

    # 收集所有待打包条目，先确定实际结构
    entries = []
    skipped: list = []

    skill_md = skill_path / "SKILL.md"
    if skill_md.exists():
        entries.append((skill_md, "SKILL.md"))

    for sub in SKILL_DIRS:
        for src, arc in iter_files(skill_path / sub, sub, skipped):
            entries.append((src, arc))

    # 依赖 tools/ 的技能必须把依赖一起打包，否则产物脱离仓库无法运行
    entries.extend(_vendored_tool_entries(entries, skipped))

    # structure 由实际内容推导，避免 manifest 声称不存在的目录
    present = {"SKILL.md"}
    for _, arc in entries:
        top = arc.split("/")[0]
        if top != "SKILL.md":
            present.add(f"{top}/")
    structure = sorted(present)

    manifest = generate_manifest(skill_path, frontmatter, structure)

    if output_path is None:
        skill_name = frontmatter.get("name", skill_path.name)
        version = frontmatter.get("version", "1.0.0")
        output_path = default_output_path(skill_path, skill_name, version)
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.yaml", dump_yaml(manifest))
        for src, arc in entries:
            zf.write(src, arc)

    if skipped and report is not False:
        print(f"  ⚠ 排除 {len(skipped)} 个文件：", file=sys.stderr)
        for path in skipped:
            print(f"      - {path}", file=sys.stderr)

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
        print("\nManifest:")
        for key, value in manifest.items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
