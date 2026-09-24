# AgentSkills WorkBuddy Package

将 AgentSkills 系统能力分解为 WorkBuddy 可消费的 SKILL + 专家智能体 + 连接器。

## 项目结构

```
agentskills-workbuddy-package/
├── .codebuddy-plugin/
│   └── plugin.json          # WorkBuddy 专家智能体配置
├── avatars/                 # 头像目录
├── agents/                  # Agent 定义目录
│   ├── agentskills-team-lead.md
│   ├── skill-auditor.md
│   ├── skill-publisher.md
│   ├── skill-registry.md
│   ├── reputation-analyst.md
│   ├── skill-browser.md
│   ├── fingerprint-verifier.md
│   └── risk-classifier.md
├── skills/                  # SKILL 目录
│   ├── template/            # 模板技能
│   │   ├── SKILL.md
│   │   ├── references/
│   │   ├── scripts/
│   │   └── templates/
│   ├── skill-auditor/       # 技能审计师
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── scripts/
│   ├── skill-publisher/     # 技能发布器
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── scripts/
│   └── skill-registry/      # 技能注册器
│       ├── SKILL.md
│       └── scripts/
├── connectors/              # 连接器目录
│   └── template/
│       ├── backend-mcp.md
│       ├── backend_mcp.py
│       ├── chain-mcp.md
│       └── chain_mcp.py
├── tools/                   # 开发工具
│   ├── skill_lint.py        # SKILL.md 规范检查器
│   └── packager.py          # 打包工具
├── tests/                   # 测试目录
│   ├── test_skill_lint.py
│   ├── test_packager.py
│   ├── test_template_skill.py
│   ├── test_skill_auditor.py
│   ├── test_skill_publisher.py
│   ├── test_skill_registry.py
│   └── test_e2e.py
├── docs/                    # 文档目录
│   └── OPEN_WORKBUDDY_LAUNCH.md
├── .mcp.json                # MCP 依赖声明
└── settings.json            # WorkBuddy 设置
```

## 快速开始

### 1. 检查技能规范

```bash
python tools/skill_lint.py skills/template/
```

### 2. 打包技能

```bash
python tools/packager.py skills/skill-auditor/
```

### 3. 审计技能

```bash
python skills/skill-auditor/scripts/audit_runner.py skills/skill-auditor/
```

### 4. 发布技能

```bash
python skills/skill-publisher/scripts/publish_runner.py skills/skill-publisher/
```

### 5. 注册技能

```bash
python skills/skill-registry/scripts/register_runner.py skills/skill-registry/ http://localhost:10001
```

## 运行测试

```bash
# 运行所有单元测试
python tests/test_skill_lint.py
python tests/test_packager.py
python tests/test_skill_auditor.py
python tests/test_skill_publisher.py
python tests/test_skill_registry.py

# 运行 e2e 测试
python tests/test_e2e.py
```

## 上架到 open.workbuddy.cn

1. 完成 Phase 35 本地验证
2. 打包所有技能为 .zip
3. 访问 https://open.workbuddy.cn
4. 完成实名认证
5. 上传技能包
6. 等待审核

详见 `docs/OPEN_WORKBUDDY_LAUNCH.md`

## 审核要求

- 安全扫描：无恶意代码
- AI 审核：描述准确，触发词明确
- 人工抽检：数据来源合法

## 分类建议

- 开发工具：技能审计、打包、注册等
- 区块链：链上查询、注册
- 数据分析：声誉分析、排行榜

## 许可证

MIT
