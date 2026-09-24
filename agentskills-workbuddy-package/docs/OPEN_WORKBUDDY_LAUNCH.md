# open.workbuddy.cn 上架指南

## 前置条件

- [ ] 实名认证完成（个人/企业）
- [ ] 技能包通过本地验证（Phase 35）
- [ ] 技能包已打包为 .zip
- [ ] manifest.yaml 已生成

## 上架步骤

### 1. 准备技能包

```bash
cd agentskills-workbuddy-package
python tools/packager.py skills/skill-auditor/
python tools/packager.py skills/skill-publisher/
python tools/packager.py skills/skill-registry/
```

### 2. 登录 open.workbuddy.cn

1. 访问 https://open.workbuddy.cn
2. 使用 GitHub/Google 账号登录
3. 完成实名认证（个人/企业）

### 3. 创建技能应用

1. 进入「开发者中心」
2. 点击「创建技能」
3. 填写技能信息：
   - 技能名称
   - 技能描述
   - 分类
   - 标签
4. 上传 .zip 包
5. 提交审核

### 4. 审核流程

- 自动审核：约 5 分钟
  - 安全扫描
  - 格式检查
- 人工审核：约 1-2 工作日
  - 功能验证
  - 内容审核

### 5. 发布后

- 监控下载量
- 收集用户反馈
- 定期更新版本

## 注意事项

- 每个技能必须通过 skill-auditor 审计
- 禁止上传包含敏感信息的技能
- 禁止上传恶意代码
- 必须提供使用文档

## 联系支持

- 邮箱：support@workbuddy.cn
- 文档：https://www.workbuddy.cn/docs/cli/skills
