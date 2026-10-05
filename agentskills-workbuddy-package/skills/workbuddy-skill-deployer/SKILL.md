---
name: workbuddy-skill-deployer
display_name: WorkBuddy 技能上架
display_name_en: WorkBuddy Skill Deployer
description: 将技能包发布到 open.workbuddy.cn，覆盖表单填写、分类选择、提交审核全流程
description_zh: 将技能包发布到 open.workbuddy.cn，覆盖表单填写、分类选择、提交审核全流程
description_en: Publish skill packages to open.workbuddy.cn, covering form filling, category selection, and review submission
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---

# WorkBuddy 技能上架

将本地技能包发布到 WorkBuddy 开放平台的完整流程。包含真实踩坑经验、表单操作细节、服务类目选择技巧和审核避坑指南。

## 触发词

上架技能、发布技能、workbuddy 发布、open.workbuddy.cn、提交审核、技能上链

## 前置检查

### 1. 技能包命名冲突检查
WorkBuddy 平台全局唯一校验技能名称。提交前必须确认：
- 打开 `SKILL.md`，检查 `name:` 字段
- 如果使用通用名如 `skill-auditor`、`skill-publisher`，大概率已被占用
- **解决**：加前缀，如 `agentskills-auditor`、`agentskills-publisher`

### 2. 必填字段检查
平台会校验 frontmatter，缺少任一必填字段都会导致解析失败：
- `name:` 全局唯一标识
- `display_name:` 中文展示名
- `display_name_en:` 英文展示名
- `description:` 一句话描述
- `description_zh:` 中文描述
- `description_en:` 英文描述（极易遗漏，必须填写）
- `category:` 市场展示分类，如 `开发工具`
- `version:` 版本号，如 `1.0.0`
- `author:` 作者

### 3. zip 包规范
- 格式：`.zip`，大小不超过 3MB
- 必须包含根级 `SKILL.md`
- 建议目录结构：
  ```
  skill-name/
  ├── SKILL.md
  ├── references/
  │   └── guide.md
  ├── scripts/
  │   └── run.sh
  └── templates/
      └── template.yaml
  ```

## 发布流程

### Step 1: 上传代码包

1. 登录 https://open.workbuddy.cn/expert/all
2. 点击「技能」标签
3. 点击「创建」按钮
4. 点击上传区域，选择 `.zip` 文件
5. 等待平台解析

**常见错误**：
- `缺少 Skill 英文描述（description_en）`：补全 frontmatter 后重新打包
- `技能名称 "xxx" 已被占用`：修改 `name:` 字段为唯一名称

### Step 2: 完善信息

平台自动解析技能包生成部分字段，需要人工补全标 `*` 的必填项。

#### 市场展示名称
- 在市场中展示的能力名称
- 建议与 `display_name` 保持一致
- 示例：`技能审计师`

#### 市场展示分类
- 点击 combobox 展开分类列表
- **必填**，最多选择 3 个
- 常用分类：`开发工具`、`效率工具`、`数据分析`
- 键盘操作：`ArrowDown` 选择 → `Enter` 确认

#### 服务类目（树形选择器）
这是最难自动化的字段，采用**两级树形结构**：
- 第一级：工具、商业服务、体育等
- 第二级：对应子类

**操作技巧**：
1. 点击「添加」或「请选择」展开树形选择器
2. `ArrowDown` 到父类目（如「工具」）
3. `ArrowRight` 展开子类
4. `ArrowDown` 到子类
5. `Enter` 确认选择

**如果键盘操作失败**：
- 使用 `bsk` 的 `click` 命令点击对应按钮
- 或手动在 Edge 浏览器中点击选择

#### 能力介绍
- 详细描述技能的功能、使用场景、触发词
- 建议 50-200 字，包含：
  - 核心功能
  - 适用场景
  - 触发条件

#### 版本号
- 与包内 `SKILL.md` 的 `version:` 保持一致
- 格式：`1.0.0`

### Step 3: 确认信息

核对平台解析的字段：
- 类型：技能
- 技能ID：平台生成
- 市场展示名称
- 市场展示分类
- 版本号
- 头像：默认或上传 512×512px JPG/PNG
- 类目：服务类目选择结果
- 介绍：能力介绍内容

### Step 4: 提交审核

1. 点击「提交」按钮
2. 平台显示：「已提交审核，预计 7 个工作日内出结果」
3. 审核状态可在「技能」列表查看

## 常见问题

### Q: 服务类目选择器无法点击？
A: WorkBuddy 使用自定义树形组件，自动化工具经常失效。优先键盘操作，失败则手动选择。

### Q: description_en 字段有什么要求？
A: 必须填写英文描述，与 `description` 内容对应。平台会校验该字段存在。

### Q: 技能名称被占用怎么办？
A: 修改 `SKILL.md` 中的 `name:` 字段，加前缀后重新打包上传。

### Q: 审核需要多久？
A: 平台提示 7 个工作日，实际通常 1-3 天。

## 自动化脚本

### 使用 BrowserSkill (bsk) 自动化

```bash
# 1. 启动 BrowserSkill 会话
bsk session start

# 2. 导航到技能列表
bsk navigate --session <id> 'https://open.workbuddy.cn/expert/all'

# 3. 点击技能标签
bsk click --session <id> --ref e8

# 4. 点击创建
bsk click --session <id> --ref e19

# 5. 上传 zip 包
bsk upload --session <id> --file <zip路径> --selector 'input[type="file"]'

# 6. 填写表单（市场分类、服务类目等）
# 使用 click/press 命令操作表单

# 7. 提交审核
bsk click --session <id> --ref <submit按钮ref>
```

### 检查表单状态
```bash
bsk snapshot --session <id> --json
```

## 最佳实践

1. **先本地验证**：上传前用 `skill-auditor` 审计，确保 frontmatter 完整
2. **唯一命名**：所有技能 `name:` 加项目前缀，避免全局冲突
3. **详细描述**：`description_en` 和 `description_zh` 各写 2-3 句话，说明功能和场景
4. **分类准确**：选择与技能功能最匹配的市场展示分类和服务类目
5. **保留截图**：提交后截图保存，便于跟踪审核状态

## 参考文件

- `references/workbuddy-platform-notes.md`：平台具体规则和限制
- `references/common-errors.md`：常见错误代码和解决方案
