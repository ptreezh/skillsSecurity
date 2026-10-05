---
name: skill-publisher
display_name: 技能发布器
display_name_en: Skill Publisher
description: 将技能目录打包为符合 WorkBuddy 标准的 zip 包，并生成 manifest.yaml
description_zh: 将技能目录打包为符合 WorkBuddy 标准的 zip 包
description_en: Package skill directories into WorkBuddy-compliant zip packages with manifest.yaml
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---

# 技能发布器

## 技能简介

技能发布器是一个用于将本地技能目录打包为 WorkBuddy 平台标准格式的工具。它自动化了技能发布的打包流程，确保生成的 zip 包符合平台规范，包含必要的元数据和目录结构。

## 核心功能

### 1. 目录结构验证
- 检查 SKILL.md 文件存在
- 验证 references/ 目录结构
- 检查 scripts/ 目录可执行文件
- 确认 templates/ 目录完整性

### 2. 合规性检查
- 运行 skill-lint 进行静态检查
- 验证 frontmatter 字段完整性
- 检查 YAML 语法正确性
- 确保无敏感信息泄露

### 3. 清单生成
- 生成 manifest.yaml 清单文件
- 记录所有文件路径和校验和
- 包含技能元数据
- 标记可执行脚本

### 4. 打包发布
- 创建标准 zip 压缩包
- 保持目录结构完整性
- 生成发布清单
- 输出验证报告

## 打包流程

### 输入
- 技能目录路径
- 可选：输出目录路径
- 可选：版本号覆盖

### 执行步骤

1. **前置审计**
   - 调用 skill-auditor 进行合规检查
   - 修复发现的问题
   - 确认通过后方可继续

2. **目录结构验证**
   - 检查 SKILL.md 存在
   - 验证子目录结构
   - 确认文件权限正确

3. **生成 manifest.yaml**
   - 提取技能元数据
   - 计算文件校验和
   - 记录目录结构
   - 标记脚本类型

4. **创建 zip 包**
   - 按标准结构打包
   - 保持文件权限
   - 压缩优化
   - 生成发布清单

5. **输出验证**
   - 验证 zip 完整性
   - 检查文件数量
   - 确认大小符合要求
   - 生成验证报告

## 输出格式

### zip 包结构
```
skill-name-1.0.0.zip
├── SKILL.md
├── manifest.yaml
├── references/
│   └── guide.md
├── scripts/
│   └── run.sh
└── templates/
    └── template.yaml
```

### manifest.yaml 格式
```yaml
skill:
  name: skill-name
  version: 1.0.0
  display_name: 技能名称
  category: 开发工具
  author: Author Name

files:
  - path: SKILL.md
    size: 1234
    sha256: "abc123..."
  - path: references/guide.md
    size: 567
    sha256: "def456..."

scripts:
  - path: scripts/run.sh
    executable: true

metadata:
  created_at: "2026-09-25T00:00:00Z"
  packed_by: skill-publisher 1.0.0
```

### 发布清单
```
=== 技能发布清单 ===
技能名称: skill-name
版本号: 1.0.0
打包时间: 2026-09-25 00:00:00

文件列表:
  SKILL.md (1.2 KB)
  references/guide.md (567 B)
  scripts/run.sh (234 B)
  templates/template.yaml (123 B)

总计: 4 个文件, 2.1 KB
校验和: sha256:abc123...
状态: 就绪
```

## 使用示例

### 示例 1: 打包单个技能

用户说："打包 skills/my-skill/ 目录"

1. 验证目录结构
2. 运行 skill-lint 检查
3. 生成 manifest.yaml
4. 创建 my-skill-1.0.0.zip
5. 输出发布清单

### 示例 2: 指定版本打包

用户说："打包 skills/my-skill/，版本 2.0.0"

1. 识别版本参数
2. 更新 manifest.yaml
3. 创建 my-skill-2.0.0.zip
4. 输出发布清单

### 示例 3: 批量打包

用户说："打包 skills/ 目录下所有技能"

1. 遍历 skills/ 子目录
2. 对每个技能执行打包
3. 生成批量发布清单
4. 标记失败项

### 示例 4: 验证已打包文件

用户说："验证 my-skill-1.0.0.zip 完整性"

1. 读取 zip 文件
2. 解析 manifest.yaml
3. 验证文件校验和
4. 输出验证报告

## 触发词

打包技能、发布技能、skill publish、打包为 zip、publish skill、创建技能包、技能打包、skill package

## 注意事项

1. **前置要求**：必须先通过 skill-auditor 审计
2. **文件限制**：zip 包大小不超过 3MB
3. **命名规范**：文件名格式：`{name}-{version}.zip`
4. **敏感信息**：禁止包含 API key、密码等敏感信息
5. **清单文件**：manifest.yaml 必须包含在 zip 根目录
6. **平台适配**：针对 WorkBuddy 平台标准设计

## 与其他技能的关系

- **依赖 skill-auditor**：打包前必须先通过审计
- **被 workbuddy-skill-deployer 调用**：作为发布流程的一步
- **配合使用**：skill-auditor → skill-publisher → workbuddy-skill-deployer

## 常见问题

### Q: 打包失败怎么办？
A: 检查 skill-auditor 输出，修复所有 critical 和 high 级别问题后重试。

### Q: manifest.yaml 包含什么？
A: 技能元数据、文件列表、校验和、脚本标记、打包时间戳。

### Q: zip 包大小限制？
A: WorkBuddy 平台限制 3MB，建议控制在 1MB 以内。

### Q: 如何验证打包结果？
A: 使用 skill-auditor 审计生成的 zip 包，或手动解压检查结构。
