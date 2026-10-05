# WorkBuddy 平台规则笔记

## 技能包规范

- 最大文件大小：3MB
- 支持格式：.zip
- 必须包含：根级 SKILL.md
- frontmatter 必填字段：name, display_name, description, description_en, category, version, author

## 命名冲突处理

平台全局唯一校验 `name:` 字段。如果提示「已被占用」：
1. 修改 SKILL.md 中的 `name:` 字段
2. 建议加前缀，如 `agentskills-xxx`
3. 重新打包上传

## 市场展示分类

可选值：
- OPC·一人公司
- 办公协同
- 开发工具
- 投资理财
- 效率工具
- 内容创作
- 信息资讯
- 教育学习
- 数据分析
- 网站部署
- 生活服务
- 商业运营
- 知识与学习

最多选择 3 个。

## 服务类目

树形结构，两级：
- 第一级：工具、商业服务、体育
- 第二级：对应子类

必须至少选择 1 个，至多 5 个。

## 审核流程

- 提交后状态：审核中
- 预计时间：7 个工作日
- 结果通知：平台通知中心
- 审核失败：可查看驳回原因并重新提交

## 自动化限制

- 服务类目树形选择器自定义组件，常规 click 可能失效
- 建议使用键盘操作：ArrowDown / ArrowRight / Enter
- 或使用 BrowserSkill 的 observe + click 组合
