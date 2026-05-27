# 论文投稿指南

**论文标题:** Responsibility Vacuum in Agent Skill Ecosystems: An Exploratory Anticipatory Governance Framework from the Pacing Problem Perspective

**作者:** 张树人 (Shuren Zhang)  
**单位:** 杭州师范大学阿里巴巴商学院  
**日期:** 2026年5月

---

## 一、文件准备清单

| 文件 | 状态 | 路径 |
|------|------|------|
| 主论文 | ✅ 完成 | `paper-draft-en.md` |
| 投稿信模板 | ✅ 完成 | `paper-submission/cover-letter-template.md` |
| 投稿检查清单 | ✅ 完成 | `paper-submission/SUBMISSION-CHECKLIST.md` |

### 生成 PDF 方法

```bash
# 方法1: pandoc + xelatex (需要安装 LaTeX)
pandoc paper-draft-en.md -o paper-draft-en.pdf --pdf-engine=xelatex -V geometry:margin=1in

# 方法2: pandoc + wkhtmltopdf
pandoc paper-draft-en.md -o paper-draft-en.html
wkhtmltopdf paper-draft-en.html paper-draft-en.pdf

# 方法3: 复制到 Word 排版 (推荐)
# 1. 复制 paper-draft-en.md 内容到 Word
# 2. 调整格式: 字体 Times New Roman 12pt, 双倍行距
# 3. 导出为 PDF

# 方法4: typst (现代替代方案)
# https://github.com/nicolo-ribaudo/typst/releases
```

**注意:** 如需生成高质量 PDF，建议使用 Word 排版后导出，包含图表和格式设置。

---

## 二、预印版发布 (arXiv)

### 为什么先发布预印版？

1. **确立优先权** - arXiv 时间戳证明你先发表
2. **获取反馈** - 社区评审帮助改进
3. **提高可见度** - 早期曝光增加引用机会
4. **符合期刊政策** - 大多数期刊接受已发布预印本

### arXiv 投稿步骤

1. **注册账号:** https://arxiv.org/auth
2. **准备 PDF:** 生成论文 PDF
3. **上传论文:**
   - 选择类别: Computer Science > cs.SI (Social and Information Networks)
   - 或: cs.AI (Artificial Intelligence)
4. **填写信息:** 标题、摘要、作者、分类
5. **提交审核:** 通常 24-48 小时通过

---

## 三、期刊推荐

### 推荐优先级排序

#### 第一梯队 (强烈推荐)

| 期刊 | 推荐理由 |
|------|----------|
| **European Journal of Information Systems (EJIS)** | 匹配度最高，AI governance 主题，UK 信息系统学会会刊，审稿周期 6-9 月 |
| **Telecommunications Policy** | 政策研究导向，governance 主题，Elsevier 出版，审稿周期 4-6 月 |

#### 第二梯队 (推荐)

| 期刊 | 推荐理由 |
|------|----------|
| **Information Systems Frontiers** | Springer，AI governance 相关，审稿周期 3-5 月，中国学者友好 |
| **Electronic Markets** | 平台研究，新兴技术治理主题 |
| **Computers & Security** | 安全期刊，skill supply chain 主题直接相关 |

#### 第三梯队 (可选)

| 期刊 | 说明 |
|------|------|
| **Science and Engineering Ethics** | 科技伦理主题 |
| **AI & Society** | AI 社会影响 |
| **Information Systems Journal** | 欧洲 IS 期刊 |

---

## 四、投稿具体步骤

### Step 1: 发布 arXiv 预印版

```
1. 访问 https://arxiv.org
2. 注册账号 (用机构邮箱)
3. 上传 PDF 和 LaTeX 源文件
4. 选择分类: cs.SI 或 cs.AI
5. 提交，等待审核
```

### Step 2: 选择目标期刊

**推荐从 EJIS 开始:**

- 匹配度最高
- 审稿周期适中 (6-9 月)
- 中国学者发表较多

### Step 3: 生成最终 PDF

```bash
# 检查论文格式
# - 双倍行距
# - 页码
# - 作者信息只在封面页
# - 图表分辨率 ≥ 300 DPI
```

### Step 4: 准备 Cover Letter

使用模板: `paper-submission/cover-letter-template.md`

修改内容:
- [Journal Name] → 目标期刊名
- 调整相关性描述

### Step 5: 在线提交

主流投稿系统:
- **ScholarOne** (Elsevier 期刊)
- **Editorial Express** (MISQ, ISR)
- **Evise** (Elsevier)
- **JESP** (Springer)

### Step 6: 跟踪审稿状态

- 注册 ORCID: https://orcid.org
- 设置邮件提醒
- 准备回复审稿意见

---

## 五、时间线建议

```
Day 0-1:   发布 arXiv 预印版
Day 2-3:   生成最终 PDF
Day 4-5:   准备 Cover Letter
Day 6:     提交 EJIS

Month 1:   等待初审
Month 2:   收到审稿意见 (如有)
Month 3-4: 返修
Month 5-6: 接收
```

---

## 六、当前完成状态

| 任务 | 状态 |
|------|------|
| 论文主体 | ✅ 完成 |
| 作者信息 | ✅ 完成 |
| 表格格式优化 | ✅ 完成 |
| Cover Letter 模板 | ✅ 完成 |
| 投稿清单 | ✅ 完成 |
| arXiv 发布 | ⬜ 待执行 |
| PDF 生成 | ⬜ 待执行 |
| 期刊选择 | ⬜ 待定 |

---

## 七、下一步行动

1. **生成 PDF** - 使用 pandoc 或 Word
2. **注册 arXiv** - 上传预印版
3. **选定期刊** - 推荐从 EJIS 开始
4. **正式投稿** - 按上述步骤

---

*最后更新: 2026-05-24*