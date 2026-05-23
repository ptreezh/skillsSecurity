// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "./ReputationVotes.sol";

/**
 * @title AgentGovernor
 * @notice Governor with reputation-based voting for AgentSkills
 */
contract AgentGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    // Voting parameters
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant PROPOSAL_THRESHOLD = 100;
    uint256 public constant QUORUM_PERCENTAGE = 4;

    constructor(
        IVotes _token,
        TimelockController _timelock
    )
        Governor("AgentGovernor")
        GovernorCountingSimple()
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(QUORUM_PERCENTAGE)
        GovernorTimelockControl(_timelock)
    {}

    function votingDelay() public view override returns (uint256) {
        return VOTING_DELAY;
    }

    function votingPeriod() public view override returns (uint256) {
        return VOTING_PERIOD;
    }

    function proposalThreshold() public view override returns (uint256) {
        return PROPOSAL_THRESHOLD;
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return address(timelock());
    }

    function supportsInterface(bytes4 interfaceId) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }
}