# 常见错误与解决方案

## 链上责任审计错误

### 错误：attribution 字段缺失
**原因**：SKILL.md frontmatter 缺少 attribution 配置
**解决**：添加 attribution 配置块

### 错误：contract_address 格式错误
**原因**：地址不是 0x 开头的 40 位十六进制
**解决**：修正为正确格式

### 错误：skill_id 未注册
**原因**：技能未在 SkillRegistry 中注册
**解决**：先调用 SkillRegistry.registerSkill()

### 错误：chain_id 不支持
**原因**：目标链 ID 不在支持列表中
**解决**：使用支持的 chain_id

## 修复 checklist

- [ ] 添加 attribution frontmatter
- [ ] 配置 contract_address
- [ ] 设置 chain_id
- [ ] 注册 skill_id
- [ ] 配置 responsible_party
- [ ] 配置 reputation_recipient
- [ ] 验证链上状态
