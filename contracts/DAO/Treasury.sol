// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Treasury
 * @notice Community treasury with grant distribution
 * @dev Funds managed through governance proposals
 */
interface IGovernance {
    function execute(uint256 proposalId) external;
}

contract Treasury {
    address public governance;
    address public emergencyMultisig;
    uint256 public constant EMERGENCY_THRESHOLD = 6667; // 66.67%

    uint256 public totalBalance;

    mapping(bytes32 => uint256) public allocations;
    mapping(bytes32 => bool) public spent;

    event AllocationCreated(bytes32 id, uint256 amount, address recipient);
    event FundsSpent(bytes32 id, uint256 amount, address recipient);
    event EmergencyWithdrawal(uint256 amount);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    modifier onlyEmergency() {
        require(msg.sender == emergencyMultisig, "Not emergency multisig");
        _;
    }

    constructor(address _governance, address _emergencyMultisig) {
        governance = _governance;
        emergencyMultisig = _emergencyMultisig;
    }

    receive() external payable {
        totalBalance += msg.value;
    }

    function allocate(bytes32 id, uint256 amount, address recipient) external onlyGovernance {
        require(amount > 0, "Amount must be positive");
        require(amount <= totalBalance, "Insufficient balance");

        allocations[id] = amount;
        // Funds stay in treasury until spent via governance
        emit AllocationCreated(id, amount, recipient);
    }

    function spend(bytes32 allocationId, bytes memory callData) external onlyGovernance {
        require(!spent[allocationId], "Already spent");
        require(allocations[allocationId] > 0, "Allocation not found");

        spent[allocationId] = true;
        uint256 amount = allocations[allocationId];

        (bool success, ) = address(this).call(callData);
        require(success, "Spend failed");

        totalBalance -= amount;
        emit FundsSpent(allocationId, amount, msg.sender);
    }

    function emergencyWithdraw(uint256 amount) external onlyEmergency {
        require(amount <= totalBalance, "Insufficient balance");

        totalBalance -= amount;
        (bool success, ) = payable(emergencyMultisig).call{value: amount}("");
        require(success, "Transfer failed");

        emit EmergencyWithdrawal(amount);
    }

    function getAllocation(bytes32 id) external view returns (uint256) {
        return allocations[id];
    }

    function isSpent(bytes32 id) external view returns (bool) {
        return spent[id];
    }

    function updateGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "Invalid governance");
        governance = _governance;
    }

    function updateEmergencyMultisig(address _emergencyMultisig) external onlyEmergency {
        require(_emergencyMultisig != address(0), "Invalid multisig");
        emergencyMultisig = _emergencyMultisig;
    }
}