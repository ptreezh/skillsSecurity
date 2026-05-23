# AgentSkills Contract Descriptions

## StakingManager.sol

**Purpose:** Central reputation and staking management contract

### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `userReputation` | mapping(address => int256) | User's reputation score |
| `reputationLocks` | mapping(address => ReputationLock) | Locked reputation |
| `stakes` | mapping(address => mapping(uint256 => StakeInfo)) | Stake info per user/skill |
| `hasLiked` | mapping(address => bool) | Liked status |
| `governance` | address | Governance contract |
| `originalSlashAmount` | mapping(address => uint256) | Original slash for recovery calc |

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `stake()` | Anyone | Stake reputation on skill |
| `unstake()` | Anyone | Unstake after 90-day lock |
| `slash()` | Governance | Slash user stake |
| `slashLiker()` | Governance | Anti-slash mechanism |
| `likeSkill()` | Anyone | Like a skill (+2 reputation) |
| `getUserReputation()` | Anyone | Get effective reputation |
| `claimRecoverableReputation()` | Anyone | Claim 5% monthly recovery |
| `setGovernance()` | Owner | Set governance address |

### Events

- `Staked`, `Unstaked`, `Slash`, `AntiSlash`
- `ReputationLocked`, `RecoveryClaimed`
- `PositiveContributionSet`

---

## SkillRegistry.sol

**Purpose:** Skill registration and verification

### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `skills` | mapping(uint256 => Skill) | Skill data |
| `verifiedSkills` | mapping(uint256 => bool) | Verification status |
| `stakingManager` | address | StakingManager reference |
| `nameTaken` | mapping(string => bool) | Name availability |

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `registerSkill()` | Anyone | Register new skill |
| `verifySkill()` | Verifiers | Verify skill quality |
| `slashSkill()` | Owner | Slash skill stake |
| `computeFingerprint()` | Anyone | Generate skill fingerprint |

### Risk Levels

| Level | Reputation Required |
|-------|-------------------|
| LOW | 0 |
| MEDIUM | 500+ |
| HIGH | 2000+ |
| CRITICAL | 5000+ |

---

## Attribution.sol

**Purpose:** Contribution tracking and attribution

### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `skillContributions` | mapping(uint256 => Contribution[]) | Contributions |
| `skillTestReports` | mapping(uint256 => TestReport[]) | Test reports |
| `skillLikes` | mapping(uint256 => Like[]) | Likes |
| `stakingManager` | address | StakingManager reference |

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `addContribution()` | Owner | Add skill contribution |
| `addTestReport()` | Owner | Submit test report |
| `likeSkill()` | Anyone | Like a skill |
| `slashLiker()` | Owner | Slash liker |
| `calculateSplit()` | Anyone | Calculate revenue split |

---

## GovernanceTimelock.sol

**Purpose:** Multi-signature governance with timelock

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `REQUIRED` | 3 | Required confirmations |
| `MIN_DELAY` | 24 hours | Minimum timelock delay |

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `queue()` | Guardian | Queue transaction |
| `confirm()` | Guardian | Confirm transaction |
| `execute()` | Guardian | Execute confirmed tx |
| `cancel()` | Guardian | Cancel transaction |
| `addGuardian()` | Guardian | Add guardian |
| `removeGuardian()` | Guardian | Remove guardian |

---

## AgentPausable.sol

**Purpose:** Emergency pause mechanism

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `pause()` | Owner | Pause contract |
| `unpause()` | Owner | Unpause contract |

### Protected Functions (whenNotPaused)

In StakingManager:
- `stake()`, `unstake()`, `slash()`, `slashLiker()`, `likeSkill()`
