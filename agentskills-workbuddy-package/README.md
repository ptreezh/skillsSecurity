# AgentSkills WorkBuddy Package

将 AgentSkills 系统能力分解为 WorkBuddy 可消费的 SKILL + 专家智能体 + 连接器。

## 项目结构

```
agentskills-workbuddy-package/
├── .codebuddy-plugin/
│   └── plugin.json          # WorkBuddy 专家智能体配置
├── avatars/                 # 头像目录
├── agents/                  # Agent 定义目录
├── skills/                  # SKILL 目录
│   └── template/            # 模板技能
│       ├── SKILL.md
│       ├── references/
│       ├── scripts/
│       └── templates/
├── connectors/              # 连接器目录
│   └── template/
├── tools/                   # 开发工具
│   ├── skill-lint.py        # SKILL.md 规范检查器
│   └── packager.py          # 打包工具
├── tests/                   # 测试目录
├── .mcp.json                # MCP 依赖声明
└── settings.json            # WorkBuddy 设置
```

## 快速开始

### 1. 检查技能规范

```bash
python tools/skill-lint.py skills/template/
```

### 2. 打包技能

```bash
python tools/packager.py skills/template/
```

### 3. 在 WorkBuddy 中测试

1. 打开 WorkBuddy
2. 进入「导入技能」
3. 选择生成的 .zip 文件
4. 测试技能调用

## 开发新技能

1. 复制 `skills/template/` 目录
2. 修改 `SKILL.md` frontmatter 和正文
3. 在 `scripts/` 下添加可执行脚本
4. 在 `references/` 下添加参考资料
5. 运行 `skill-lint.py` 检查规范性
6. 运行 `packager.py` 打包

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
