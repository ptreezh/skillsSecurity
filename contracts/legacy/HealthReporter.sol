// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HealthReporter
 * @notice Self-operation health report incentive contract (自运维)
 * @dev Deployers report protocol health status and receive rewards
 */
contract HealthReporter is Ownable {

    // === Configuration ===
    struct RewardConfig {
        uint256 bugReportReward;      // Bug report reward (ASK)
        uint256 statusReportReward;   // Status report reward (ASK)
        uint256 stressTestReward;     // Stress test participation reward (ASK)
        uint256 maxMonthlyReports;    // Maximum reports per month
    }

    RewardConfig public rewardConfig = RewardConfig({
        bugReportReward: 50e18,       // 50 ASK per bug report
        statusReportReward: 10e18,    // 10 ASK per status report
        stressTestReward: 100e18,     // 100 ASK per stress test
        maxMonthlyReports: 10         // Max 10 per month
    });

    // === State ===
    IERC20 public askToken;
    address public deployerRewards;

    // Report records
    struct Report {
        address reporter;
        uint8 reportType;    // 1=Bug, 2=Status, 3=StressTest
        string description;
        uint256 timestamp;
        uint256 reward;
        bool validated;
    }

    Report[] public reports;
    mapping(address => uint256[]) public reporterReports;
    mapping(address => uint256) public reporterMonthlyCount;
    mapping(address => uint256) public reporterLastReset;

    // Validated bugs (prevent duplicate rewards)
    mapping(bytes32 => bool) public validatedBugs;

    // Events
    event ReportSubmitted(uint256 indexed reportId, address indexed reporter, uint8 reportType, uint256 reward);
    event ReportValidated(uint256 indexed reportId, uint256 reward);
    event BugValidated(bytes32 indexed bugHash);

    // Errors
    error MonthlyLimitReached();
    error InvalidReportType();
    error BugAlreadyValidated();
    error ZeroDescription();

    constructor(address _askToken) {
        if (_askToken == address(0)) revert ZeroAddress();
        askToken = IERC20(_askToken);
        _transferOwnership(msg.sender);
    }

    // === Management Functions ===

    function setDeployerRewards(address _deployerRewards) external onlyOwner {
        deployerRewards = _deployerRewards;
    }

    function updateRewardConfig(
        uint256 _bugReward,
        uint256 _statusReward,
        uint256 _stressReward,
        uint256 _maxMonthly
    ) external onlyOwner {
        rewardConfig = RewardConfig({
            bugReportReward: _bugReward,
            statusReportReward: _statusReward,
            stressTestReward: _stressReward,
            maxMonthlyReports: _maxMonthly
        });
    }

    // === Report Functions ===

    /// @notice Submit health report (anyone can submit)
    /// @param reportType 1=Bug, 2=Status, 3=StressTest
    /// @param description Report description (IPFS hash or plaintext)
    function submitReport(uint8 reportType, string calldata description) external {
        if (reportType < 1 || reportType > 3) revert InvalidReportType();
        if (bytes(description).length == 0) revert ZeroDescription();

        // Check monthly limit (only for deployers)
        if (deployerRewards != address(0)) {
            _checkMonthlyLimit(msg.sender);
        }

        // Calculate reward
        uint256 reward;
        if (reportType == 1) {
            // Bug reports need validation before reward
            reward = 0;
        } else if (reportType == 2) {
            reward = rewardConfig.statusReportReward;
        } else {
            reward = rewardConfig.stressTestReward;
        }

        // Create report
        Report memory report = Report({
            reporter: msg.sender,
            reportType: reportType,
            description: description,
            timestamp: block.timestamp,
            reward: reward,
            validated: false
        });

        reports.push(report);
        uint256 reportId = reports.length - 1;

        // Record for reporter
        reporterReports[msg.sender].push(reportId);

        // Immediately transfer non-Bug rewards
        if (reward > 0) {
            _transferReward(msg.sender, reward);
        }

        emit ReportSubmitted(reportId, msg.sender, reportType, reward);
    }

    /// @notice Validate bug report and release reward (owner only)
    /// @param reportId Report ID
    function validateBugReport(uint256 reportId) external onlyOwner {
        require(reportId < reports.length, "Invalid report ID");
        Report storage report = reports[reportId];
        require(report.reportType == 1, "Not a bug report");
        require(!report.validated, "Already validated");

        // Generate bug hash to prevent duplicates
        bytes32 bugHash = keccak256(abi.encodePacked(report.description, report.reporter));
        require(!validatedBugs[bugHash], "Bug already validated");

        // Validate and release reward
        report.validated = true;
        validatedBugs[bugHash] = true;

        uint256 reward = rewardConfig.bugReportReward;
        report.reward = reward;

        _transferReward(report.reporter, reward);

        emit ReportValidated(reportId, reward);
        emit BugValidated(bugHash);
    }

    /// @notice Get reporter's active status (for reward judgment)
    /// @param deployer Deployer address
    /// @return Whether is active reporter
    function isActiveReporter(address deployer) external view returns (bool) {
        if (reporterReports[deployer].length == 0) return false;

        uint256 lastReportTime = reports[reporterReports[deployer][reporterReports[deployer].length - 1]].timestamp;
        return block.timestamp - lastReportTime < 30 days;
    }

    // === Internal Functions ===

    function _checkMonthlyLimit(address reporter) internal {
        uint256 currentMonth = block.timestamp / 30 days;
        uint256 storedMonth = reporterLastReset[reporter] / 30 days;

        if (currentMonth > storedMonth) {
            reporterMonthlyCount[reporter] = 0;
            reporterLastReset[reporter] = block.timestamp;
        }

        if (reporterMonthlyCount[reporter] >= rewardConfig.maxMonthlyReports) {
            revert MonthlyLimitReached();
        }

        reporterMonthlyCount[reporter]++;
    }

    function _transferReward(address to, uint256 amount) internal {
        require(askToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        askToken.transfer(to, amount);
    }

    error ZeroAddress();
}