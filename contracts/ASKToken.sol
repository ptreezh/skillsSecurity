// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ASKToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant COMMUNITY = 600_000_000 * 10**18;
    uint256 public constant TEAM_AND_OPS = 250_000_000 * 10**18;
    uint256 public constant REVENUE_POOL = 150_000_000 * 10**18;

    mapping(address => uint256) private _votes;
    mapping(address => address) private _delegates;
    mapping(address => uint256[]) private _pastVotes;

    constructor() ERC20("AgentSkills Token", "ASK") Ownable() {
        _mint(msg.sender, MAX_SUPPLY);
    }

    function getVotes(address account) external view returns (uint256) {
        return _votes[account];
    }

    function delegate(address delegatee) external {
        _delegates[msg.sender] = delegatee;
        _votes[delegatee] += balanceOf(msg.sender);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}