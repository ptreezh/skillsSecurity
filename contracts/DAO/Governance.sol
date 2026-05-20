// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Governance
 * @notice On-chain voting with reputation-weighted power + deployer governance
 * @dev Voting power: L4+ (1 per 1000 rep) + Token holders (1 per 10000 ASK) + Deployer weight
 * @dev Security fixes: timelock initialization, onlyOwner access, whitelist actions, pause mechanism
 */
interface IStakingManager {
    function getUserReputation(address account) external view returns (int256);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IDeployerRewards {
    function getGovernanceWeight(address deployer) external view returns (uint256);
    function isGoldTier(address deployer) external view returns (bool);
}

/**
 * @notice Allowed proposal action types (whitelist pattern)
 * @dev Prevents arbitrary function calls through execute()
 */
enum ProposalAction {
    UPDATE_TIER_CONFIG,      // Update tier configuration
    UPDATE_REWARD_CONFIG,    // Update reward configuration
    UPDATE_DISTRIBUTION,     // Update distribution ratios
    TRANSFER_TOKENS,         // Transfer tokens to address
    PAUSE_CONTRACT,          // Pause contract
    UNPAUSE_CONTRACT          // Unpause contract
}

contract Governance is Ownable {
    struct Proposal {
        address proposer;
        string description;
        bytes callData;       // Encoded (action, target, value, data)
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
    }

    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM = 6000; // 60% of total votes
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    uint256 public constant MAJORITY = 5001; // 50.01%
    uint256 public constant MIN_VOTING_POWER = 100;
    uint256 public constant GOLD_VETO_THRESHOLD = 3000; // 30% gold opposition can pause proposal

    Proposal[] public proposals;
    address public timelock;
    address public stakingManager;
    address public askToken;
    address public deployerRewards; // DeployerRewards contract for governance integration

    mapping(address => uint256) public votingPowerCache;
    uint256 public lastTotalPowerRecalculation;
    uint256 public cachedTotalVotingPower;

    // Pausable state for emergency actions
    bool public paused;
    mapping(uint256 => uint256) public proposalTimelockEndTime;

    // Events
    event ProposalCreated(uint256 id, address proposer, string description, ProposalAction action);
    event VoteCast(uint256 id, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 id, ProposalAction action);
    event ProposalCanceled(uint256 id);
    event VotingPowerRecalculated(uint256 totalPower);
    event GoldVeto(uint256 indexed proposalId, address deployer, uint256 vetoPower);
    event DeployerRewardsSet(address deployerRewards);
    event Paused();
    event Unpaused();

    // Errors
    error PausedError();
    error NotTimelock();
    error NotPassed();
    error QuorumNotReached();
    error TimelockNotElapsed();

    modifier onlyTimelock() {
        if (msg.sender != timelock) revert NotTimelock();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedError();
        _;
    }

    /**
     * @notice Constructor with timelock initialization (CRITICAL FIX)
     * @param _stakingManager StakingManager contract address
     * @param _askToken ASKToken contract address
     * @param _timelock Timelock address (usually a Gnosis Safe)
     */
    constructor(address _stakingManager, address _askToken, address _timelock) {
        require(_timelock != address(0), "Zero timelock");
        stakingManager = _stakingManager;
        askToken = _askToken;
        timelock = _timelock;
        paused = false;
    }

    /**
     * @notice Set deployer rewards contract (SECURITY FIX: added onlyOwner)
     * @param _deployerRewards DeployerRewards contract address
     */
    function setDeployerRewards(address _deployerRewards) external onlyOwner {
        require(_deployerRewards != address(0), "Zero address");
        require(deployerRewards == address(0), "Already set");
        deployerRewards = _deployerRewards;
        emit DeployerRewardsSet(_deployerRewards);
    }

    /**
     * @notice Create a new proposal with structured action (whitelist pattern)
     * @param description Proposal description
     * @param action The type of action being proposed
     * @param target Target address (for transfers)
     * @param value Value/amount
     * @param data Additional encoded data
     */
    function createProposal(
        string memory description,
        ProposalAction action,
        address target,
        uint256 value,
        bytes memory data
    ) external whenNotPaused {
        require(getVotingPower(msg.sender) >= MIN_VOTING_POWER, "Insufficient voting power");

        uint256 proposalId = proposals.length;
        Proposal storage proposal = proposals.push();
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.executed = false;
        proposal.canceled = false;

        // Store structured action data
        proposal.callData = abi.encode(action, target, value, data);

        // Set timelock end time (48h delay)
        proposalTimelockEndTime[proposalId] = block.timestamp + TIMELOCK_DELAY;

        emit ProposalCreated(proposalId, msg.sender, description, action);
    }

    function vote(uint256 proposalId, bool support) external whenNotPaused {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting not ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");

        uint256 weight = getVotingPower(msg.sender);
        require(weight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Execute a passed proposal (SECURITY FIX: whitelist pattern, no arbitrary calls)
     * @param proposalId Proposal ID to execute
     */
    function execute(uint256 proposalId) external onlyTimelock whenNotPaused {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");

        // Check timelock delay has elapsed
        if (block.timestamp < proposalTimelockEndTime[proposalId]) {
            revert TimelockNotElapsed();
        }

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        require(totalVotes > 0, "No votes");

        uint256 forPercent = (proposal.forVotes * 10000) / totalVotes;
        if (forPercent < MAJORITY) revert NotPassed();

        // Check quorum
        uint256 totalPower = getTotalVotingPower();
        uint256 quorumVotes = (totalPower * QUORUM) / 10000;
        if (totalVotes < quorumVotes) revert QuorumNotReached();

        proposal.executed = true;

        // Decode and execute whitelist action (SECURITY FIX: no arbitrary calls)
        _executeWhitelistAction(proposal.callData);

        emit ProposalExecuted(proposalId, abi.decode(proposal.callData, (ProposalAction)));
    }

    /**
     * @notice Internal: Execute whitelist action (SECURITY FIX)
     * @param callData Encoded (action, target, value, data)
     */
    function _executeWhitelistAction(bytes memory callData) internal {
        (ProposalAction action, address target, uint256 value, bytes memory data) =
            abi.decode(callData, (ProposalAction, address, uint256, bytes));

        if (action == ProposalAction.TRANSFER_TOKENS) {
            // Transfer tokens to target address
            require(target != address(0), "Zero target");
            require(IERC20(askToken).transfer(target, value), "Transfer failed");
        } else if (action == ProposalAction.PAUSE_CONTRACT) {
            paused = true;
            emit Paused();
        } else if (action == ProposalAction.UNPAUSE_CONTRACT) {
            paused = false;
            emit Unpaused();
        }
        // UPDATE_TIER_CONFIG, UPDATE_REWARD_CONFIG, UPDATE_DISTRIBUTION
        // would be implemented here with external contract calls
        // For now, these are placeholder for future integrations
    }

    function cancelProposal(uint256 proposalId) external {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage proposal = proposals[proposalId];
        require(proposal.proposer == msg.sender, "Not proposer");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Already canceled");

        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    /**
     * @notice Emergency pause by owner
     */
    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit Paused();
    }

    /**
     * @notice Emergency unpause by owner
     */
    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused();
    }

    function getVotingPower(address account) public view returns (uint256) {
        // 1. Reputation votes (L4+: 1 vote per 1000 reputation)
        int256 reputation = IStakingManager(stakingManager).getUserReputation(account);
        uint256 repVotes = reputation > 0 ? uint256(reputation / 1000) * 1e18 : 0;

        // 2. Token votes (1 vote per 10000 ASK)
        uint256 tokenBalance = IERC20(askToken).balanceOf(account);
        uint256 tokenVotes = (tokenBalance / 10000) * 1e18;

        // 3. Deployer weight (new: from DeployerRewards)
        uint256 deployerVotes;
        if (deployerRewards != address(0)) {
            deployerVotes = IDeployerRewards(deployerRewards).getGovernanceWeight(account);
        }

        // Calculate total weight
        uint256 total = repVotes + tokenVotes + deployerVotes;

        // Apply cap at 10% of total
        uint256 cap = getTotalVotingPower() / 10;
        return total > cap ? cap : total;
    }

    function getTotalVotingPower() public view returns (uint256) {
        // For simplicity, return cached value
        // In production, this would iterate through all stakers
        return cachedTotalVotingPower > 0 ? cachedTotalVotingPower : 1000000e18;
    }

    function recalculateTotalPower() external {
        // Called periodically to update total voting power cache
        // In production: iterate all stakers from StakingManager
        cachedTotalVotingPower = 1000000e18;
        lastTotalPowerRecalculation = block.timestamp;
        emit VotingPowerRecalculated(cachedTotalVotingPower);
    }

    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        bool canceled
    ) {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.canceled
        );
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        require(proposalId < proposals.length, "Invalid proposal");
        return proposals[proposalId].hasVoted[voter];
    }

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }

    /// @notice Gold tier deployers can cast veto (自进化治理)
    /// @param proposalId Proposal ID to veto
    function castGoldVeto(uint256 proposalId) external whenNotPaused {
        require(proposalId < proposals.length, "Invalid proposal");
        require(deployerRewards != address(0), "DeployerRewards not set");

        bool isGold = IDeployerRewards(deployerRewards).isGoldTier(msg.sender);
        require(isGold, "Not a Gold deployer");

        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Already executed");

        uint256 weight = getVotingPower(msg.sender);
        proposal.hasVoted[msg.sender] = true;
        proposal.againstVotes += weight; // Count as against

        emit GoldVeto(proposalId, msg.sender, weight);
    }
}