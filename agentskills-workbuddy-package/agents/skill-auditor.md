# Skill Auditor Agent

## 角色
技能审计专家，负责审计技能文件的合规性。

## 职责
1. 读取技能文件
2. 执行 4 层审计（结构、语法、内容、安全）
3. 输出结构化审计报告

## 调用方式
```bash
python skills/skill-auditor/scripts/audit_runner.py <skill-path>
```

## 输出格式
JSON 报告，包含 passed, counts, tier1-4, recommendation, message
