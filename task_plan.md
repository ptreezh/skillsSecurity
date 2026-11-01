# Task Plan: Cross-Platform Skill/Agent Package Converter with Governance Enrichment

## Goal
Build a meta-skill/tool (`skill-packager-universal`) that:
1. Accepts user-uploaded skills/expert definitions from multiple agent platforms
2. Parses platform-specific formats into a universal intermediate format
3. Enriches with credit chains and responsibility chains (FreeSkill governance)
4. Generates platform-specific packages for local installation
5. Supports: WorkBuddy, Doubao, Coze, Qwen, Trae, Claude Code, and generic Agent Plugins 1.0

## Core Architecture: Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    skill-packager-universal                      │
│                                                                  │
│  Input (uploaded skill/agent package)                            │
│         ↓                                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐     │
│  │   PARSER    │───▶│  NORMALIZER │───▶│   ENRICHER      │     │
│  │             │    │             │    │                 │     │
│  │ Per-platform │    │ FreeSkill   │    │ + Credit Chain  │     │
│  │ format →    │    │ Enhanced    │    │ + Responsibility│     │
│  │ AST/JSON    │    │ (canonical) │    │ + Anti-Slash    │     │
│  └─────────────┘    └─────────────┘    └─────────────────┘     │
│         ↓                                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐     │
│  │  VALIDATOR  │◀───│  GENERATOR  │◀───│   PACKAGER      │     │
│  │             │    │             │    │                 │     │
│  │ Schema +    │    │ Per-target  │    │ ZIP + manifest  │     │
│  │ governance  │    │ platform    │    │ + checksums     │     │
│  │ check       │    │ adapter     │    │                 │     │
│  └─────────────┘    └─────────────┘    └─────────────────┘     │
│         ↓                                                        │
│  Output (installable package for target platform)                │
└─────────────────────────────────────────────────────────────────┘
```

## Phases

- [x] Phase 1: Platform Format Audit & Schema Mapping
- [ ] Phase 2: Universal Intermediate Format Design (FreeSkill Enhanced)
- [ ] Phase 3: Converter Pipeline Architecture
- [ ] Phase 4: CLI Tool Implementation
- [ ] Phase 5: Platform Adapters (Parser + Generator for each platform)
- [ ] Phase 6: Governance Enrichment Module (credit/responsibility chain)
- [ ] Phase 7: Package Builder & Validator
- [ ] Phase 8: Testing & Cross-Platform Verification
- [ ] Phase 9: Documentation & User Guide

## Platform Support Matrix

| Platform | Parser | Generator | Manifest | Notes |
|----------|--------|-----------|----------|-------|
| WorkBuddy/CodeBuddy | ✅ | ✅ | `.codebuddy-plugin/plugin.json` | Full support |
| Doubao | ✅ | ✅ | None (auto-discovery) | Skills as instruction manuals |
| Coze | ✅ | ✅ | `.skill`/`.zip` | Agent Plugins 1.0 compatible |
| Qwen | ✅ | ✅ | ZIP with SKILL.md root | Max 10MB, auto-review |
| Trae | ✅ | ✅ | `.trae/skills/` + `.trae/rules/` | Flat deployment |
| Claude Code | ✅ | ✅ | `.claude-plugin/plugin.json` | Full support |
| Agent Plugins 1.0 | ✅ | ✅ | `plugin.json` (closed schema) | Open standard |
| Generic | ✅ | ✅ | Minimal | Just SKILL.md + resources |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Universal format based on FreeSkill standard | Already defined in project, includes governance fields |
| Pipeline: Parser → Normalizer → Enricher → Generator | Clean separation, extensible |
| CLI tool in Python | Matches existing tooling (packager.py, skill_lint.py) |
| Support 8 platforms | Covers major Chinese + global ecosystems |
| Governance enrichment optional but recommended | Aligns with paper's "Responsibility Vacuum" thesis |
| Output as ZIP packages | Standard distribution format |

## Dependencies

- Existing: FreeSkill standard (FREESKILL_STANDARD.md), WorkBuddy package structure
- New: platform adapters, CLI entry point, enrichment engine

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Platform formats change frequently | Adapter pattern isolates changes |
| Governance fields rejected by platforms | Make enrichment optional/overlay |
| Large file uploads (ZIP parsing) | Streaming unzip, size limits |
| Cross-platform testing cost | CI matrix with representative samples |

## Next Actions

1. Complete Phase 2: FreeSkill Enhanced schema design
2. Design Phase 3: Pipeline with concrete adapter interfaces
3. Prototype Phase 4: CLI with 2 adapters (WorkBuddy + Doubao)
