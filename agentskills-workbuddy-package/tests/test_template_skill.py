"""
测试模板技能的基本功能
"""

import sys
import os
from pathlib import Path

# 添加 example.py 所在目录到路径
example_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "skills", "template", "scripts")
sys.path.insert(0, example_dir)

from example import extract_skill_info


def test_extract_skill_info():
    """测试从模板技能提取信息"""
    # 从 tests/ 目录向上两级到 agentskills-workbuddy-package/
    base_dir = Path(__file__).resolve().parent.parent
    skill_dir = base_dir / "skills" / "template"

    info = extract_skill_info(skill_dir)
    assert info["name"] == "template"
    assert info["display_name"] == "模板技能"
    assert info["version"] == "1.0.0"
    assert info["author"] == "AgentSkills Team"
    assert info["body_length"] > 0
    print("✓ test_extract_skill_info")


if __name__ == "__main__":
    test_extract_skill_info()
    print("\n✓ All template skill tests passed")
