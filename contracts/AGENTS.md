# CONTRACTS

**16 Solidity contracts · Hardhat framework · OpenZeppelin v4.9.6**

## OVERVIEW
ASK token ecosystem smart contracts — ERC20, staking, slashing, DAO governance, reputation, and self-sustaining loop. All contracts are research prototypes for the "Responsibility Vacuum" paper.

## STRUCTURE
```
contracts/
├── ASKToken.sol                 # ERC20 (1B supply, 4 distributions)
├── SkillRegistry.sol            # Skill fingerprint registry (Constitution Art.3)
├── Attribution.sol              # Contribution tracking + test/like
├── StakingManager.sol           # Staking + slash + anti-slash (Art.3)
├── DeployerRewards.sol          # Deployer reward distribution
├── HealthReporter.sol           # On-chain health reporting
├── RevenueDistributor.sol       # Revenue sharing
├── AgentGovernor.sol            # Agent DAO governor (OpenZeppelin)
├── AgentVotes.sol               # Agent voting module
├── AgentTimelock.sol            # Timelock controller
├── AgentPausable.sol            # Pausable module
├── GovernanceTimelock.sol       # Governance timelock
├── ReputationBadges.sol         # Reputation badge system
├── ReputationVotes.sol          # Reputation-weighted voting
├── RevenueSplit.sol             # Revenue split logic
├── SelfSustainingEcosystem.sol  # Self-sustaining loop
├── DAO/                         # Governance + Treasury
├── interfaces/                  # Solidity interfaces (IDeployerRewards, etc.)
├── scripts/                     # deploy.js, test.js
├── test/                        # Contract tests (JS)
├── artifacts/                   # Compiled ABIs
└── package.json
```

## WHERE TO LOOK
| Task | File |
|------|------|
| Token core | ASKToken.sol |
| Staking/slash | StakingManager.sol |
| Skill registry | SkillRegistry.sol |
| Contribution tracking | Attribution.sol |
| DAO governance | DAO/Governance.sol, AgentGovernor.sol |
| Reputation | ReputationBadges.sol, ReputationVotes.sol |
| Deployer incentives | DeployerRewards.sol |
| Self-sustaining loop | SelfSustainingEcosystem.sol |
| Tests | test/ |
| Deploy scripts | scripts/deploy.js |

## CONVENTIONS
- Solidity ^0.8.0, OpenZeppelin v4.9.6
- CONSTANT_CAPS for governance parameters
- NatSpec comments on public/external functions
- JS tests with Hardhat + ethers

## ANTI-PATTERNS
- No governance fields in skill specs (per paper finding)
- Avoid redundant `require()` — use modifiers
- Don't mix tokenomics logic in single contract
