// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GovernanceTimelock
/// @notice Multi-signature timelock for AgentSkills governance
/// @dev 3-of-N multisig with 24-hour time delay
contract GovernanceTimelock {
    event Queued(bytes32 indexed txHash, address target, bytes data, uint256 eta);
    event Executed(bytes32 indexed txHash);
    event Cancelled(bytes32 indexed txHash);
    event GuardianChanged(address indexed guardian, bool isActive);

    uint256 public constant MIN_DELAY = 24 hours;
    uint256 public constant REQUIRED = 3;

    mapping(address => bool) public guardians;
    uint256 public guardianCount;

    struct Tx {
        address target;
        bytes data;
        uint256 eta;
        uint256 confirmations;
        bool executed;
        bool cancelled;
    }
    mapping(bytes32 => Tx) public txs;
    bytes32[] public txList;

    modifier onlyGuardian() {
        require(guardians[msg.sender], "Not guardian");
        _;
    }

    constructor(address[] memory _guardians) {
        require(_guardians.length >= 3, "Need >=3 guardians");
        for (uint256 i = 0; i < _guardians.length; i++) {
            require(!guardians[_guardians[i]], "Duplicate");
            guardians[_guardians[i]] = true;
            emit GuardianChanged(_guardians[i], true);
        }
        guardianCount = _guardians.length;
    }

    function hashTx(address target, bytes memory data) public pure returns (bytes32) {
        return keccak256(abi.encode(target, data));
    }

    function queue(address target, bytes memory data) external onlyGuardian returns (bytes32) {
        bytes32 txHash = hashTx(target, data);
        require(txs[txHash].target == address(0), "Exists");
        txs[txHash] = Tx({
            target: target,
            data: data,
            eta: block.timestamp + MIN_DELAY,
            confirmations: 0,
            executed: false,
            cancelled: false
        });
        txList.push(txHash);
        emit Queued(txHash, target, data, txs[txHash].eta);
        return txHash;
    }

    function confirm(bytes32 txHash) external onlyGuardian {
        Tx storage tx = txs[txHash];
        require(tx.target != address(0), "Not found");
        require(!tx.executed, "Done");
        require(!tx.cancelled, "Cancelled");
        require(block.timestamp >= tx.eta, "Locked");

        if (tx.confirmations < REQUIRED) {
            tx.confirmations++;
        }
        if (tx.confirmations >= REQUIRED) {
            _execute(txHash, tx);
        }
    }

    function execute(bytes32 txHash) external onlyGuardian {
        Tx storage tx = txs[txHash];
        require(tx.target != address(0), "Not found");
        require(!tx.executed, "Done");
        require(!tx.cancelled, "Cancelled");
        require(tx.confirmations >= REQUIRED, "No votes");
        require(block.timestamp >= tx.eta, "Locked");
        _execute(txHash, tx);
    }

    function _execute(bytes32 txHash, Tx storage tx) internal {
        tx.executed = true;
        (bool ok, ) = tx.target.delegatecall(tx.data);
        require(ok, "Failed");
        emit Executed(txHash);
    }

    function cancel(bytes32 txHash) external onlyGuardian {
        Tx storage tx = txs[txHash];
        require(tx.target != address(0), "Not found");
        require(!tx.executed, "Done");
        tx.cancelled = true;
        emit Cancelled(txHash);
    }

    function addGuardian(address g) external onlyGuardian {
        require(!guardians[g], "Exists");
        guardians[g] = true;
        guardianCount++;
        emit GuardianChanged(g, true);
    }

    function removeGuardian(address g) external onlyGuardian {
        require(guardians[g], "Not guardian");
        require(guardianCount > 3, "Min 3");
        guardians[g] = false;
        guardianCount--;
        emit GuardianChanged(g, false);
    }
}
