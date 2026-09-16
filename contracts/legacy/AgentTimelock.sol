// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title AgentTimelock
 * @notice Timelock controller with 48-hour delay for AgentSkills governance
 * @dev Inherits from OpenZeppelin TimelockController
 */
contract AgentTimelock is TimelockController {
    uint256 public constant MIN_DELAY = 48 hours;
    uint256 public constant MAX_DELAY = 30 days;

    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    )
        TimelockController(minDelay, proposers, executors, admin)
    {}

    /**
     * @dev Returns the minimum delay for a new proposal
     */
    function getMinDelay() public view override returns (uint256) {
        return MIN_DELAY;
    }
}