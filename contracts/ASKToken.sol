// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ASKToken is ERC20, ERC20Burnable, ERC20Votes, Ownable {
    
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // 分配常量（宪法第一条：600M 给社区，400M 给财政）
    uint256 public constant COMMUNITY = 600_000_000 * 10**18;
    uint256 public constant TEAM_AND_OPS = 250_000_000 * 10**18;
    uint256 public constant REVENUE_POOL = 150_000_000 * 10**18;
    
    constructor() ERC20("AgentSkills Token", "ASK") Ownable(msg.sender) {
        // 初始化分配（宪法第一条：零融资，自铸造）
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // 投票支持 - 覆盖以支持 ERC20Votes
    function _afterTokenTransfer(address from, address to, uint256 amount) 
        internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
    
    // 铸造（仅Owner，用于财政分发）
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    
    // 宪法第一条：禁止融资，代币代替现金激励
    // 无公开销售功能，所有代币通过贡献/奖励分发
}
