#!/usr/bin/env python3
"""
WorkBuddy 官方技能规范提交门禁（方案文档 rev.7 / 决策 D19 / 风险 R20）

背景
    官方《技能开发文档》(https://open.workbuddy.cn/docs/skill) 规定了
    frontmatter 字段表与技能目录结构。本测试把该规范固化为可执行断言，
    避免「规范只在文档里、回归时没人跑」——rev.6 结束时「官方 schema
    待核实」是整份方案最大的未验证假设。

来源
    字段必填性、子目录清单取自上述官方页面 2026-10-05 的全文抓取结果。
    官方将 zip 作为提交形态（页面含「提交 zip 包后解析失败」排查路径），
    故本测试只校验**源目录**；zip 层闭包与隔离运行由
    test_isolated_package.py 负责，两者正交、不可互相替代。

分级
    FATAL     —— 违反官方明文要求，提交必然被拒：缺少官方必填字段、
                 出现官方未声明的子目录、技能根目录存在散落文件。
    ADVISORY  —— 官方未声明的 frontmatter 键。未知键通常被忽略而非报错，
                 故不判失败；但若它与某个官方键仅差一个字符，则几乎必然
                 是拼写错误（会导致该配置被静默丢弃），此时判 FATAL。

零依赖
    仅用标准库，与 packager.py 的零第三方依赖约束保持一致。
"""

import json
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

PKG_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_JSON = PKG_ROOT / ".codebuddy-plugin" / "plugin.json"
SKILLS_DIR = PKG_ROOT / "skills"

sys.path.insert(0, str(PKG_ROOT / "tools"))
from packager import pack_skill  # noqa: E402

# 官方《技能开发文档》frontmatter 字段表：必填项
OFFICIAL_REQUIRED_FRONTMATTER = (
    "description",
    "description_zh",
    "description_en",
    "version",
    "author",
)

# 官方字段表中标注为「否」（选填）的键
OFFICIAL_OPTIONAL_FRONTMATTER = (
    "name",
    "license",
    "allowed-tools",
    "category",
    "display_name",
    "min_workbuddy_version",
)

OFFICIAL_KNOWN_FRONTMATTER = frozenset(
    OFFICIAL_REQUIRED_FRONTMATTER + OFFICIAL_OPTIONAL_FRONTMATTER
)

# 官方声明的技能子目录（根目录 SKILL.md 之外）
OFFICIAL_SUBDIRS = frozenset({"references", "scripts", "templates"})

# 官方未声明、但仓库自身引入的键。列出以示「已知例外」，
# 避免每次新增字段都被当成拼写错误。
REPO_INTRODUCED_FRONTMATTER = frozenset({"display_name_en"})

# 技能目录内绝不允许出现的构建产物（R18 的仓库层卫生）
ARTIFACT_RE = re.compile(
    r"(^|/)(__pycache__|[^/]+\.(pyc|pyo|zip|DS_Store))($|/)"
)

KEY_LINE = re.compile(r"^([A-Za-z0-9_-]+):(.*)$")


def listing_skills():
    """从 plugin.json 取可上架技能，避免在此处硬编码而与清单漂移"""
    with open(PLUGIN_JSON, "r", encoding="utf-8") as f:
        return list(json.load(f)["skills"])


def read_frontmatter(skill_md: Path):
    """返回 (原始 frontmatter 文本, {键: 值字符串})；结构异常时抛 AssertionError"""
    text = skill_md.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise AssertionError("缺少 frontmatter 起始分隔符 ---")
    end = text.find("\n---", 3)
    if end == -1:
        raise AssertionError("缺少 frontmatter 结束分隔符 ---")
    block = text[3:end]
    fields = {}
    for line in block.splitlines():
        m = KEY_LINE.match(line)
        if m:
            fields[m.group(1)] = m.group(2).strip().strip("\"'")
    return block, fields


def _is_one_edit_away(a: str, b: str) -> bool:
    """判断 a 与 b 是否仅相差一次插入/删除/替换/换位——用于识别拼写错误"""
    if a == b:
        return False
    la, lb = len(a), len(b)
    if abs(la - lb) > 1:
        return False
    if la == lb:
        diff = [i for i in range(la) if a[i] != b[i]]
        if len(diff) == 1:
            return True
        # 相邻换位，如 descirption
        if len(diff) == 2 and diff[1] == diff[0] + 1:
            i = diff[0]
            return a[i] == b[i + 1] and a[i + 1] == b[i]
        return False
    # 长度差 1：短的是长的子序列即可
    short, long = (a, b) if la < lb else (b, a)
    i = 0
    for ch in long:
        if i < len(short) and short[i] == ch:
            i += 1
    return True


def test_official_required_frontmatter_present():
    """FATAL：官方必填字段必须存在且非空（缺失会在提交后解析失败）"""
    problems = []
    for name in listing_skills():
        _, fields = read_frontmatter(SKILLS_DIR / name / "SKILL.md")
        for key in OFFICIAL_REQUIRED_FRONTMATTER:
            if key not in fields:
                problems.append(f"{name}: 缺少官方必填字段 {key}")
            elif not fields[key]:
                problems.append(f"{name}: 官方必填字段 {key} 为空")
    assert not problems, "官方必填 frontmatter 不齐备：\n  " + "\n  ".join(problems)
    print("✓ test_official_required_frontmatter_present")


def test_frontmatter_keys_are_declared_or_known():
    """FATAL 仅限拼写错误；官方未声明的键作为 ADVISORY 打印"""
    typos, advisory = [], []
    for name in listing_skills():
        _, fields = read_frontmatter(SKILLS_DIR / name / "SKILL.md")
        for key in fields:
            if key in OFFICIAL_KNOWN_FRONTMATTER:
                continue
            if key in REPO_INTRODUCED_FRONTMATTER:
                continue
            near = [k for k in OFFICIAL_KNOWN_FRONTMATTER if _is_one_edit_away(key, k)]
            if near:
                typos.append(f"{name}: `{key}` 疑似 `{near[0]}` 的拼写错误")
            else:
                advisory.append(f"{name}: `{key}` 官方未声明（将可能被忽略）")
    assert not typos, "frontmatter 键疑似拼写错误：\n  " + "\n  ".join(typos)
    if advisory:
        print("  [ADVISORY] 官方未声明的 frontmatter 键：")
        for a in advisory:
            print(f"    - {a}")
    print("✓ test_frontmatter_keys_are_declared_or_known")


def test_no_undocumented_subdirectories():
    """FATAL：官方仅声明 references/scripts/templates，出现其他目录可能被拒"""
    extra = []
    for name in listing_skills():
        for d in (SKILLS_DIR / name).iterdir():
            if d.is_dir() and d.name not in OFFICIAL_SUBDIRS:
                extra.append(f"{name}/{d.name}")
    assert not extra, (
        "技能目录含官方未声明的子目录：\n  "
        + "\n  ".join(sorted(extra))
        + "\n  若确有必要，请先更新方案文档的风险登记再放行。"
    )
    print("✓ test_no_undocumented_subdirectories")


def test_skill_root_has_no_stray_files():
    """FATAL：技能根目录只应有 SKILL.md，散落文件会污染提交包"""
    stray = []
    for name in listing_skills():
        for p in (SKILLS_DIR / name).iterdir():
            if p.is_file() and p.name != "SKILL.md":
                stray.append(f"{name}/{p.name}")
    assert not stray, "技能根目录存在散落文件：\n  " + "\n  ".join(sorted(stray))
    print("✓ test_skill_root_has_no_stray_files")


def _git_tracked_skill_files():
    """返回 git 跟踪的技能目录下文件列表；git 不可用时返回 None"""
    try:
        proc = subprocess.run(
            ["git", "ls-files", "--", "skills"],
            cwd=str(PKG_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return [ln for ln in proc.stdout.splitlines() if ln.strip()]


def test_no_tracked_build_artifacts():
    """
    FATAL：技能目录内不得有**被 git 跟踪的**构建产物（R18 的持续门禁）

    刻意不扫文件系统：本地 `__pycache__` 在任何人跑过一次 runner 后都会
    出现，且已被 .gitignore 覆盖、由打包器排除层过滤。把「本地跑过」当成
    失败会训练使用者忽略这个门禁，反而削弱它。R18 的真实缺陷类是
    「构建产物进入了版本库」，故此处只对 git 索引断言。
    磁盘/zip 层的卫生由 test_isolated_package.py 负责，两者正交。
    """
    tracked = _git_tracked_skill_files()
    if tracked is None:
        print("  [SKIP] git 不可用，跳过跟踪层产物检查")
        print("✓ test_no_tracked_build_artifacts (skipped)")
        return
    offenders = [
        p
        for p in tracked
        if any(part == "__pycache__" for part in p.split("/"))
        or p.endswith((".pyc", ".pyo", ".zip", ".DS_Store"))
    ]
    assert not offenders, (
        "以下构建产物被 git 跟踪（会导致陈旧 .pyc 泄漏本机路径，"
        "以及 template-*.zip 被自我打包）：\n  " + "\n  ".join(sorted(offenders))
    )
    print("✓ test_no_tracked_build_artifacts")


def test_no_local_artifacts_leak_into_zip():
    """
    FATAL：本地残留产物必须被打包器排除层挡住（不得进入提交包）

    这是磁盘层与 zip 层的接缝断言：即使 `__pycache__` 因跑过 runner 而
    存在于工作区，用户按官方流程打包出来的 zip 仍必须是干净的。
    """
    dirty = [
        name
        for name in listing_skills()
        if any(
            part == "__pycache__" or p.suffix in (".pyc", ".pyo", ".zip")
            for p in (SKILLS_DIR / name).rglob("*")
            for part in p.parts
        )
    ]
    if not dirty:
        print("✓ test_no_local_artifacts_leak_into_zip (工作区本就干净)")
        return
    leaked = []
    for name in dirty:
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / f"{name}.zip"
            pack_skill(SKILLS_DIR / name, output_path=str(out))
            with zipfile.ZipFile(out) as zf:
                leaked += [f"{name}:{n}" for n in zf.namelist() if ARTIFACT_RE.search(n)]
    assert not leaked, "本地残留产物进入了 zip：\n  " + "\n  ".join(sorted(leaked))
    print(f"✓ test_no_local_artifacts_leak_into_zip ({len(dirty)} 个目录有残留，均已被排除)")


def main():
    tests = (
        test_official_required_frontmatter_present,
        test_frontmatter_keys_are_declared_or_known,
        test_no_undocumented_subdirectories,
        test_skill_root_has_no_stray_files,
        test_no_tracked_build_artifacts,
        test_no_local_artifacts_leak_into_zip,
    )
    for t in tests:
        t()
    print("\n✓ All official skill spec gate tests passed")


if __name__ == "__main__":
    sys.exit(main())