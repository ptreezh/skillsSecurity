# Contract API Reference

**Network:** Polygon Mainnet
**Version:** 1.0.0

## StakingManager

**Address:** `0x...` (deploy after audit)
**ABI:** Available at `src/abi/StakingManager.json`

### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `userReputation` | mapping(address => int256) | User's total reputation score |
| `reputationLocks` | mapping(address => ReputationLock) | Locked reputation with timestamps |
| `stakes` | mapping(address => mapping(uint256 => StakeInfo)) | Stake info per user/skill |
| `hasLiked` | mapping(address => bool) | Whether user has liked (anti-slash) |
| `governance` | address | Governance contract address |
| `originalSlashAmount` | mapping(address => uint256) | Original slash for recovery calc |

### Structs

```solidity
struct ReputationLock {
    uint256 amount;
    uint256 timestamp;
    uint256 originalSlashAmount;
    bool positiveContribution;
}

struct StakeInfo {
    uint256 amount;
    uint256 timestamp;
    bool active;
}
```

### Functions

#### `stake(uint256 _skillId, uint256 _amount)`

Stake reputation on a skill.

**Parameters:**
- `_skillId` (uint256): Skill ID to stake on
- `_amount` (uint256): Amount of reputation to stake

**Access:** Anyone (requires sufficient reputation)

**Events:** `Staked(address indexed user, uint256 skillId, uint256 amount)`

```javascript
// ethers.js
const tx = await stakingManager.stake(skillId, amount);
await tx.wait();
```

---

#### `unstake(uint256 _skillId)`

Unstake after lock period (90 days).

**Parameters:**
- `_skillId` (uint256): Skill ID to unstake from

**Access:** Anyone

**Events:** `Unstaked(address indexed user, uint256 skillId, uint256 amount)`

```javascript
await stakingManager.unstake(skillId);
```

---

#### `slash(address _user, uint256 _amount, uint256 _skillId, address _verdict)`

Slash user stake (governance only).

**Parameters:**
- `_user` (address): User to slash
- `_amount` (uint256): Amount to slash
- `_skillId` (uint256): Related skill ID
- `_verdict` (address): Verdict contract address

**Access:** Governance only

**Events:** `Slash(address indexed user, uint256 amount, uint256 skillId)`

```javascript
await stakingManager.connect(governance).slash(user, amount, skillId, verdict);
```

---

#### `slashLiker(address _user)`

Anti-slash mechanism for incorrect likes.

**Parameters:**
- `_user` (address): User to penalize

**Access:** Governance only

**Events:** `AntiSlash(address indexed user, uint256 penalty)`

---

#### `likeSkill(uint256 _skillId)`

Like a skill and earn reputation (+2).

**Parameters:**
- `_skillId` (uint256): Skill ID to like

**Access:** Anyone (one-time only per user)

**Events:** `SkillLiked(address indexed user, uint256 skillId)`

---

#### `getUserReputation(address _user)`

Get effective reputation (total - locked).

**Parameters:**
- `_user` (address): User address

**Returns:** int256 effective reputation

```javascript
const rep = await stakingManager.getUserReputation(userAddress);
console.log(`Effective: ${rep}`); // 1000
```

---

#### `claimRecoverableReputation()`

Claim 5% monthly recovery on locked reputation.

**Access:** Anyone with locked reputation

**Requirements:**
- At least 30 days since last claim
- Positive contribution required

**Events:** `RecoveryClaimed(address indexed user, uint256 amount)`

---

## SkillRegistry

**Address:** `0x...`
**ABI:** Available at `src/abi/SkillRegistry.json`

### Structs

```solidity
struct Skill {
    string name;
    string description;
    string trigger;
    string metadataIPFS;
    address owner;
    uint256 riskLevel;  // 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
    uint256 version;
    uint256 reputationRequired;
    uint256 reputationStaked;
    bool active;
}
```

### Functions

#### `registerSkill(...)`

Register a new skill.

**Parameters:**
- `name` (string): Skill name
- `description` (string): Skill description
- `trigger` (string): Trigger pattern
- `metadataIPFS` (string): IPFS CID for metadata
- `riskLevel` (uint256): 0-3
- `version` (string): Semantic version

**Access:** Anyone (reputation requirements apply for high risk)

**Events:** `SkillRegistered(address indexed owner, uint256 skillId, string name)`

---

#### `verifySkill(uint256 _skillId)`

Verify a skill's quality.

**Parameters:**
- `_skillId` (uint256): Skill ID

**Access:** Verifiers (500+ reputation)

**Events:** `SkillVerified(uint256 indexed skillId, address indexed verifier)`

---

#### `slashSkill(uint256 _skillId)`

Slash skill owner's stake.

**Parameters:**
- `_skillId` (uint256): Skill ID

**Access:** Owner only

**Events:** `SkillSlashed(uint256 indexed skillId, uint256 amount)`

---

## Attribution

**Address:** `0x...`
**ABI:** Available at `src/abi/Attribution.json`

### Functions

#### `addContribution(uint256 _skillId, address _contributor, uint96 _share, uint8 _ctype, string _contentHash)`

Add a contribution to a skill.

**Parameters:**
- `_skillId` (uint256): Skill ID
- `_contributor` (address): Contributor address
- `_share` (uint96): Revenue share percentage (basis points)
- `_ctype` (uint8): Contribution type (0=test, 1=bug, 2=enhancement)
- `_contentHash` (string): IPFS hash of contribution

**Access:** Owner

**Events:** `ContributionAdded(uint256 indexed skillId, address indexed contributor)`

---

#### `likeSkill(uint256 _skillId)`

Like a skill.

**Parameters:**
- `_skillId` (uint256): Skill ID

**Access:** Anyone

**Events:** `SkillLiked(address indexed user, uint256 indexed skillId)`

---

#### `calculateSplit(uint256 _skillId)`

Calculate revenue split for a skill.

**Returns:** (address[], uint96[]) - contributors and their shares

---

## GovernanceTimelock

**Address:** `0x...` (multisig)
**ABI:** Available at `src/abi/Governance.json`

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `REQUIRED` | 3 | Required confirmations |
| `MIN_DELAY` | 24 hours | Minimum timelock delay |

### Functions

#### `queue(address _target, uint256 _value, bytes _data, bytes32 _description)`

Queue a transaction for execution.

**Parameters:**
- `_target` (address): Target contract
- `_value` (uint256): MATIC amount
- `_data` (bytes): Call data
- `_description` (bytes32): Description hash

**Returns:** bytes32 transaction hash

---

#### `confirm(bytes32 _txHash)`

Confirm a queued transaction.

**Access:** Guardians only

---

#### `execute(bytes32 _txHash)`

Execute a confirmed transaction.

**Requirements:**
- Transaction must be confirmed by 3 guardians
- Must be after timelock delay

---

## AgentGovernor

**Address:** `0x...` (deployed after timelock)
**ABI:** Available at `src/abi/AgentGovernor.json`

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `VOTING_DELAY` | 1 day | Delay before voting starts |
| `VOTING_PERIOD` | 7 days | Voting duration |
| `PROPOSAL_THRESHOLD` | 100 | Min reputation to propose |
| `QUORUM_PERCENTAGE` | 4 | Required quorum |

### Functions

#### `propose(targets, values, calldatas, description)`

Create a governance proposal.

**Access:** 100+ reputation required

---

#### `vote(proposalId, support)`

Cast a vote (for/against/abstain).

**Parameters:**
- `support` (uint8): 0=against, 1=for, 2=abstain

---

#### `execute(proposalId)`

Execute a successful proposal.

**Requirements:**
- Voting period ended
- Proposal passed
- Timelock delay elapsed

---

## Usage Examples

### Connect Wallet (ethers.js v6)

```javascript
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();

const stakingManager = new ethers.Contract(
  STAKING_MANAGER_ADDRESS,
  StakingManagerABI,
  signer
);

// Stake
const tx = await stakingManager.stake(skillId, ethers.parseUnits('100', 0));
await tx.wait();
```

### Read Reputation

```javascript
const reputation = await stakingManager.getUserReputation(userAddress);
console.log(`Reputation: ${reputation}`);
```

### Event Listening

```javascript
stakingManager.on('Staked', (user, skillId, amount, event) => {
  console.log(`${user} staked ${amount} on skill #${skillId}`);
});
```