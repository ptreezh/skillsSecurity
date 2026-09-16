const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("SelfSustainingEcosystem (ReputationIncentives)", function() {
  async function deploy() {
    const { staking, registry, attribution, owner, user1, user2, accounts } =
      await loadFixture(deployContracts);

    const SSE = await ethers.getContractFactory("SelfSustainingEcosystem");
    const sse = await SSE.deploy();
    await sse.waitForDeployment();

    // Wire: staking.setReputationOracle(sse) → sse.claimRewards can call staking.addReputation
    await staking.setReputationOracle(sse);
    // Wire: sse.setStakingManager(staking) → sse.claimRewards uses staking as authoritative source
    await sse.setStakingManager(staking);
    // Wire: governance = owner for setRoleBaseReward testing
    await sse.setGovernance(owner.address);
    // Wire: optional dependencies for health report
    await sse.setSkillRegistry(registry);
    await sse.setAttribution(attribution);

    return { sse, staking, registry, attribution, owner, user1, user2, accounts };
  }

  describe("Role Registration", function() {
    it("should register a role in BRONZE tier", async function() {
      const { sse, user1 } = await deploy();

      await expect(sse.connect(user1).registerRole(0)) // ReputationRole.CREATOR = 0
        .to.emit(sse, "RoleRegistered")
        .withArgs(user1.address, 0);

      const info = await sse.getRoleInfo(user1.address, 0);
      expect(info.tier).to.equal(0); // BRONZE
      expect(info.contributions).to.equal(0);
    });

    it("should increment totalUsers and activeRoles on first registration", async function() {
      const { sse, user1 } = await deploy();
      expect(await sse.totalUsers()).to.equal(0);

      await sse.connect(user1).registerRole(0);
      expect(await sse.totalUsers()).to.equal(1);
      expect(await sse.activeRoles()).to.equal(1);
    });

    it("should not increment totalUsers on second role by same user", async function() {
      const { sse, user1 } = await deploy();
      await sse.connect(user1).registerRole(0); // first role → totalUsers++
      await sse.connect(user1).registerRole(1); // second role → totalUsers stays 1

      expect(await sse.totalUsers()).to.equal(1);
      expect(await sse.activeRoles()).to.equal(2);
    });

    it("should revert on duplicate role registration", async function() {
      const { sse, user1 } = await deploy();
      await sse.connect(user1).registerRole(0);

      await expect(sse.connect(user1).registerRole(0))
        .to.be.revertedWith("Role already registered");
    });
  });

  describe("Contributions and Tier Upgrade", function() {
    it("should record contributions and emit event", async function() {
      const { sse, user1 } = await deploy();
      await sse.connect(user1).registerRole(0);

      await expect(sse.connect(user1).recordContribution(0, 5))
        .to.emit(sse, "ContributionRecorded")
        .withArgs(user1.address, 0, 5, 5);

      expect(await sse.totalContributions()).to.equal(5);
    });

    it("should auto-upgrade to SILVER when contribution threshold met", async function() {
      const { sse, user1 } = await deploy();
      await sse.connect(user1).registerRole(0);

      // SILVER threshold = 10 contributions
      await sse.connect(user1).recordContribution(0, 10);

      const info = await sse.getRoleInfo(user1.address, 0);
      expect(info.tier).to.equal(1); // SILVER

      expect(await sse.tierCounts(0)).to.equal(0); // BRONZE count decreased
      expect(await sse.tierCounts(1)).to.equal(1); // SILVER count increased
    });

    it("should auto-upgrade to GOLD when threshold met (>=50 contributions)", async function() {
      const { sse, user1 } = await deploy();
      await sse.connect(user1).registerRole(0);

      // First push to SILVER
      await sse.connect(user1).recordContribution(0, 10);
      // Then push to GOLD
      await sse.connect(user1).recordContribution(0, 40);

      const info = await sse.getRoleInfo(user1.address, 0);
      expect(info.tier).to.equal(2); // GOLD

      expect(await sse.tierCounts(2)).to.equal(1);
    });

    it("should revert getRoleInfo for unregistered role", async function() {
      const { sse, user1 } = await deploy();

      await expect(sse.getRoleInfo(user1.address, 0))
        .to.be.revertedWith("Role not registered");
    });
  });

  describe("Rewards", function() {
    it("should add rewards and claim them (reputation written to staking)", async function() {
      const { sse, staking, owner, user1 } = await deploy();
      await sse.connect(user1).registerRole(0);
      await sse.connect(user1).recordContribution(0, 5);

      // Owner adds reward
      await sse.connect(owner).addRewards(user1.address, 0, 100);

      // Claim
      await expect(sse.connect(user1).claimRewards())
        .to.emit(sse, "RewardClaimed")
        .withArgs(user1.address, 100);

      // Verify reputation written to StakingManager (authority source)
      const rep = await staking.getUserReputation(user1.address);
      expect(rep).to.equal(100);
    });

    it("should revert claimRewards when no rewards exist", async function() {
      const { sse, user1 } = await deploy();
      await sse.connect(user1).registerRole(0);

      await expect(sse.connect(user1).claimRewards())
        .to.be.revertedWith("No rewards to claim");
    });

    it("should revert claimRewards when stakingManager not set", async function() {
      const SSE = await ethers.getContractFactory("SelfSustainingEcosystem");
      const sse2 = await SSE.deploy();
      const [owner, user1] = await ethers.getSigners();
      await sse2.connect(owner).addRewards(user1.address, 0, 100);
      // Note: user1 must have role registered to claimRewards
      await sse2.connect(user1).registerRole(0);
      await sse2.connect(owner).addRewards(user1.address, 0, 100);

      await expect(sse2.connect(user1).claimRewards())
        .to.be.revertedWith("StakingManager not set");
    });

    it("setRoleBaseReward should only be callable by governance", async function() {
      const { sse, user1 } = await deploy();

      // Non-governance call should revert
      await expect(
        sse.connect(user1).setRoleBaseReward(0, 200)
      ).to.be.revertedWith("Not governance");

      // Owner (governance) should succeed
      await sse.setRoleBaseReward(0, 200);
      expect(await sse.getRoleBaseReward(0)).to.equal(200);
    });
  });

  describe("Report Submission", function() {
    it("should submit report and emit event", async function() {
      const { sse, staking, owner, user1 } = await deploy();

      const reportHash = ethers.keccak256(ethers.toUtf8Bytes("report-1"));
      await expect(sse.connect(user1).submitReport(1, reportHash))
        .to.emit(sse, "ReportSubmitted");

      // Report reward (10) written to staking
      const rep = await staking.getUserReputation(user1.address);
      expect(rep).to.equal(10); // REPORT_REWARD = 10
    });

    it("should revert duplicate report (same skillId + reportHash)", async function() {
      const { sse, user1 } = await deploy();
      const reportHash = ethers.keccak256(ethers.toUtf8Bytes("dup-report"));
      await sse.connect(user1).submitReport(1, reportHash);

      await expect(sse.connect(user1).submitReport(1, reportHash))
        .to.be.revertedWith("Report already submitted");
    });

    it("should allow same reportHash with different skillId after cooldown", async function() {
      const { sse, user1 } = await deploy();
      const reportHash = ethers.keccak256(ethers.toUtf8Bytes("multi-skill"));

      await sse.connect(user1).submitReport(1, reportHash);
      await time.increase(2 * 24 * 60 * 60); // advance past REPORT_COOLDOWN (1 day)
      await expect(sse.connect(user1).submitReport(2, reportHash))
        .to.emit(sse, "ReportSubmitted");
    });

    it("should revert when report cooldown is active (< 1 day)", async function() {
      const { sse, user1 } = await deploy();
      const reportHash1 = ethers.keccak256(ethers.toUtf8Bytes("cool1"));
      const reportHash2 = ethers.keccak256(ethers.toUtf8Bytes("cool2"));

      await sse.connect(user1).submitReport(1, reportHash1);
      // Advance only 12 hours (not full day)
      await time.increase(12 * 60 * 60);

      await expect(sse.connect(user1).submitReport(2, reportHash2))
        .to.be.revertedWith("Report cooldown active");
    });

    it("should allow report after cooldown expires (> 1 day)", async function() {
      const { sse, user1 } = await deploy();
      const reportHash1 = ethers.keccak256(ethers.toUtf8Bytes("cd1"));
      const reportHash2 = ethers.keccak256(ethers.toUtf8Bytes("cd2"));

      await sse.connect(user1).submitReport(1, reportHash1);
      await time.increase(2 * 24 * 60 * 60); // advance 2 days

      await expect(sse.connect(user1).submitReport(2, reportHash2))
        .to.emit(sse, "ReportSubmitted");
    });

    it("should revert with invalid skillId (0)", async function() {
      const { sse, user1 } = await deploy();
      const hash = ethers.keccak256(ethers.toUtf8Bytes("zero"));
      await expect(sse.connect(user1).submitReport(0, hash))
        .to.be.revertedWith("Invalid skillId");
    });
  });

  describe("Health Report", function() {
    it("should return non-zero aggregated health report", async function() {
      const { sse, owner, user1, user2 } = await deploy();
      await sse.connect(user1).registerRole(0);
      await sse.connect(user1).recordContribution(0, 10);
      await sse.connect(user2).registerRole(1);

      const report = await sse.generateHealthReport();
      // user1 has 1 role (CREATOR with 10 contributions → SILVER), user2 has 1 role (AUDITOR)
      // activeRoles = 2 (one registerRole call each), totalUsers = 2
      expect(report.totalUsers).to.equal(2);
      expect(report.activeRoles).to.equal(2);
      expect(report.totalContributions).to.equal(10);
    });
  });

  describe("Owner Setters", function() {
    it("setReputationBadges / setGovernance / setSkillRegistry / setAttribution revert on zero address", async function() {
      const { sse, owner } = await deploy();

      await expect(sse.connect(owner).setReputationBadges(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
      await expect(sse.connect(owner).setGovernance(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
      await expect(sse.connect(owner).setSkillRegistry(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
      await expect(sse.connect(owner).setAttribution(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("owner-only setters revert for non-owner", async function() {
      const { sse, user1 } = await deploy();

      await expect(sse.connect(user1).addRewards(user1.address, 0, 10))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
