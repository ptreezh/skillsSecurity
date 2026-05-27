# Paper Submission Checklist & Guide

## 论文投稿准备清单

**Title:** Responsibility Vacuum in Agent Skill Ecosystems: An Exploratory Anticipatory Governance Framework from the Pacing Problem Perspective

**Author:** Shuren Zhang (张树人)  
**Affiliation:** School of Alibaba Business, Hangzhou Normal University  
**Date:** May 2026

---

## 一、预印版发布文件清单 (arXiv / OSF)

### 预印版平台选择

| 平台 | 特点 | 推荐度 |
|------|------|--------|
| **arXiv** | 计算机/AI 领域最权威，知名度最高 | ⭐⭐⭐ |
| **OSF Preprints** | 跨学科，支持多领域，社会科学友好 | ⭐⭐⭐ |
| **SSRN** | 社会科学预印本，Elsevier 旗下 | ⭐⭐ |

### OSF Preprints 优势
- 跨学科包容性强
- 支持多种预印本服务器
- 免费、无强制要求
- 中国学者使用方便

### 必需文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `paper-draft-en.md` | ✅ 已复制 | 主论文 |
| `cover-letter-arxiv.md` | ✅ 已创建 | arXiv 投稿信 |
| `cover-letter-osf.md` | ✅ 已创建 | OSF 投稿信 |
| `README.md` | ✅ 已创建 | 说明文件 |
| `SUBMISSION-CHECKLIST.md` | ✅ 已创建 | 检查清单 |
| `SUBMISSION-GUIDE-CN.md` | ✅ 已创建 | 中文投稿指南 |

### 发布步骤 (OSF Preprints)

1. **注册账号** → https://osf.io
2. **创建预印本** → New Preprint
3. **选择服务器** → 选择合适的预印本服务器 (如 SOC ARXIV)
4. **上传文件** → 上传 PDF
5. **填写元数据** → 标题、摘要、作者、分类
6. **发布** → 立即发布或稍后发布

### 发布步骤 (arXiv)

1. **注册账号** → https://arxiv.org/auth
2. **准备 PDF** → pandoc paper-draft-en.md -o paper-draft-en.pdf
3. **上传论文**
   - 类别: Computer Science > Social and Information Networks 或 AI
   - 标题、摘要自动填充
4. **提交审核** (通常 24-48 小时通过)

---

## 二、期刊投稿文件清单

### 必需文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `paper-draft-en.pdf` | ✅ | 主论文 |
| `cover-letter.pdf` | ⬜ | 投稿信 |
| `highlights.pdf` | ⬜ | 亮点说明 (可选) |
| `GraphicalAbstract.pdf` | ⬜ | 图形摘要 (可选) |

### 投稿信内容要点 (Cover Letter)

```markdown
Dear Editor,

We submit our manuscript "Responsibility Vacuum in Agent Skill Ecosystems: 
An Exploratory Anticipatory Governance Framework from the Pacing Problem 
Perspective" for consideration for publication in [Journal Name].

This paper makes the following contributions:
1. Proposes and systematically defines "responsibility vacuum in agent skill ecosystems"
2. Explains the vacuum through Pacing Problem theory with cross-platform empirical evidence
3. Identifies the critical intervention window using Collingridge's Dilemma
4. Develops Responsibility Shield prototype and R-Skills governance standard

The paper addresses a timely topic - AI agent skill governance - that aligns with 
your journal's scope on technology governance and responsible AI.

Best regards,
Shuren Zhang
```

---

## 三、期刊推荐

### 推荐等级说明
- ⭐⭐⭐ 强烈推荐 (高度匹配)
- ⭐⭐ 推荐 (相关领域)
- ⭐ 可选 (边缘相关)

### A+ 类 (信息系统顶刊)

| 期刊 | 匹配度 | 说明 |
|------|--------|------|
| **MIS Quarterly (MISQ)** | ⭐⭐⭐ | IS 顶刊，偏好理论贡献，AI governance 相关 |
| **Information Systems Research (ISR)** | ⭐⭐⭐ | IS 顶刊，重视实证与方法创新 |
| **Journal of Management** | ⭐⭐ | 管理学顶刊，平台治理相关文章常见 |

### A 类 (信息系统重要期刊)

| 期刊 | 匹配度 | 说明 |
|------|--------|------|
| **European Journal of Information Systems (EJIS)** | ⭐⭐⭐ | UK 信息系统学会会刊，AI governance 友好 |
| **Journal of the Association for Information Systems (JAIS)** | ⭐⭐⭐ | IS 高影响期刊，Design Science 专长 |
| **Information Systems Journal (ISJ)** | ⭐⭐ | 欧洲 IS 期刊，理论与实证并重 |
| **Telecommunications Policy** | ⭐⭐ | 政策研究，governance 相关度高 |

### B 类 (AI/安全/治理相关)

| 期刊 | 匹配度 | 说明 |
|------|--------|------|
| **Science and Engineering Ethics** | ⭐⭐ | 科技伦理，Responsible AI 主题匹配 |
| **AI & Society** | ⭐⭐ | AI 社会影响，governance 话题 |
| **Computers & Security** | ⭐⭐ | 安全期刊，skill supply chain 主题 |

### 中国学者友好期刊

| 期刊 | 匹配度 | 说明 |
|------|--------|------|
| **Information Systems Frontiers** | ⭐⭐ | Springer，审稿周期适中 |
| **Electronic Markets** | ⭐⭐ | 平台研究，新兴技术治理 |

---

## 四、投稿步骤详解

### Step 1: 选择期刊 (建议排序)

```
推荐优先级 (2026 年时效性):
1. EJIS (European Journal of Information Systems) - 周期 6-9 月
2. Telecommunications Policy - 周期 4-6 月
3. Information Systems Frontiers - 周期 3-5 月
```

### Step 2: 格式检查

| 检查项 | 说明 |
|--------|------|
| 双盲审稿格式 | 删除作者信息（已在 cover page） |
| 行距 | 通常 double-spaced |
| 图表 | 分辨率 ≥ 300 DPI |
| 参考文献 | 按期刊格式 |

### Step 3: 在线投稿

主流期刊系统:
- **ScholarOne** (Elsevier, Wiley)
- **Editorial Express** (MISQ)
- **Evise** (Elsevier)
- **JESP** (Springer)

### Step 4: 跟踪状态

- 注册 ORCID
- 设置邮件提醒
- 准备回复审稿意见

---

## 五、投稿注意事项

### 5.1 预印版 vs 正式投稿

| 平台 | 说明 |
|------|------|
| **arXiv** | 预印本，推荐先发布再投稿 |
| **SSRN** | 社会科学预印本 |
| **CNKI** | 中国知网，不推荐预印 |

### 5.2 投稿时间线

```
Day 0:    选定期刊，准备材料
Day 1-3:  生成 PDF，检查格式
Day 4-5:  发布 arXiv 预印版
Day 6:    提交期刊
Month 1:  等待初审结果
Month 2-4: 返修 (如需要)
Month 5-8: 接收发表
```

### 5.3 审稿周期参考

| 期刊类型 | 审稿周期 |
|----------|----------|
| 顶刊 (MISQ, ISR) | 3-6 月 |
| 重要期刊 (EJIS, ISJ) | 2-4 月 |
| 普通期刊 | 1-2 月 |

---

## 六、当前状态

| 任务 | 状态 |
|------|------|
| 论文终稿 (paper-draft-en.md) | ✅ 完成 |
| 作者信息 | ✅ 完成 |
| 表格格式优化 | ✅ 完成 |
| 封面作者页 | ✅ 完成 |
| Cover Letter (arXiv) | ✅ 完成 |
| Cover Letter (OSF) | ✅ 完成 |
| 投稿检查清单 | ✅ 完成 |
| 中文投稿指南 | ✅ 完成 |
| README 说明 | ✅ 完成 |
| 论文 DOCX 格式 | ✅ 完成 |
| 投稿信 DOCX 格式 | ✅ 完成 |
| PDF 生成 | ⬜ 待执行 |
| 预印版发布 | ⬜ 待执行 |
| 期刊选择 | ⬜ 待定 (推荐 EJIS) |

### 已生成的文件

| 文件 | 格式 | 路径 |
|------|------|------|
| 论文 | .md | `paper-draft-en.md` |
| 论文 | .docx | `paper-draft-en.docx` |
| arXiv 投稿信 | .docx | `cover-letter-arxiv.docx` |
| OSF 投稿信 | .docx | `cover-letter-osf.docx` |

---

## 七、下一步操作

1. **发布 arXiv 预印版** (推荐先做)
   ```
   pandoc paper-draft-en.md -o paper-draft-en.pdf
   # 或使用其他工具生成 PDF
   ```

2. **准备 Cover Letter** (模板见上方)

3. **选定目标期刊** (推荐从 EJIS 开始)

4. **正式投稿**

---

*最后更新: 2026-05-24*