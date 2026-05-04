# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-04
**Branch:** main

## OVERVIEW
Research paper project: "Responsibility Vacuum in Agent Skill Ecosystems" — tokenomics, smart contracts, DAO governance, community growth.

## STRUCTURE
```
skillsSecurity/
├── CONSTITUTION.md               # 🏛️ Project constitution (zero-startup, anti-financing)
├── ROADMAP.md                    # 📅 Phased milestones + whip-system (check every Monday)
├── A-tokenomics-design.md      # Tokenomics model (ASK token, staking, slash)
├── B-technical-implementation.md # Solidity contracts (ERC20, SkillRegistry, DAO)
├── C-dao-governance.md          # DAO governance design (voting, proposals)
├── D-community-growth.md        # Community growth strategy (cold start, user tiers)
└── paper-draft-en.md           # Main paper draft (RQ1/RQ2, literature, framework)
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| **Project constitution** | CONSTITUTION.md (zero-startup, anti-financing) |
| **Milestones + whip-system** | ROADMAP.md (check every Monday) |
| Tokenomics parameters | A-tokenomics-design.md (§2-8) |
| Smart contract code | B-technical-implementation.md (§2, Solidity snippets) |
| DAO governance rules | C-dao-governance.md (§2-3) |
| Community growth strategy | D-community-growth.md (§2-4) |
| Paper sections/theory | paper-draft-en.md (§1-4) |

## CONVENTIONS
- Markdown only, no code files
- Chinese docs: A/B/C/D series (brainstorm outputs)
- English doc: paper-draft-en.md (academic paper)
- Cross-references use "§X" notation

## ANTI-PATTERNS (THIS PROJECT)
- No governance fields in skill specs (per paper core finding)
- Avoid adding code files to this markdown-only research repo
- Do not mix Chinese/English in same doc (A/B/C/D=CN, paper=EN)

## UNIQUE STYLES
- Diagrams use ASCII art with ┌─┐ boxes
- Token amounts in ASK units (1 ASK = 10^18 wei)
- Governance parameters: CONSTANT_CAPS in Solidity snippets

## COMMANDS
```bash
# No build/test — research-only project
# To review paper: read paper-draft-en.md
# To update tokenomics: edit A-tokenomics-design.md
```

## NOTES
- Paper targets IS/AI governance venues (Wieringa 2020, Collingridge 1980)
- AgentSkills.io spec audit: 100% governance deficiency rate
- HKERT 2026 security report confirms real-world risks
