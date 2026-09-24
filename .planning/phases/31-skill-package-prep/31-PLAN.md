# Phase 31：技能包结构标准化与最小可发布单元准备
> Milestone: v3.0 | Phase: 31 | Status: planning

## 需求映射
REQ-31：技能包结构标准化

## 目标
建立统一的技能包模板，确保所有后续 SKILL 开发遵循 WorkBuddy 规范，且具备可验证的独立运行能力。

## 任务分解

### Task 31-01：建立技能包模板仓库
**文件：** `agentskills-workbuddy-package/`
**内容：**
```
agentskills-workbuddy-package/
├── README.md                    # 项目说明
├── .codebuddy-plugin/
│   └── plugin.json              # WorkBuddy 专家智能体配置
├── avatars/                     # 头像占位目录
├── agents/                      # Agent 定义目录（占位）
├── skills/                      # SKILL 目录（占位）
│   └── template/                # 模板技能
│       ├── SKILL.md             # 模板 frontmatter + 说明
│       ├── references/          # 参考资料占位
│       ├── scripts/             # 脚本占位
│       └── templates/           # 模板文件占位
├── connectors/                  # 连接器目录（占位）
│   └── template/                # 模板连接器
├── .mcp.json                    # MCP 依赖声明（占位）
└── settings.json                # WorkBuddy 设置（占位）
```

**验收标准：**
1. `skills/template/SKILL.md` frontmatter 包含所有必填字段（name, display_name, description, category, version, author）
2. `scripts/` 目录下至少有一个可独立运行的示例脚本（Python/Node）
3. `references/` 目录下至少有一个示例文档
4. `templates/` 目录下至少有一个示例模板文件

### Task 31-02：定义 SKILL.md 规范检查器
**文件：** `agentskills-workbuddy-package/tools/skill-lint.py`
**职责：**
- 校验 frontmatter 必填字段
- 校验 YAML 语法（冒号后空格、引号使用）
- 校验 scripts/ 目录下脚本可执行性
- 校验 references/ 目录下文档存在性

**验收标准：**
1. `python tools/skill-lint.py skills/template/` 输出 `PASS`
2. 删除任意必填字段时输出 `FAIL` 并指出缺失字段

### Task 31-03：定义打包规范
**文件：** `agentskills-workbuddy-package/tools/packager.py`
**职责：**
- 将技能目录打包为符合 WorkBuddy 规范的 .zip
- 生成 manifest.yaml（name, version, description, category, author）
- 验证 zip 内 SKILL.md 位置正确（根级或子目录）

**验收标准：**
1. `python tools/packager.py skills/template/` 生成 `template-1.0.0.zip`
2. 解压后结构符合 WorkBuddy 规范
3. manifest.yaml 内容正确

### Task 31-04：建立本地测试环境
**文件：** `agentskills-workbuddy-package/tests/`
**内容：**
- `test_skill_lint.py`：规范检查器测试
- `test_packager.py`：打包工具测试
- `test_template_skill.py`：模板技能加载测试

**验收标准：**
1. `pytest tests/` 全部通过
2. 测试覆盖率达到 80%+

## 依赖
- 无（Phase 31 是 v3.0 的第一个 Phase）

## 风险
| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| WorkBuddy 规范变更 | 中 | 中 | 参考最新官方文档，保持模板灵活可调整 |
| 模板过于复杂导致上手门槛高 | 中 | 中 | 保持最小可行模板，README 写清楚「如何使用」 |

## 工时估算
- Task 31-01：2 小时
- Task 31-02：3 小时
- Task 31-03：2 小时
- Task 31-04：3 小时
- **总计：10 小时**
