// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/utils/Votes.sol";
import "./StakingManager.sol";

/**
 * @title ReputationVotes
 * @notice Voting power based on reputation in StakingManager
 */
abstract contract ReputationVotes is Votes {
    StakingManager public immutable stakingManager;

    constructor(address _stakingManager) {
        stakingManager = StakingManager(_stakingManager);
    }

    /**
     * @dev Voting power is based on effective reputation
     */
    function getVotes(address account) public view override returns (uint256) {
        int256 effectiveRep = stakingManager.getUserReputation(account);
        return effectiveRep > 0 ? uint256(effectiveRep) : 0;
    }

    /**
     * @dev Returns voting units for an account (their effective reputation)
     */
    function _getVotingUnits(address account) internal view override returns (uint256) {
        return getVotes(account);
    }
}