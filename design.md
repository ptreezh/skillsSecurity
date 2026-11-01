# Design Document: skill-packager-universal

## 1. Universal Intermediate Format: FreeSkill Enhanced

### 1.1 Canonical Schema

```json
{
  "$schema": "freeskill-enhanced/1.0.0",
  "freeskill": {
    "standard": "freeskill-enhanced",
    "version": "1.0.0",
    "fingerprint": "0x...",
    "creator": "0x...",
    "createdAt": 1714896000,
    "ipfsHash": "QmXxx...",
    "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
    "stakeRequired": 100,
    "attestationCount": 2,
    "auditTrail": [],
    "source": {
      "platform": "workbuddy|doubao|coze|qwen|trae|claude|agent-plugins|generic",
      "originalFormat": "plugin|skill|agent|rule",
      "uploadedAt": "2026-09-26T...",
      "originalHash": "sha256:..."
    }
  },
  "skill": {
    "name": "skill-name",
    "displayName": "技能名称",
    "description": "功能描述",
    "category": "开发工具|数据分析|...",
    "version": "1.0.0",
    "author": "Author Name",
    "license": "MIT",
    "homepage": "https://...",
    "repository": "https://github.com/...",
    "keywords": ["keyword1", "keyword2"],
    "trigger": {
      "description": "触发条件描述",
      "keywords": ["关键词1", "关键词2"],
      "excludePatterns": ["不触发场景"]
    },
    "content": {
      "body": "SKILL.md 正文（Markdown）",
      "frontmatter": {
        "name": "skill-name",
        "description": "...",
        "allowed-tools": "Read, Write, Bash",
        "disable-model-invocation": false,
        "user-invocable": true,
        "context": "default|fork",
        "model": "inherit|sonnet|...",
        "agent": "general-purpose|Explore|..."
      }
    },
    "resources": {
      "scripts": ["scripts/script1.py", "scripts/script2.sh"],
      "references": ["references/ref1.md", "references/ref2.md"],
      "assets": ["assets/template.json", "assets/image.png"]
    },
    "execution": {
      "inputContract": "输入契约描述",
      "executionProtocol": "执行协议描述",
      "failureHandling": "失败处理描述",
      "outputContract": "输出契约描述"
    }
  },
  "agent": {
    "name": "agent-name",
    "description": "Agent 专长描述",
    "model": "sonnet|gpt-4|...",
    "effort": "medium|high|low",
    "maxTurns": 20,
    "tools": ["Read", "Write", "Bash"],
    "disallowedTools": ["Write", "Edit"],
    "skills": ["skill1", "skill2"],
    "memory": "none|session|persistent",
    "background": "background description",
    "isolation": "worktree|none",
    "systemPrompt": "Agent 系统提示词",
    "permissionMode": "default|acceptEdits|bypassPermissions|plan|ignore"
  },
  "mcp": {
    "servers": [
      {
        "name": "server-name",
        "type": "stdio|streamable-http|sse",
        "command": "node",
        "args": ["server.js"],
        "env": {"API_KEY": "${ENV_VAR}"},
        "transport": "stdio",
        "enabled": true
      }
    ]
  },
  "hooks": {
    "events": [
      {
        "event": "UserPromptSubmit|PreToolUse|PostToolUse|...",
        "command": "./scripts/hook.sh",
        "type": "command|prompt"
      }
    ]
  },
  "rules": {
    "files": [
      {
        "path": "rules/rule-name.md",
        "alwaysApply": false,
        "description": "规则描述",
        "globs": ["*.ts", "*.js"],
        "scene": "git_message|default"
      }
    ]
  },
  "responsibility": {
    "creator": "创建者签名",
    "verifiers": ["验证者地址列表"],
    "auditReport": "IPFS哈希",
    "liabilityDeclaration": "责任声明文本",
    "scopeDeclaration": "权限边界声明",
    "creditChain": [
      {
        "role": "creator|verifier|contributor|maintainer",
        "address": "0x...",
        "contribution": "贡献描述",
        "weight": 1.0,
        "timestamp": 1714896000
      }
    ]
  },
  "antiSlash": {
    "enabled": true,
    "slashRate": 0.5,
    "appealsPeriod": 7,
    "violationTypes": ["malicious_skill", "verifier_misconduct", "false_report"]
  },
  "humanAuth": {
    "required": ["stake", "submit", "publish"],
    "confirmedBy": "0x授权者地址",
    "multiSig": {
      "required": 2,
      "signers": ["0x...", "0x..."]
    }
  },
  "package": {
    "format": "zip",
    "compression": "deflate",
    "maxSize": "500MB",
    "includeChecksums": true,
    "includeSignature": false
  }
}
```

### 1.2 Design Principles

1. **Round-trip fidelity**: Parse → Normalize → Generate should preserve 100% of semantic content
2. **Progressive disclosure**: Core fields always present, platform-specific fields in extensions
3. **Governance by default**: Credit/responsibility chains included but can be stripped for target platforms
4. **Extensible**: New platforms add adapters without changing core format

## 2. Pipeline Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Entry Point                           │
│                    skill-packager-universal                      │
│                                                                  │
│  Commands:                                                       │
│    parse <input> [--platform <name>]                            │
│    enrich <input> [--add-credit-chain]                          │
│    convert <input> --to <platform> [--with-governance]          │
│    validate <package> [--platform <name>]                       │
│    inspect <input>                                              │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Parser Layer  │  │  Enricher Layer │  │  Generator Layer│
│                 │  │                 │  │                 │
│ workbuddy_parser│  │ credit_chain_   │  │ workbuddy_      │
│ doubao_parser   │  │ enricher        │  │ generator       │
│ coze_parser     │  │ responsibility_ │  │ doubao_         │
│ qwen_parser     │  │ enricher        │  │ generator       │
│ trae_parser     │  │ anti_slash_     │  │ coze_           │
│ claude_parser   │  │ enricher        │  │ generator       │
│ agent_parser    │  │ human_auth_     │  │ qwen_           │
│ generic_parser  │  │ enricher        │  │ generator       │
│                 │  │                 │  │ trae_           │
│                 │  │                 │  │ generator       │
│                 │  │                 │  │ claude_         │
│                 │  │                 │  │ generator       │
│                 │  │                 │  │ agent_          │
│                 │  │                 │  │ generator       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 2.2 Adapter Interface

Each platform adapter implements:

```python
class PlatformAdapter(ABC):
    @abstractmethod
    def detect(self, input_path: Path) -> bool:
        """Return True if this adapter can handle the input"""
        pass

    @abstractmethod
    def parse(self, input_path: Path) -> FreeSkillEnhanced:
        """Parse platform-specific format → universal format"""
        pass

    @abstractmethod
    def generate(self, universal: FreeSkillEnhanced, output_path: Path, options: dict) -> None:
        """Generate target platform package from universal format"""
        pass

    @abstractmethod
    def validate(self, package_path: Path) -> ValidationResult:
        """Validate generated package against platform schema"""
        pass

    @abstractmethod
    def get_manifest_template(self) -> dict:
        """Return platform-specific manifest template"""
        pass
```

### 2.3 Enrichment Modules

Each enrichment module is optional and composable:

```python
class Enricher(ABC):
    @abstractmethod
    def enrich(self, universal: FreeSkillEnhanced, config: dict) -> FreeSkillEnhanced:
        """Add governance metadata to universal format"""
        pass

class CreditChainEnricher(Enricher):
    def enrich(self, universal, config):
        # Add contributor attribution, weights, timestamps
        pass

class ResponsibilityChainEnricher(Enricher):
    def enrich(self, universal, config):
        # Add liability declarations, scope, verifiers
        pass

class AntiSlashEnricher(Enricher):
    def enrich(self, universal, config):
        # Add punishment rules, appeals period
        pass

class HumanAuthEnricher(Enricher):
    def enrich(self, universal, config):
        # Add human confirmation checkpoints
        pass
```

## 3. CLI Tool Structure

```
skill-packager-universal/
├── pyproject.toml
├── README.md
├── src/
│   └── skill_packager/
│       ├── __init__.py
│       ├── cli.py                 # Entry point (Click/Typer)
│       ├── pipeline.py            # Core pipeline orchestration
│       ├── universal/
│       │   ├── __init__.py
│       │   ├── schema.py          # FreeSkill Enhanced schema (Pydantic)
│       │   ├── validator.py       # Schema validation
│       │   └── serializer.py      # JSON/YAML serialization
│       ├── parsers/
│       │   ├── __init__.py
│       │   ├── base.py            # Abstract base adapter
│       │   ├── workbuddy.py       # WorkBuddy/CodeBuddy parser
│       │   ├── doubao.py          # Doubao parser
│       │   ├── coze.py            # Coze parser
│       │   ├── qwen.py            # Qwen parser
│       │   ├── trae.py            # Trae parser
│       │   ├── claude.py          # Claude Code parser
│       │   ├── agent_plugins.py   # Agent Plugins 1.0 parser
│       │   └── generic.py         # Generic SKILL.md parser
│       ├── enrichers/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── credit_chain.py
│       │   ├── responsibility.py
│       │   ├── anti_slash.py
│       │   └── human_auth.py
│       ├── generators/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── workbuddy.py
│       │   ├── doubao.py
│       │   ├── coze.py
│       │   ├── qwen.py
│       │   ├── trae.py
│       │   ├── claude.py
│       │   ├── agent_plugins.py
│       │   └── generic.py
│       └── utils/
│           ├── __init__.py
│           ├── zip_utils.py       # ZIP creation/extraction
│           ├── hash_utils.py      # SHA-256, keccak256
│           ├── ipfs_utils.py      # IPFS upload (optional)
│           └── contract_utils.py   # Smart contract interaction (optional)
├── tests/
│   ├── __init__.py
│   ├── test_parsers/
│   ├── test_enrichers/
│   ├── test_generators/
│   ├── test_pipeline.py
│   └── fixtures/
│       ├── workbuddy_sample/
│       ├── doubao_sample/
│       ├── coze_sample/
│       └── ...
├── docs/
│   ├── architecture.md
│   ├── adapters.md
│   ├── governance.md
│   └── cli.md
└── examples/
    ├── input_samples/
    └── output_samples/
```

## 4. Implementation Phases (Detailed)

### Phase 2: FreeSkill Enhanced Schema
- Define Pydantic models for canonical format
- Write schema validation tests
- Document extension points for platform-specific fields

### Phase 3: Pipeline Architecture
- Implement `Pipeline` class with pluggable stages
- Define adapter interface
- Create registry for auto-detection

### Phase 4: CLI Tool
- Implement CLI with Click/Typer
- Commands: parse, enrich, convert, validate, inspect
- Progress bars, error handling, logging

### Phase 5: Platform Adapters (MVP: 2 adapters)
1. **WorkBuddy**: Full support (parser + generator)
2. **Doubao**: Full support (parser + generator)
3. Coze, Qwen, Trae, Claude Code, Agent Plugins 1.0

### Phase 6: Governance Enrichment
- Implement all 4 enrichers
- Integration with existing smart contracts (optional)
- CLI flags: `--with-governance`, `--no-anti-slash`, etc.

### Phase 7: Package Builder
- ZIP creation with platform-specific structures
- Manifest generation
- Checksum verification

### Phase 8: Testing
- Round-trip tests for each adapter
- Cross-platform compatibility tests
- Governance enrichment tests

### Phase 9: Documentation
- User guide
- Adapter development guide
- Governance enrichment guide

## 5. Feasibility Assessment

### 5.1 Existing Assets to Reuse

| Asset | Location | Reuse |
|-------|----------|-------|
| FreeSkill Standard | FREESKILL_STANDARD.md | ✅ Direct schema basis |
| Skills Standard | SKILLS_STANDARD.md | ✅ Risk levels, verification flow |
| WorkBuddy Package | agentskills-workbuddy-package/ | ✅ Reference implementation |
| Smart Contracts | contracts/ | ✅ Optional on-chain integration |
| Backend API | server/index.js | ✅ Optional upload endpoint |
| packager.py | agentskills-workbuddy-package/tools/ | ✅ Reference for ZIP logic |
| skill_lint.py | agentskills-workbuddy-package/tools/ | ✅ Reference for validation |

### 5.2 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Platform formats undocumented | Medium | Use reverse engineering + community samples |
| Governance fields break platform packages | Low | Make enrichment optional, strip if needed |
| Large ZIP files (>500MB for Coze) | Low | Streaming unzip, size warnings |
| Smart contract integration complexity | Low | Make optional, fallback to local JSON |

### 5.3 Feasibility Score: 9/10

**Highly feasible** because:
1. All platforms share `SKILL.md` core format
2. FreeSkill standard already defines governance schema
3. Existing WorkBuddy package proves the concept
4. Python ecosystem has excellent ZIP/JSON/YAML libraries
5. Adapter pattern well-suited for multi-platform support

## 6. Example Usage Flow

```bash
# 1. User uploads a WorkBuddy plugin
$ skill-packager-universal convert ./my-workbuddy-plugin --to doubao --with-governance

# 2. Tool parses WorkBuddy format
# 3. Normalizes to FreeSkill Enhanced
# 4. Enriches with credit chain and responsibility chain
# 5. Generates Doubao-compatible package
# 6. Output: ./my-workbuddy-plugin-doubao.zip

# Inspect intermediate format
$ skill-packager-universal inspect ./my-workbuddy-plugin
# Shows: FreeSkill Enhanced JSON with all governance fields

# Validate before generating
$ skill-packager-universal validate ./my-workbuddy-plugin --platform workbuddy

# Batch conversion
$ skill-packager-universal convert ./skill.zip --to all --with-governance
# Generates packages for all 8 platforms
```

## 7. Governance Enrichment Details

### 7.1 Credit Chain
```json
"creditChain": [
  {
    "role": "creator",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38",
    "name": "Original Author",
    "contribution": "Initial skill creation",
    "weight": 1.0,
    "timestamp": 1714896000,
    "signature": "0xabc123..."
  },
  {
    "role": "adapter",
    "address": "0x...",
    "name": "Platform Adapter",
    "contribution": "Cross-platform conversion",
    "weight": 0.1,
    "timestamp": 1714982400,
    "signature": "0xdef456..."
  }
]
```

### 7.2 Responsibility Chain
```json
"responsibility": {
  "creator": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38",
  "verifiers": ["0x...", "0x..."],
  "auditReport": "QmXxx...",
  "liabilityDeclaration": "This skill is provided as-is...",
  "scopeDeclaration": "This skill only operates on...",
  "riskLevel": "LOW",
  "insurance": {
    "enabled": false,
    "provider": null,
    "coverage": null
  }
}
```

### 7.3 Anti-Slash
```json
"antiSlash": {
  "enabled": true,
  "slashRate": 0.5,
  "appealsPeriod": 7,
  "violationTypes": [
    {
      "type": "malicious_skill",
      "punishment": "reputation_loss:500, stake_confiscation:true",
      "evidenceRequired": "multi_layer"
    }
  ]
}
```

## 8. File Naming Convention

| File | Purpose |
|------|---------|
| `task_plan.md` | Overall phases and progress |
| `findings.md` | Research notes and platform analysis |
| `design.md` | This file - architecture and design |
| `progress.md` | Session log and test results |

## 9. 链上集成方案：不违背商店审核

### 9.1 核心原则

**链上注册 ≠ 替代审核，而是审核后的补充动作。**

```
用户开发技能
    ↓
工具转换 + 治理增强（本地）
    ↓
上传到商店（WorkBuddy/Doubao/Coze/Qwen/Trae/Claude）
    ↓
商店安全审核（中心化，必需）
    ↓
审核通过 ←── 这里是触发点
    ↓
平台调用链上注册 API（或用户手动触发）
    ↓
链上记录：skillId + txHash + auditReportHash + platform + approvedAt
```

### 9.2 三种集成模式

| 模式 | 触发时机 | 实现方式 | 适用场景 |
|------|----------|----------|----------|
| **A: 平台 Webhook** | 商店审核通过后自动触发 | 平台调用 `/api/chain/register` | 有 webhook 的平台（Coze、WorkBuddy） |
| **B: 用户手动确认** | 用户收到审核通过通知后手动触发 | CLI `skill-packager chain register <package>` | 所有平台 |
| **C: 后台轮询** | 工具定期查询商店审核状态 | 轮询商店 API + 自动上链 | 有开放 API 的平台 |

### 9.3 链上记录内容

```json
{
  "skillId": 42,
  "txHash": "0xabc123...",
  "blockNumber": 12345,
  "platform": "coze",
  "platformSkillId": "coze-skill-789",
  "audit": {
    "auditor": "coze-platform",
    "auditReportHash": "QmXxx...",
    "approvedAt": "2026-09-26T10:00:00Z",
    "auditLevel": "standard"
  },
  "creator": "0x742d...",
  "submitter": "0x3737...",
  "chainId": "chain1",
  "contractAddress": "0x..."
}
```

### 9.4 安全设计

1. **审核验证**：链上注册 API 必须验证商店审核凭证
   - Webhook 签名验证
   - 平台 API 凭证验证
   - 审核状态查询

2. **不可篡改**：链上记录一旦写入，无法修改
   - 如果商店撤销审核，链上记录仍保留（可标记为 revoked）

3. **隐私保护**：
   - 技能内容不上链（仅存 IPFS hash）
   - 审核报告可选择是否公开

### 9.5 与现有后端的对接

现有后端 `/api/chain` 已实现：
- ✅ 需要认证（`auth.requireAuth`）
- ✅ 检查 job.status === 'approved'
- ✅ 调用 ChainMaker 链上注册

缺失的部分（需要新增）：
- ❌ Webhook 接收端点（平台通知审核通过）
- ❌ 平台凭证验证
- ❌ 链上记录与平台 skillId 的关联

### 9.6 推荐的 MVP 实现

```
阶段1（当前）：
  - 工具生成含 freeskill 元数据的技能包
  - 用户上传到商店
  - 商店审核
  - 用户手动运行 `skill-packager chain register <package>` 完成上链

阶段2（增强）：
  - 工具提供 webhook 服务器
  - 平台配置 webhook URL
  - 审核通过 → webhook → 自动上链

阶段3（完整）：
  - 平台 SDK/CLI 集成
  - 一键发布 + 上链
```

## 10. 技能存证链服务（Skill Proof Chain Service）

### 10.1 定位

本服务不是“跨平台格式转换器”，而是**技能生命周期中的存证与溯源基础设施**。

- 允许二创、fork、修改、再发布
- 每次 fork / modify / translation / extension 都上链记录
- 为原创者、二创作者、审核者、贡献者提供不可篡改的 attribution
- 支持 lineage 查询、证据包下载、声誉自动分配

### 10.2 核心原则

| 原则 | 说明 |
|------|------|
| **不禁止二创** | fork / modify / translation / extension 全部允许 |
| **自动溯源** | 二创技能自动继承 parentFingerprint / parentSkillId |
| **贡献者 attribution** | 所有参与者按权重记录到链上 |
| **链上不可篡改** | 一旦注册，记录不可修改，仅可追加 |
| **平台无关** | 不依赖任何单一商店的审核体系 |

### 10.3 Fork 类型

```typescript
enum ForkType {
  ORIGINAL = "original",       // 原创
  FORK = "fork",               // 直接 fork，内容基本一致
  MODIFY = "modify",           // 修改后 fork
  TRANSLATION = "translation", // 翻译
  EXTENSION = "extension"      // 功能扩展
}
```

### 10.4 链上数据模型

```json
{
  "skillId": 42,
  "name": "data-analyzer-v2",
  "fingerprint": "0xabc...",
  "parentSkillId": 41,
  "parentFingerprint": "0xparent...",
  "forkType": "modify",
  "creator": "0x742d...",
  "contributors": [
    {
      "address": "0x742d...",
      "role": "originator",
      "weight": 1.0,
      "skillId": 41,
      "contribution": "Original creation"
    },
    {
      "address": "0xfork...",
      "role": "modifier",
      "weight": 0.4,
      "skillId": 42,
      "contribution": "Added chart export"
    }
  ],
  "platform": "coze",
  "platformSkillId": "coze-789",
  "audit": {
    "auditor": "coze-platform",
    "auditReportHash": "QmXxx...",
    "approvedAt": "2026-09-26T10:00:00Z"
  },
  "timestamp": 1727356800,
  "txHash": "0x...",
  "blockNumber": 12345
}
```

### 10.5 Lineage 查询 API

```
GET /api/v1/skills/:id/lineage

Response:
{
  "skillId": 42,
  "name": "data-analyzer-v2",
  "ancestors": [
    {"skillId": 41, "name": "data-analyzer", "creator": "0x742d..."},
    {"skillId": 40, "name": "analyzer-base", "creator": "0xabc..."}
  ],
  "descendants": [
    {"skillId": 43, "name": "data-analyzer-chart", "creator": "0x123..."}
  ],
  "contributors": [
    {"address": "0x742d...", "role": "originator", "weight": 1.0},
    {"address": "0xfork...", "role": "modifier", "weight": 0.4}
  ],
  "depth": 2,
  "branchCount": 3
}
```

### 10.6 贡献权重规则

| 角色 | 权重 | 说明 |
|------|------|------|
| originator | 1.0 | 原始技能创建者 |
| forker | 0.3 | 直接 fork，内容变化小 |
| modifier | 0.4~0.7 | 修改后 fork，根据修改程度 |
| translator | 0.3 | 翻译 |
| extender | 0.5 | 功能扩展 |
| reviewer | 0.1 | 审核/验证者 |
| maintainer | 0.2 | 维护者 |

### 10.7 与现有后端的对接

现有后端已支持：
- ✅ ChainMaker 链上注册
- ✅ 技能上传/审核
- ✅ 用户认证

新增：
- ❌ fork 类型记录
- ❌ contributors 数组
- ❌ lineage 查询
- ❌ 证据包下载

### 10.8 证据包下载

```
GET /api/v1/skills/:id/receipt

Response: JSON
{
  "skillId": 42,
  "fingerprint": "0x...",
  "parentFingerprint": "0x...",
  "creator": "0x...",
  "contributors": [...],
  "txHash": "0x...",
  "blockNumber": 12345,
  "timestamp": 1727356800,
  "platform": "coze",
  "receiptUrl": "https://proof.example.com/receipts/42.json",
  "verification": {
    "originalHash": "sha256:...",
    "fingerprintMatch": true,
    "chainVerified": true
  }
}
```

## 11. MVP Scope

### 11.1 包含

- FreeSkill Enhanced schema (Pydantic)
- Pipeline: Parser → Normalizer → Enricher → Generator
- CLI: convert, inspect, validate, chain register
- 3 平台适配器: WorkBuddy, Doubao, Coze
- 4 治理增强器: credit_chain, responsibility, anti_slash, human_auth
- 链上集成: HTTP 后端 + Node.js 降级
- ZIP 打包 + 校验和
- 技能存证链服务：register / verify / lineage / receipt
- Fork 类型：ORIGINAL / FORK / MODIFY / TRANSLATION / EXTENSION
- Contributors attribution with weights

### 11.2 不包含

- Qwen, Trae, Claude Code, Agent Plugins 1.0 适配器（Phase 2）
- IPFS 上传（仅记录 hash）
- 图形界面
- 平台 webhook 自动触发（Phase 2）
- 智能合约部署工具

