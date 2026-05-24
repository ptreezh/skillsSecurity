// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReputationVotes.sol";

/**
 * @title AgentVotes
 * @notice Deployable wrapper for ReputationVotes
 */
contract AgentVotes is ReputationVotes {
    constructor(address _stakingManager) ReputationVotes(_stakingManager) {}
}