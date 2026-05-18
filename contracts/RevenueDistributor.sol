// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDeployerRewards.sol";

/**
 * @title RevenueDistributor
 * @notice Self-operation revenue allocator - automatically distributes protocol revenue to deployers
 * @dev Automatically calculates dividend ratios based on deployer tier and promotion performance
 */
contract RevenueDistributor is Ownable {
    // === Configuration ===
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_DISTRIBUTION = 1e18; // Minimum dividend 1 ASK

    // Distribution ratio configuration (basis points)
    struct DistributionRatios {
        uint16 toDeployers;        // Total dividend ratio to deployers (e.g., 5000 = 50%)
        uint16 toTreasury;         // Treasury ratio
        uint16 toStakingPool;      // Staking pool ratio
    }

    DistributionRatios public distributionRatios = DistributionRatios({
        toDeployers: 5000,    // 50%
        toTreasury: 3000,     // 30%
        toStakingPool: 2000   // 20%
    });

    // Deployer dividend configuration
    struct DeployerShare {
        uint16 bronze;       // Bronze deployer ratio (basis points)
        uint16 silver;       // Silver deployer ratio (basis points)
        uint16 gold;         // Gold deployer ratio (basis points)
    }

    DeployerShare public deployerShares = DeployerShare({
        bronze: 4000,  // Bronze: 40%
        silver: 6000,  // Silver: 60%
        gold: 8000     // Gold: 80%
    });

    // === State ===
    IERC20 public askToken;
    address public deployerRewards;
    address public treasury;
    address public stakingPool;

    // Cumulative dividend records
    mapping(address => uint256) public cumulativeDividends;
    mapping(address => uint256) public lastClaimedAt;

    // Events
    event RevenueReceived(uint256 amount, uint256 toDeployers, uint256 toTreasury, uint256 toStaking);
    event DividendsDistributed(address indexed deployer, uint256 amount, uint256 totalDistributors);
    event DistributionRatiosUpdated(uint16 toDeployers, uint16 toTreasury, uint16 toStaking);
    event DeployerSharesUpdated(uint16 bronze, uint16 silver, uint16 gold);

    // === Errors ===
    error InvalidRatio();
    error InsufficientBalance();
    error NoDeployersToDistribute();
    error ZeroAddress();

    constructor(address _askToken) {
        if (_askToken == address(0)) revert ZeroAddress();
        askToken = IERC20(_askToken);
        _transferOwnership(msg.sender);
    }

    // === Management Functions ===

    function setDeployerRewards(address _deployerRewards) external onlyOwner {
        require(_deployerRewards != address(0), "Zero address");
        deployerRewards = _deployerRewards;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }

    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "Zero address");
        stakingPool = _stakingPool;
    }

    function updateDistributionRatios(
        uint16 _toDeployers,
        uint16 _toTreasury,
        uint16 _toStakingPool
    ) external onlyOwner {
        if (_toDeployers + _toTreasury + _toStakingPool != BASIS_POINTS) {
            revert InvalidRatio();
        }
        distributionRatios = DistributionRatios({
            toDeployers: _toDeployers,
            toTreasury: _toTreasury,
            toStakingPool: _toStakingPool
        });
        emit DistributionRatiosUpdated(_toDeployers, _toTreasury, _toStakingPool);
    }

    function updateDeployerShares(
        uint16 _bronze,
        uint16 _silver,
        uint16 _gold
    ) external onlyOwner {
        if (_bronze > BASIS_POINTS || _silver > BASIS_POINTS || _gold > BASIS_POINTS) {
            revert InvalidRatio();
        }
        deployerShares = DeployerShare({
            bronze: _bronze,
            silver: _silver,
            gold: _gold
        });
        emit DeployerSharesUpdated(_bronze, _silver, _gold);
    }

    // === Dividend Functions ===

    /// @notice Receive revenue and automatically distribute
    /// @dev Anyone can call, revenue source can be staking fees, gas rebates, etc.
    function distribute() external {
        uint256 balance = askToken.balanceOf(address(this));
        require(balance >= MIN_DISTRIBUTION, "Insufficient balance");

        // Calculate distribution amounts
        uint256 toDeployers = (balance * distributionRatios.toDeployers) / BASIS_POINTS;
        uint256 toTreasuryAmt = (balance * distributionRatios.toTreasury) / BASIS_POINTS;
        uint256 toStakingAmt = balance - toDeployers - toTreasuryAmt;

        // Distribute to deployers
        if (toDeployers > 0) {
            _distributeToDeployers(toDeployers);
        }

        // Transfer to treasury
        if (toTreasuryAmt > 0 && treasury != address(0)) {
            askToken.transfer(treasury, toTreasuryAmt);
        }

        // Transfer to staking pool
        if (toStakingAmt > 0 && stakingPool != address(0)) {
            askToken.transfer(stakingPool, toStakingAmt);
        }

        emit RevenueReceived(balance, toDeployers, toTreasuryAmt, toStakingAmt);
    }

    /// @notice Internal: Distribute to all deployers
    function _distributeToDeployers(uint256 totalAmount) internal {
        if (deployerRewards == address(0)) return;

        uint256 deployerCount = IDeployerRewards(deployerRewards).getDeployerCount();
        if (deployerCount == 0) revert NoDeployersToDistribute();

        // Calculate weights for each tier
        uint256 totalWeight;
        address[] memory goldDeployers = new address[](deployerCount);
        uint256 goldCount;

        // Collect gold deployers (priority distribution)
        for (uint256 i = 0; i < deployerCount; i++) {
            address deployer = IDeployerRewards(deployerRewards).deployerList(i);
            if (IDeployerRewards(deployerRewards).isGoldTier(deployer)) {
                goldDeployers[goldCount++] = deployer;
            }
            totalWeight += IDeployerRewards(deployerRewards).getGovernanceWeight(deployer);
        }

        // Distribute to gold deployers (priority)
        uint256 goldShare = (totalAmount * deployerShares.gold) / BASIS_POINTS;
        if (goldShare > 0 && goldCount > 0) {
            uint256 perGold = goldShare / goldCount;
            for (uint256 i = 0; i < goldCount; i++) {
                address deployer = goldDeployers[i];
                if (perGold >= MIN_DISTRIBUTION) {
                    askToken.transfer(deployer, perGold);
                    cumulativeDividends[deployer] += perGold;
                    lastClaimedAt[deployer] = block.timestamp;
                    emit DividendsDistributed(deployer, perGold, goldCount);
                }
            }
        }

        // Remaining distributed to all deployers (by weight)
        uint256 remaining = totalAmount - goldShare;
        if (remaining > 0 && totalWeight > 0) {
            for (uint256 i = 0; i < deployerCount; i++) {
                address deployer = IDeployerRewards(deployerRewards).deployerList(i);
                // Skip already received gold distribution
                if (IDeployerRewards(deployerRewards).isGoldTier(deployer)) continue;

                uint256 weight = IDeployerRewards(deployerRewards).getGovernanceWeight(deployer);
                uint256 share = (remaining * weight) / totalWeight;

                if (share >= MIN_DISTRIBUTION) {
                    askToken.transfer(deployer, share);
                    cumulativeDividends[deployer] += share;
                    lastClaimedAt[deployer] = block.timestamp;
                    emit DividendsDistributed(deployer, share, deployerCount);
                }
            }
        }
    }

    /// @notice Query deployer cumulative dividends
    function getCumulativeDividends(address deployer) external view returns (uint256) {
        return cumulativeDividends[deployer];
    }

    /// @notice Get pending dividends total
    function getPendingDividends() external view returns (uint256) {
        return askToken.balanceOf(address(this));
    }
}