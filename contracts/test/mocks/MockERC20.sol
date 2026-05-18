// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Simple ERC20 mock for testing purposes
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    /**
     * @notice Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply to mint to deployer
     * @param decimalPlaces Number of decimal places (default 18)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimalPlaces
    ) ERC20(name, symbol) {
        _decimals = decimalPlaces;
        _mint(msg.sender, initialSupply * 10 ** decimalPlaces);
    }

    /**
     * @notice Get decimals
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens to an address
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}