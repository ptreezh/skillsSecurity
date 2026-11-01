# Findings: Cross-Platform Skill Package Research

## Platform Formats Researched

### 1. WorkBuddy / CodeBuddy (Tencent)
- **Plugin root**: `.codebuddy-plugin/plugin.json` or `.workbuddy-plugin/plugin.json`
- **Skills**: `skills/<name>/SKILL.md` with YAML frontmatter
- **Agents**: `agents/<name>.md` with YAML frontmatter (name, description, model, effort, maxTurns, tools, etc.)
- **MCP**: `.mcp.json` at root
- **Hooks**: `hooks/hooks.json`
- **Settings**: `settings.json`
- **Key fields in SKILL.md frontmatter**: name, description, allowed-tools, disable-model-invocation, user-invocable, context, model, agent
- **Discovery**: Auto-discovered from default locations, or via plugin.json paths
- **Namespace**: Plugin name prefixes skill names (`/plugin-name:skill-name`)

### 2. Doubao / 豆包 (ByteDance)
- **Skill dirs**: `.user_skills/<name>/SKILL.md`
- **SKILL.md frontmatter**: name, description, disable-model-invocation (optional)
- **Subdirs**: references/, scripts/, assets/
- **Trigger mechanism**: Model pickup based on description matching
- **Connectors**: MCP-based, configured via GUI
- **Work Partners**: Pre-built agents with system prompts + tool sets + skill combinations
- **Key characteristic**: Skills are "instruction manuals" not executable plugins
- **No plugin.json**: Skills auto-discovered from `.user_skills/`

### 3. Coze / 扣子 (ByteDance)
- **Package format**: `.skill` or `.zip` containing `SKILL.md`
- **Skill structure**: `SKILL.md` + `references/`, `scripts/`, `assets/`
- **Plugin components**: Skill + MCP + Panel
- **Agent Plugins 1.0 support**: Can import from Codex/Claude Code
- **Skill types**: Pure Skill, Pure MCP, Skill + MCP
- **Panel**: UI components for interactive plugins
- **Credential management**: Developer variables vs Consumer variables
- **Upload limit**: <500MB compressed

### 4. Claude Code (Anthropic)
- **Plugin dir**: `.claude-plugin/plugin.json`
- **Skills**: `skills/<name>/SKILL.md`
- **Agents**: `agents/<name>.md`
- **Commands**: `commands/<name>.md`
- **Hooks**: `hooks/hooks.json`
- **MCP**: `.mcp.json`
- **Key difference from WorkBuddy**: Separate commands/ dir, different frontmatter fields

### 5. Agent Plugins 1.0.0 (Open Standard - Vercel/Amazon/Microsoft/OpenAI/Google)
- **Schema**: `$schema: https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`
- **Manifest fields** (exactly 10): $schema, name, version, description, author, homepage, repository, license, keywords, extensions
- **Portable core**: `skills/` + `mcp.json` only
- **Client-specific extensions**: Reverse-domain namespaces (e.g., `com.example.client/`)
- **No install mechanism, no permissions, no provenance in v1**
- **Skills**: Same `SKILL.md` format as Anthropic
- **MCP**: Explicit type on every entry, supports stdio/streamable-http/legacy HTTP+SSE

### 6. Qwen / 通义千问 (Alibaba)
- **Format**: Not fully documented in search results
- **Likely similar to**: OpenAI function calling schema or custom JSON format
- **Agent definition**: JSON with system_prompt, tools, functions
- **Skill definition**: JSON schema with name, description, parameters, function

## Common Denominators

All platforms share:
1. **SKILL.md** as the core skill definition (Markdown + YAML frontmatter)
2. **references/**, **scripts/**, **assets/** as bundled resources
3. **Agent definitions** as Markdown or JSON files
4. **Plugin/manifest** metadata files (varying formats)

## Key Differences

| Aspect | WorkBuddy | Doubao | Coze | Claude Code | Agent Plugins 1.0 |
|--------|-----------|--------|------|-------------|-------------------|
| Manifest | plugin.json | None | .skill/.zip | plugin.json | plugin.json (closed schema) |
| Skill discovery | Directory + manifest | .user_skills/ | Upload/Skill store | skills/ dir | skills/ dir |
| Agent format | Markdown + frontmatter | Work Partners (GUI) | JSON config | Markdown + frontmatter | Not portable in v1 |
| MCP support | .mcp.json | Connectors (GUI) | MCP component | .mcp.json | mcp.json |
| Hooks | hooks/hooks.json | Not exposed | Not exposed | hooks/hooks.json | Not portable in v1 |
| Namespacing | Plugin prefix | None | None | None | None |

## FreeSkill Standard (Existing)

From `FREESKILL_STANDARD.md`:
- Adds `freeskill` block: fingerprint, creator, createdAt, ipfsHash, riskLevel, stakeRequired, attestationCount, auditTrail, standard, version
- Adds `responsibility` block: creator, verifiers, auditReport, liabilityDeclaration, scopeDeclaration
- Adds `antiSlash` block: enabled, slashRate, appealsPeriod
- Adds `humanAuth` block: required, confirmedBy

From `SKILLS_STANDARD.md`:
- Risk levels: LOW, MEDIUM, HIGH, CRITICAL
- Verification flow: self-check → submit → verify → on-chain
- Fingerprint: keccak256(ipfsHash || creator || timestamp)
- Reputation system with levels: Observer → Contributor → Verifier → Guardian → Elder

## Architecture Insight

The user's project already has:
1. **FreeSkill standard** - universal governance format
2. **WorkBuddy package** - concrete implementation example
3. **Smart contracts** - on-chain attribution and reputation
4. **Backend API** - skill upload, audit, chain submit

What's missing is the **cross-platform converter** that bridges external formats → FreeSkill → target platform.

## Resources

- WorkBuddy docs: https://www.workbuddy.ai/docs/cli/plugins
- CodeBuddy plugin reference: https://www.codebuddy.ai/docs/cli/plugins-reference
- Coze docs: https://docs.coze.cn/create-plugin
- Agent Plugins 1.0: https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- Google blog on Agent Plugins: https://developers.googleblog.com/agent-plugins-package-your-skills-tools-and-more/
