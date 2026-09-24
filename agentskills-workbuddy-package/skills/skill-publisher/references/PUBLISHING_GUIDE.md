# WorkBuddy 发布流程

## 发布前检查清单

- [ ] 技能已通过 skill-auditor 审计（approved）
- [ ] SKILL.md frontmatter 完整
- [ ] 无敏感信息（API key、密码、token）
- [ ] 脚本已测试通过
- [ ] README.md 已更新

## 打包步骤

```bash
python tools/packager.py skills/<skill-name>/
```

## 输出文件

- `<skill-name>-<version>.zip`：包含 SKILL.md、references/、scripts/、templates/、manifest.yaml
- `manifest.yaml`：技能元数据

## 上传到 open.workbuddy.cn

1. 登录 open.workbuddy.cn
2. 进入「发布技能」
3. 上传 .zip 文件
4. 填写发布说明
5. 提交审核

## 审核流程

- 自动审核：安全扫描、格式检查（约 5 分钟）
- 人工审核：功能验证（约 1-2 工作日）
- 审核结果：通过 / 需修改 / 拒绝
