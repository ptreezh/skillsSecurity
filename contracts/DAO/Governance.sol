// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IReputationIncentives.sol";

/**
 * @title Governance
 * @notice On-chain reputation-weighted voting (pure reputation, no tokens, no deployer black-box)
 * @dev v3 (grill-down #8–#15): removed askToken/deployerRewards/timelock/veto dependencies
 * @dev execute() is publicly callable after internal timelock end time (OZ Governor pattern)
 */
interface IStakingManager {
    function getUserReputation(address account) external view returns (int256);
    function getTotalReputation() external view returns (int256);
}

/**
 * @notice Allowed proposal action types (whitelist pattern, all real & executable)
 * @dev 3 actions only: reward config (real param write) + pause/unpause (real switch)
 */
enum ProposalAction {
    UPDATE_REWARD_CONFIG,    // Write reward base into ReputationIncentives (real)
    PAUSE_CONTRACT,          // Pause governance (real)
    UNPAUSE_CONTRACT         // Unpause governance (real)
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
    uint256 public constant QUORUM = 6000; // 60% of total voting power
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    uint256 public constant MAJORITY = 5001; // 50.01%
    uint256 public constant MIN_VOTING_POWER = 100; // >= 100 voting units (rep >= 100,000)
    uint256 public constant MAX_VOTE_CAP = 1000; // 10% of total (1000 bps)

    Proposal[] public proposals;
    address public stakingManager;

    // Pausable state for emergency actions
    bool public paused;
    mapping(uint256 => uint256) public proposalTimelockEndTime;

    // Events
    event ProposalCreated(uint256 id, address proposer, string description, ProposalAction action);
    event VoteCast(uint256 id, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 id, ProposalAction action);
    event ProposalCanceled(uint256 id);
    event Paused();
    event Unpaused();

    // Errors
    error PausedError();
    error NotPassed();
    error QuorumNotReached();
    error TimelockNotElapsed();

    modifier whenNotPaused() {
        if (paused) revert PausedError();
        _;
    }

    /**
     * @notice Constructor (v3: token/timelock/deployer dependencies removed)
     * @param _stakingManager StakingManager contract address (reputation authority)
     */
    constructor(address _stakingManager) Ownable() {
        require(_stakingManager != address(0), "Zero staking manager");
        stakingManager = _stakingManager;
        paused = false;
    }

    /**
     * @notice Create a new proposal with structured action (whitelist pattern)
     * @param description Proposal description
     * @param action The type of action being proposed
     * @param target Target address (for UPDATE_REWARD_CONFIG: ReputationIncentives)
     * @param value Value/amount (for UPDATE_REWARD_CONFIG: new base reward)
     * @param data Additional encoded data (for UPDATE_REWARD_CONFIG: abi.encode(uint8 role))
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

        // Set timelock end time: measured from VOTING END, not creation (fix W1.7b)
        // Otherwise 7d voting > 48h timelock → timelock would already be expired
        // when voting ends, making TimelockNotElapsed dead code and the delay meaningless.
        proposalTimelockEndTime[proposalId] = block.timestamp + VOTING_PERIOD + TIMELOCK_DELAY;

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
     * @notice Execute a passed proposal (publicly callable after timelock end)
     * @dev v3 (grill-down #8): onlyTimelock removed — internal timelockEndTime check is the sole gate
     * @param proposalId Proposal ID to execute
     */
    function execute(uint256 proposalId) external whenNotPaused {
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

        // Decode and execute whitelist action (whitelist pattern, no arbitrary calls)
        _executeWhitelistAction(proposal.callData);

        emit ProposalExecuted(proposalId, abi.decode(proposal.callData, (ProposalAction)));
    }

    /**
     * @notice Internal: Execute whitelist action (3 real actions only)
     * @param callData Encoded (action, target, value, data)
     */
    function _executeWhitelistAction(bytes memory callData) internal {
        (ProposalAction action, address target, uint256 value, bytes memory data) =
            abi.decode(callData, (ProposalAction, address, uint256, bytes));

        if (action == ProposalAction.UPDATE_REWARD_CONFIG) {
            // Real config write into ReputationIncentives (grill-down #15)
            require(target != address(0), "Zero target");
            ReputationRole role = abi.decode(data, (ReputationRole));
            IReputationIncentives(target).setRoleBaseReward(role, value);
        } else if (action == ProposalAction.PAUSE_CONTRACT) {
            paused = true;
            emit Paused();
        } else if (action == ProposalAction.UNPAUSE_CONTRACT) {
            paused = false;
            emit Unpaused();
        }
        // No other actions exist (enum has exactly 3 members)
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

    /**
     * @notice Voting power = pure reputation weight (grill-down #9: no token/deployer terms)
     * @dev 1 voting unit per 1000 reputation; capped at 10% of total (anti-dominance)
     * @param account Voter address
     */
    function getVotingPower(address account) public view returns (uint256) {
        int256 reputation = IStakingManager(stakingManager).getUserReputation(account);
        if (reputation <= 0) return 0;
        uint256 repVotes = (uint256(reputation) / 1000) * 1e18;

        // Apply cap at 10% of total voting power
        uint256 cap = getTotalVotingPower() / (10000 / MAX_VOTE_CAP);
        return repVotes > cap ? cap : repVotes;
    }

    /**
     * @notice Total voting power from StakingManager's incremental aggregate (grill-down #2)
     * @dev No iteration, no hardcoded cache: reads reputation authority's maintained total
     */
    function getTotalVotingPower() public view returns (uint256) {
        int256 totalRep = IStakingManager(stakingManager).getTotalReputation();
        if (totalRep <= 0) return 0;
        return (uint256(totalRep) / 1000) * 1e18;
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
}