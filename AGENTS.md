# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-27
**Commit:** 81bad1a
**Branch:** main

## OVERVIEW
Research paper project: "Responsibility Vacuum in Agent Skill Ecosystems" — tokenomics, smart contracts, DAO governance, community growth.

## STRUCTURE
```
skillsSecurity/
├── CONSTITUTION.md               # 🏛️ Project constitution (zero-startup, anti-financing)
├── ROADMAP.md                    # Phased milestones + whip-system (check every Monday)
├── A-tokenomics-design.md      # Tokenomics model (ASK token, staking, slash)
├── B-technical-implementation.md # Solidity contracts (ERC20, SkillRegistry, DAO)
├── C-dao-governance.md          # DAO governance design (voting, proposals)
├── D-community-growth.md        # Community growth strategy (cold start, user tiers)
├── paper-draft-en.md           # Main paper draft (RQ1/RQ2, literature, framework)
├── hardhat.config.js            # Hardhat config (Solidity compiler, networks)
├── .github/
│   └── workflows/               # CI workflows
├── .planning/                    # GSD planning system
│   ├── PHASE_0.md              # Phase 0 plan (12 tasks, 4 waves)
│   ├── PHASE_1.md              # Phase 1 plan
│   ├── ROADMAP.md              # Roadmap
│   ├── PROJECT.md              # Project definition
│   ├── REQUIREMENTS.md         # Requirements
│   ├── STATE.md                # Current state
│   ├── CURRENT_PHASE.txt       # Phase tracker
│   ├── progress.log            # Whip-system log
│   ├── codebase/               # Codebase analysis docs
│   ├── milestones/             # Milestone plans
│   └── research/               # Research outputs
├── archive/                      # Archived files
├── community/                    # Community docs
│   ├── twitter-posts.md
│   └── discord-server.md
├── contracts/                    # Solidity smart contracts (Hardhat)
│   ├── ASKToken.sol            # ASK ERC20 token (1B supply, 4 distributions)
│   ├── SkillRegistry.sol        # Skill registry + fingerprint (Constitution Art.3)
│   ├── Attribution.sol          # Contribution tracking + test/like + anti-slash
│   ├── StakingManager.sol      # Staking + slash + anti-slash (Constitution Art.3)
│   ├── DeployerRewards.sol     # Deployer reward distribution
│   ├── HealthReporter.sol      # On-chain health reporting
│   ├── RevenueDistributor.sol  # Revenue sharing
│   ├── AgentGovernor.sol       # Agent DAO governor
│   ├── AgentVotes.sol          # Agent voting
│   ├── AgentTimelock.sol       # Timelock controller
│   ├── AgentPausable.sol       # Pausable module
│   ├── GovernanceTimelock.sol  # Governance timelock
│   ├── ReputationBadges.sol    # Reputation badge system
│   ├── ReputationVotes.sol     # Reputation-weighted voting
│   ├── RevenueSplit.sol        # Revenue split logic
│   ├── SelfSustainingEcosystem.sol # Self-sustaining loop
│   ├── DAO/
│   │   ├── Governance.sol
│   │   └── Treasury.sol
│   ├── interfaces/             # Solidity interfaces
│   ├── scripts/                # Deploy/test scripts
│   ├── test/                   # Contract tests
│   ├── artifacts/              # Compiled ABIs
│   └── package.json
├── data/                         # Data files
│   └── test-users.json
├── deployments/                  # Deployment configs
├── docs/                         # Extended documentation
│   ├── api/                    # API docs
│   ├── business/               # Business docs
│   ├── guides/                 # User guides
│   ├── plans/                  # Implementation plans
│   └── security/               # Security docs
├── downloads/                    # Downloaded resources
├── e2e/                          # E2E test files
├── paper-submission/              # Paper submission materials
│   ├── paper-draft-en.docx/html # Paper in doc formats
│   ├── cover-letters            # Submission cover letters
│   └── SUBMISSION-CHECKLIST.md
├── REPORTS/                      # Daily audit/reports
├── scripts/                      # Automation scripts
│   ├── airdrop.js              # Airdrop script
│   ├── deploy-with-rewards.js  # Deploy with reward system
│   ├── env-setup.js            # Environment setup
│   ├── auto-tasks.cjs/ps1/sh   # Auto task runners
│   ├── agents/                 # Autonomous agents
│   │   ├── AutoFixer.js
│   │   ├── EvolutionAgent.js
│   │   ├── HealthMonitor.js
│   │   └── UpgradeScheduler.js
│   ├── economics/              # Economic scripts
│   ├── growth/                 # Growth scripts
│   └── content/               # Content scripts
├── server/                       # Backend server (Node.js)
│   ├── index.js                # Server entry
│   ├── audit-agent.js          # Audit agent
│   ├── chain-submit.js         # Chain submission
│   ├── independence-scorer.js  # Independence scoring
│   ├── skill-runner.js         # Skill execution
│   └── jobs.js                 # Background jobs
├── skills/                       # Seed skill specs (Wave 3)
│   ├── *.SKILL.md              # Standard skills (10)
│   └── *.FREESKILL.md          # Freeskills (4)
├── src/                          # Frontend (React + Vite)
│   ├── main.jsx                # Entry point
│   ├── components/             # React components
│   ├── pages/                  # Page views (UserProfile, Leaderboard, etc.)
│   ├── services/               # Web3 services (WalletService, etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── i18n/                   # Internationalization
│   ├── styles/                 # CSS styles
│   └── abi/                    # Contract ABIs
├── test/                         # Test files
│   ├── contracts/              # Solidity tests
│   └── e2e/                    # E2E tests
├── wallets/                      # Wallet configs
└── uploads/                      # Upload directory
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Project constitution** | CONSTITUTION.md | zero-startup, anti-financing |
| **Milestones + whip-system** | ROADMAP.md | check every Monday |
| Tokenomics parameters | A-tokenomics-design.md (§2-8) | ASK token, staking, slash |
| Smart contract code | contracts/AGENTS.md | Solidity contracts overview |
| Individual contracts | contracts/ | See individual .sol files |
| Contract deployment | contracts/scripts/ | deploy.js, test.js |
| DAO governance rules | C-dao-governance.md (§2-3) | voting, proposals |
| Community growth strategy | D-community-growth.md (§2-4) | cold start, user tiers |
| Paper sections/theory | paper-draft-en.md (§1-4) | RQ1/RQ2, literature, framework |
| Frontend code | src/AGENTS.md | React + Vite MVP |
| GSD planning system | .planning/ | phases, roadmap, state |
| Automation scripts | scripts/ | agents, economics, growth |
| Seed skills | skills/ | .SKILL.md and .FREESKILL.md |
| Backend server | server/ | Node.js API, audit, scoring |
| Test files | test/ | contract tests, E2E |
| Deployment configs | deployments/ | network configs |
| Daily reports | REPORTS/ | audit and progress logs |
| Paper submission | paper-submission/ | drafts, cover letters |

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
# To compile contracts: npx hardhat compile
# To run contract tests: npx hardhat test
```

## NOTES
- Paper targets IS/AI governance venues (Wieringa 2020, Collingridge 1980)
- AgentSkills.io spec audit: 100% governance deficiency rate
- HKERT 2026 security report confirms real-world risks
