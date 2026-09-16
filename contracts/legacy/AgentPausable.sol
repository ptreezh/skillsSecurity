// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentPausable
/// @notice Emergency pause mechanism for AgentSkills contracts
/// @dev Allows owner to pause/unpause critical functions in emergencies
contract AgentPausable is Ownable, Pausable {

    /// @notice Pause the contract (owner only)
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    /// @notice Unpause the contract (owner only)
    function unpause() external onlyOwner whenPaused {
        _unpause();
    }
}
