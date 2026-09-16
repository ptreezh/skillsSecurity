// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ASKToken
/// @notice AgentSkills token contract
/// @dev DEPRECATED: AgentSkills has moved to no-token architecture.
/// Use RevenueSplit for service fee distribution. No token needed.
/// This contract is preserved for historical state reference only.
contract ASKToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant COMMUNITY = 600_000_000 * 10**18;
    uint256 public constant TEAM_AND_OPS = 250_000_000 * 10**18;
    uint256 public constant REVENUE_POOL = 150_000_000 * 10**18;

    mapping(address => uint256) private _votes;
    mapping(address => address) private _delegates;
    mapping(address => uint256[]) private _pastVotes;

    bool public deprecated = true;

    constructor() ERC20("AgentSkills Token", "ASK") Ownable() {
        _mint(msg.sender, MAX_SUPPLY);
    }

    /// @notice Deprecated - token architecture no longer used
    function getVotes(address account) external view returns (uint256) {
        account; // silence unused warning
        revert("Deprecated: No token architecture");
    }

    /// @notice Deprecated - token architecture no longer used
    function delegate(address delegatee) external {
        delegatee; // silence unused warning
        revert("Deprecated: No token architecture");
    }

    /// @notice Deprecated - token architecture no longer used
    function mint(address to, uint256 amount) external onlyOwner {
        to; amount; // silence unused warning
        revert("Deprecated: No token architecture");
    }

    /// @notice Deprecated - token architecture no longer used
    function transfer(address to, uint256 amount) public pure override returns (bool) {
        to; amount; // silence unused warning
        revert("Deprecated: No token architecture");
    }

    /// @notice Deprecated - token architecture no longer used
    function transferFrom(address from, address to, uint256 amount) public pure override returns (bool) {
        from; to; amount; // silence unused warning
        revert("Deprecated: No token architecture");
    }

    /// @notice Check if contract is deprecated
    function isDeprecated() external pure returns (bool) {
        return true;
    }
}