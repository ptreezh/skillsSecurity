// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "./StakingManager.sol";

/**
 * @title ReputationVotes
 * @notice Voting power based on reputation in StakingManager
 */
contract ReputationVotes is IVotes {
    StakingManager public immutable stakingManager;

    constructor(address _stakingManager) {
        stakingManager = StakingManager(_stakingManager);
    }

    /**
     * @dev Voting power is based on effective reputation
     */
    function getVotes(address account) external view override returns (uint256) {
        int256 effectiveRep = stakingManager.getUserReputation(account);
        return effectiveRep > 0 ? uint256(effectiveRep) : 0;
    }

    /**
     * @dev Returns past votes at block number
     */
    function getPastVotes(address account, uint256 blockNumber) external view override returns (uint256) {
        return this.getVotes(account);
    }

    /**
     * @dev Returns total supply at block number
     */
    function getPastTotalSupply(uint256 blockNumber) external view override returns (uint256) {
        return type(uint256).max;
    }

    /**
     * @dev Returns delegation
     */
    function delegates(address account) external view override returns (address) {
        return address(0);
    }

    /**
     * @dev Delegate votes to address
     */
    function delegate(address delegatee) external override {
        // No-op: reputation can't delegate
    }

    /**
     * @dev Delegate votes with signature
     */
    function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external override {
        // No-op: reputation can't delegate
    }
}