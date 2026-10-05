#!/usr/bin/env python3
"""
测试发布产物脱离仓库后仍可运行（R16 回归）

背景：
    历史缺陷 R16 —— 技能脚本通过 `../../../tools` 导入 packager / skill_lint，
    而打包器只收集 SKILL_DIRS，不含仓库级 tools/，导致 zip 在用户机器上
    `ModuleNotFoundError: No module named 'packager'`。

本测试对每个技能执行完整闭环：
    1. 用 packager 打包到临时目录
    2. 解压到另一个临时目录（模拟用户机器，完全脱离仓库）
    3. 在解压目录内以合法 CLI 调用真实入口
    4. 断言进程退出码与产物内容

任何一步失败即视为发布物不合格。
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

PKG_ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = PKG_ROOT / "skills"

sys.path.insert(0, str(PKG_ROOT / "tools"))
from packager import pack_skill  # noqa: E402

# 需要隔离运行的技能：带真实脚本入口
SKILLS_WITH_ENTRY = [
    "skill-auditor",
    "skill-publisher",
    "skill-registry",
]

# 所有可上架技能：均需通过打包卫生检查
ALL_SKILLS = [
    "attribution-auditor",
    "skill-auditor",
    "skill-publisher",
    "skill-registry",
    "workbuddy-skill-deployer",
]


def run_in_isolation(extracted: Path, args, env=None):
    """在解压目录内执行命令，返回 CompletedProcess"""
    run_env = dict(os.environ)
    # 明确切断对仓库 tools/ 与 PYTHONPATH 的任何依赖
    run_env.pop("PYTHONPATH", None)
    if env:
        run_env.update(env)
    return subprocess.run(
        [sys.executable] + args,
        cwd=str(extracted),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=run_env,
        timeout=120,
    )


def pack_and_extract(skill_name: str, tmp: Path):
    """打包并解压，返回 (zip_path, extracted_dir)"""
    zip_path, _ = pack_skill(
        str(SKILLS_DIR / skill_name),
        output_path=str(tmp / f"{skill_name}.zip"),
        report=False,
    )
    extracted = tmp / f"x-{skill_name}"
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extracted)
    return zip_path, extracted


def test_zip_has_no_build_artifacts():
    """R16 前置：任何发布物都不得携带构建垃圾"""
    tmp = Path(tempfile.mkdtemp())
    try:
        for skill_name in ALL_SKILLS:
            zip_path, _ = pack_and_extract(skill_name, tmp)
            with zipfile.ZipFile(zip_path, "r") as zf:
                names = zf.namelist()
            bad = [
                n
                for n in names
                if "__pycache__" in n
                or n.endswith((".pyc", ".pyo", ".zip", ".log"))
                or ".env" in n
                or n.endswith(".DS_Store")
            ]
            assert not bad, f"{skill_name} 含构建垃圾: {bad}"
        print("✓ test_zip_has_no_build_artifacts")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_packager_is_zero_dependency():
    """R16 根因：packager 依赖 PyYAML 会让 vendoring 失去意义"""
    source = (PKG_ROOT / "tools" / "packager.py").read_text(encoding="utf-8")
    assert "import yaml" not in source, "packager.py 不得依赖 PyYAML，否则无法零依赖分发"
    for line in source.splitlines():
        stripped = line.strip()
        if stripped.startswith(("import ", "from ")):
            mod = stripped.split()[1].split(".")[0]
            assert mod in (
                "sys", "os", "re", "zipfile", "pathlib", "tempfile", "json",
            ), f"packager.py 出现非标准库依赖: {stripped}"
    print("✓ test_packager_is_zero_dependency")


def test_auditor_runs_standalone():
    """skill-auditor 必须能在解压目录内完成真实审计"""
    tmp = Path(tempfile.mkdtemp())
    try:
        _zip, extracted = pack_and_extract("skill-auditor", tmp)
        # 审计包内自己
        proc = run_in_isolation(
            extracted,
            ["scripts/audit_runner.py", "."],
        )
        assert proc.returncode in (0, 1, 2), (
            f"audit_runner 非预期退出码 {proc.returncode}\n"
            f"stdout={proc.stdout[-800:]}\nstderr={proc.stderr[-800:]}"
        )
        report = json.loads(proc.stdout)
        assert "skill_name" in report, f"报告缺少 skill_name: {report}"
        assert "recommendation" in report, f"报告缺少 recommendation: {report}"
        assert report["recommendation"] in (
            "approved", "needs_review", "rejected",
        ), f"recommendation 取值非法: {report['recommendation']}"
        print("✓ test_auditor_runs_standalone")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_publisher_runs_standalone():
    """skill-publisher 必须能在解压目录内打包（核心依赖 packager）"""
    tmp = Path(tempfile.mkdtemp())
    try:
        _zip, extracted = pack_and_extract("skill-publisher", tmp)
        proc = run_in_isolation(
            extracted,
            ["scripts/publish_runner.py", "."],
        )
        combined = proc.stdout + proc.stderr
        assert "packager not available" not in combined, (
            f"publisher 仍在静默降级:\n{combined[-800:]}"
        )
        assert "No module named" not in combined, (
            f"publisher 依赖缺失:\n{combined[-800:]}"
        )
        assert proc.returncode == 0, (
            f"publish_runner 退出码 {proc.returncode}\n{combined[-800:]}"
        )
        payload = json.loads(proc.stdout)
        print("✓ test_publisher_runs_standalone")
        assert isinstance(payload, dict)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_registry_runs_standalone():
    """
    skill-registry 离线 prepare 必须能在解压目录内运行（R16 原始复现路径）。

    这是 R16 的决定性回归：修复前此处报
    `Packaging failed: No module named 'packager'`。
    """
    tmp = Path(tempfile.mkdtemp())
    try:
        _zip, extracted = pack_and_extract("skill-registry", tmp)
        proc = run_in_isolation(
            extracted,
            ["scripts/register_runner.py", "."],
        )
        combined = proc.stdout + proc.stderr
        assert "No module named 'packager'" not in combined, (
            f"R16 未修复，仍缺 packager:\n{combined[-800:]}"
        )
        assert proc.returncode == 0, (
            f"register_runner 退出码 {proc.returncode}\n{combined[-1200:]}"
        )
        payload = json.loads(proc.stdout)
        assert payload.get("status") == "prepared", (
            f"离线 prepare 未成功: {payload}"
        )
        assert payload.get("sha256"), f"缺少 sha256 指纹: {payload}"
        print("✓ test_registry_runs_standalone")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_scripts_tools_injected_when_imported():
    """依赖 tools/ 的技能，zip 内必须带 scripts/tools/"""
    tmp = Path(tempfile.mkdtemp())
    try:
        for skill_name, expected in (
            ("skill-publisher", "scripts/tools/packager.py"),
            ("skill-registry", "scripts/tools/packager.py"),
        ):
            zip_path, _ = pack_and_extract(skill_name, tmp)
            with zipfile.ZipFile(zip_path, "r") as zf:
                names = zf.namelist()
            assert expected in names, (
                f"{skill_name} 未注入 {expected}: {names}"
            )
        # audit_runner 已自包含，不应被注入
        zip_path, _ = pack_and_extract("skill-auditor", tmp)
        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
        assert not any(n.startswith("scripts/tools/") for n in names), (
            f"skill-auditor 已自包含，不应注入 tools: {names}"
        )
        print("✓ test_scripts_tools_injected_when_imported")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    test_zip_has_no_build_artifacts()
    test_packager_is_zero_dependency()
    test_scripts_tools_injected_when_imported()
    test_auditor_runs_standalone()
    test_publisher_runs_standalone()
    test_registry_runs_standalone()
    print("\n✓ All isolated-package tests passed")
