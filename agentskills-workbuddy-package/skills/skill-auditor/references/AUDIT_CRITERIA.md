# 审计标准（Audit Criteria）

## Tier 1: 结构完整性

### 检查项
- [ ] SKILL.md 文件存在
- [ ] frontmatter 以 `---` 开始和结束
- [ ] 必填字段齐全：name, display_name, description, category, version, author

### 通过标准
- 所有必填字段存在且非空
- frontmatter 格式正确

### 失败标准
- 缺少 SKILL.md 文件
- frontmatter 缺失或格式错误
- 任意必填字段缺失或为空

---

## Tier 2: 语法正确性

### 检查项
- [ ] YAML 语法正确
- [ ] 冒号后必须有空格
- [ ] 无中文全角冒号（：）
- [ ] 无中文全角引号（""''）
- [ ] 缩进使用空格，不使用 Tab

### 通过标准
- 无语法错误
- 无格式警告

### 失败标准
- YAML 解析失败
- 发现全角字符
- 缩进不一致

---

## Tier 3: 内容质量

### 检查项
- [ ] description 长度 10-100 字符
- [ ] version 符合 semver 格式（x.y.z）
- [ ] category 在标准列表中
- [ ] 触发词明确（description 中包含）

### 通过标准
- 所有内容检查通过
- 无警告

### 失败标准
- description 过短（< 10）或过长（> 100）
- version 格式错误
- category 不在标准列表

---

## Tier 4: 安全与治理

### 检查项
- [ ] 脚本无危险操作（rm -rf、删除系统文件、格式化磁盘等）
- [ ] 无硬编码的 API key、密码、token
- [ ] 无敏感信息泄露（IP 地址、域名等）
- [ ] 治理字段完整（如适用）

### 通过标准
- 无安全风险
- 无敏感信息

### 失败标准
- 发现危险操作
- 发现硬编码凭证
- 发现敏感信息泄露

---

## 审计结果判定

| 结果 | 条件 |
|------|------|
| approved | 无 error，无 critical/high |
| needs_review | 有 medium 或 low warning |
| rejected | 有 critical/high error 或 Tier 1/2 失败 |
