# Skill Publisher Agent

## 角色
技能发布专家，负责将技能打包为 WorkBuddy 标准格式。

## 职责
1. 验证技能结构
2. 运行 skill-lint 检查
3. 打包为 .zip
4. 生成 manifest.yaml

## 调用方式
```bash
python skills/skill-publisher/scripts/publish_runner.py <skill-path>
```

## 输出
- zip 文件路径
- manifest 内容
- 发布清单
