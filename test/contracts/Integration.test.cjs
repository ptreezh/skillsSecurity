const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("Integration Tests", function() {
  const fixture = deployContracts;

  async function deploy() {
    const result = await loadFixture(fixture);
    // Fund registry with tokens for stakes
    await result.token.transfer(result.registry.target, ethers.parseEther("1000000"));
    return result;
  }

  // Helper to give effective reputation via setEffectiveReputation (test-only)
  async function giveEffectiveReputation(staking, owner, user, targetAmount) {
    await staking.connect(owner).setEffectiveReputation(user.address, targetAmount);
  }

  // ========================================================================
  // INTG-01: Full Deployment Verification
  // ========================================================================

  describe("INTG-01: Full Deployment", function() {

    it("should deploy all contracts in correct order", async function() {
      const { token, staking, registry, attribution, owner } = await loadFixture(fixture);
      // Verify all addresses are non-zero
      expect(token.target).to.not.equal(ethers.ZeroAddress);
      expect(staking.target).to.not.equal(ethers.ZeroAddress);
      expect(registry.target).to.not.equal(ethers.ZeroAddress);
      expect(attribution.target).to.not.equal(ethers.ZeroAddress);
    });

    it("should wire SkillRegistry to StakingManager", async function() {
      const { registry, staking } = await loadFixture(fixture);
      // SkillRegistry.stakingManager() should return StakingManager address
      const wiredStaking = await registry.stakingManager();
      expect(wiredStaking).to.equal(staking.target);
    });

    it("should wire Attribution to StakingManager", async function() {
      const { attribution, staking } = await loadFixture(fixture);
      // Attribution.stakingManager() should return StakingManager address
      const wiredStaking = await attribution.stakingManager();
      expect(wiredStaking).to.equal(staking.target);
    });

    it("should have correct token references in all contracts", async function() {
      const { token, staking, registry } = await loadFixture(fixture);
      expect(await staking.token()).to.equal(token.target);
      expect(await registry.token()).to.equal(token.target);
    });
  });

  // ========================================================================
  // INTG-02: Reputation Flow (register -> verify -> positive contribution -> recovery)
  // ========================================================================

  describe("INTG-02: Reputation Flow", function() {

    it("should complete full reputation flow: register -> verify -> positive contribution", async function() {
      const { registry, staking, token, owner, user1, user2 } = await deploy();

      // Step 1: user1 registers LOW skill (no reputation threshold)
      await token.transfer(user1.address, ethers.parseEther("100"));
      await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
      const tx = await registry.connect(user1).registerSkill(
        "RepFlowSkill", "Test", "trigger", "QmRepFlow", 0, "v1"
      );
      const receipt = await tx.wait();
      // Get skillId from SkillRegistered event
      const event = receipt.logs.find(log => log.fragment?.name === "SkillRegistered");
      const skillId = event.args[1]; // skillId is second arg

      // Step 2: user2 gets 100 effective reputation to verify
      await giveEffectiveReputation(staking, owner, user2, 100);

      // Step 3: Verify with pass=true -> should trigger setPositiveContribution
      await expect(registry.connect(user2).verifySkill(skillId, true))
        .to.emit(staking, "PositiveContributionSet")
        .withArgs(user2.address);

      // Step 4: Verify state changed
      expect(await staking.hasPositiveContribution(user2.address)).to.be.true;

      // Step 5: Verify recovery calculation available
      const [locked, lastClaim] = await staking.getRecoverableReputation(user2.address);
      expect(locked).to.equal(0); // No lock yet
    });

    it("should not trigger positive contribution when verify with pass=false", async function() {
      const { registry, staking, token, owner, user1, user2 } = await deploy();

      await token.transfer(user1.address, ethers.parseEther("100"));
      await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
      const tx = await registry.connect(user1).registerSkill(
        "FailVerify", "Test", "trigger", "QmFail", 0, "v1"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === "SkillRegistered");
      const skillId = event.args[1];

      await giveEffectiveReputation(staking, owner, user2, 100);
      await registry.connect(user2).verifySkill(skillId, false);

      expect(await staking.hasPositiveContribution(user2.address)).to.be.false;
    });

    it("should lock reputation on slash then allow recovery after positive contribution", async function() {
      const { staking, owner, user1 } = await deploy();
      const penalty = -100;

      // Lock reputation via slashLiker
      await expect(staking.slashLiker(user1.address, penalty, "Test slash"))
        .to.emit(staking, "ReputationLocked")
        .withArgs(user1.address, 100);

      // Verify locked amount
      const [locked, lastClaim] = await staking.getRecoverableReputation(user1.address);
      expect(locked).to.equal(100);

      // Set positive contribution
      await staking.setPositiveContribution(user1.address);
      expect(await staking.hasPositiveContribution(user1.address)).to.be.true;

      // Advance 1 month and claim
      await time.increase(30 * 24 * 60 * 60);
      await mine();

      await expect(staking.connect(user1).claimRecoverableReputation())
        .to.emit(staking, "RecoveryClaimed")
        .withArgs(user1.address, 5, 95); // 5% of 100 = 5
    });

    it("should verify reputation flow with MEDIUM skill requiring 500 reputation", async function() {
      const { registry, staking, token, owner, user1, user2 } = await deploy();

      // Give user1 500 effective reputation to register MEDIUM skill
      await giveEffectiveReputation(staking, owner, user1, 500);
      await token.transfer(user1.address, ethers.parseEther("500"));
      await token.connect(user1).approve(registry.target, ethers.parseEther("500"));

      await registry.connect(user1).registerSkill(
        "MediumSkill", "Test", "trigger", "QmMedium", 1, "v1" // RiskLevel.MEDIUM
      );

      // user2 verifies with pass=true
      await giveEffectiveReputation(staking, owner, user2, 500);
      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(staking, "PositiveContributionSet")
        .withArgs(user2.address);
    });

    it("should emit SkillRegistered and SkillVerified events in reputation flow", async function() {
      const { registry, staking, token, owner, user1, user2 } = await deploy();
      await token.transfer(user1.address, ethers.parseEther("100"));
      await token.connect(user1).approve(registry.target, ethers.parseEther("100"));

      await expect(registry.connect(user1).registerSkill(
        "EventTest", "Test", "trigger", "QmEvent", 0, "v1"
      )).to.emit(registry, "SkillRegistered");

      await giveEffectiveReputation(staking, owner, user2, 100);
      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(registry, "SkillVerified");
    });
  });
});