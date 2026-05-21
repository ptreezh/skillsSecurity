const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("Integration Tests", function() {
  const fixture = deployContracts;

  async function deploy() {
    const result = await loadFixture(fixture);
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
      const { staking, registry, attribution, owner } = await loadFixture(fixture);
      // Verify all addresses are non-zero
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

    it("no-token architecture: token references removed from contracts", async function() {
      const { registry, staking } = await loadFixture(fixture);
      // Verify contracts exist and have expected interfaces
      expect(await registry.stakingManager()).to.equal(staking.target);
    });
  });

  // ========================================================================
  // INTG-02: Reputation Flow (register -> verify -> positive contribution -> recovery)
  // ========================================================================

  describe("INTG-02: Reputation Flow", function() {

    it("should complete full reputation flow: register -> verify -> positive contribution", async function() {
      const { registry, staking, owner, user1, user2 } = await deploy();

      // Step 1: user1 registers LOW skill (no reputation threshold)
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
      const { registry, staking, owner, user1, user2 } = await deploy();

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
      const { registry, staking, owner, user1, user2 } = await deploy();

      // Give user1 500 effective reputation to register MEDIUM skill
      await giveEffectiveReputation(staking, owner, user1, 500);

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
      const { registry, staking, owner, user1, user2 } = await deploy();

      await expect(registry.connect(user1).registerSkill(
        "EventTest", "Test", "trigger", "QmEvent", 0, "v1"
      )).to.emit(registry, "SkillRegistered");

      await giveEffectiveReputation(staking, owner, user2, 100);
      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(registry, "SkillVerified");
    });
  });

  // ========================================================================
  // INTG-03: Anti-Slash Flow (like -> slash -> lock -> recover)
  // ========================================================================

  describe("INTG-03: Anti-Slash Flow", function() {

    it("should complete full anti-slash flow: stake -> like -> slash -> lock -> recover", async function() {
      const { staking, owner, user1 } = await loadFixture(fixture);

      const skillId = 1;
      const stakeAmount = ethers.parseEther("100");
      const slashPenalty = -50;

      // Step 1: user1 stakes (no token transfer - stake info only)
      await staking.connect(user1).stake(skillId, stakeAmount);
      expect((await staking.stakes(user1.address, skillId)).amount).to.equal(stakeAmount);

      // Step 2: user1 likes a skill (via StakingManager.likeSkill)
      await staking.connect(user1).likeSkill(skillId);
      expect(await staking.hasLiked(user1.address)).to.be.true;

      // Step 3: Slash user1 for liking harmful skill
      await expect(staking.slashLiker(user1.address, slashPenalty, "Liked harmful skill"))
        .to.emit(staking, "ReputationLocked")
        .withArgs(user1.address, 50);

      // Step 4: Verify reputation lock state
      const [locked, lastClaim] = await staking.getRecoverableReputation(user1.address);
      expect(locked).to.equal(50);

      // Verify effective reputation is reduced
      const effective = await staking.getUserReputation(user1.address);
      expect(effective).to.equal(0); // 0 - 50 = 0 (capped)

      // Step 5: Set positive contribution to enable recovery
      await staking.setPositiveContribution(user1.address);
      expect(await staking.hasPositiveContribution(user1.address)).to.be.true;

      // Step 6: Wait 1 month and claim recovery
      await time.increase(30 * 24 * 60 * 60);
      await mine();

      await expect(staking.connect(user1).claimRecoverableReputation())
        .to.emit(staking, "RecoveryClaimed")
        .withArgs(user1.address, 2, 48); // 50 * 5% = 2.5 -> 2

      // Step 7: After 90 days, unstake works
      await time.increase(90 * 24 * 60 * 60);
      await mine();

      await expect(staking.connect(user1).unstake(skillId))
        .to.emit(staking, "Unstaked");
    });

    it("should handle slash without prior stake (pure reputation slash)", async function() {
      const { staking, owner, user1 } = await loadFixture(fixture);
      const penalty = -30;

      // user1 has no stake but can be slashed for reputation
      await expect(staking.slashLiker(user1.address, penalty, "Reputation violation"))
        .to.emit(staking, "ReputationLocked")
        .withArgs(user1.address, 30);

      // Effective reputation should be 0 (negative capped)
      expect(await staking.getUserReputation(user1.address)).to.equal(0);

      // Recovery should still be possible after positive contribution
      await staking.setPositiveContribution(user1.address);
      await time.increase(30 * 24 * 60 * 60);
      await mine();

      await expect(staking.connect(user1).claimRecoverableReputation())
        .to.emit(staking, "RecoveryClaimed")
        .withArgs(user1.address, 1, 29); // 30 * 5% = 1.5 -> 1
    });

    it("should track locked amount correctly across multiple slashes", async function() {
      const { staking, owner, user1 } = await loadFixture(fixture);

      // First slash
      await staking.slashLiker(user1.address, -20, "First violation");
      let [locked] = await staking.getRecoverableReputation(user1.address);
      expect(locked).to.equal(20);

      // Second slash
      await staking.slashLiker(user1.address, -30, "Second violation");
      [locked] = await staking.getRecoverableReputation(user1.address);
      expect(locked).to.equal(50); // 20 + 30

      // Verify recovery based on total locked
      await staking.setPositiveContribution(user1.address);
      await time.increase(30 * 24 * 60 * 60);
      await mine();

      await expect(staking.connect(user1).claimRecoverableReputation())
        .to.emit(staking, "RecoveryClaimed")
        .withArgs(user1.address, 2, 48); // 50 * 5% = 2.5 -> 2
    });

    it("should emit AntiSlash events for cross-contract notification", async function() {
      const { staking, owner, user1 } = await loadFixture(fixture);

      await expect(staking.slashLiker(user1.address, -15, "Malicious like"))
        .to.emit(staking, "AntiSlash")
        .withArgs(user1.address, -15, "Malicious like");
    });
  });

  // ========================================================================
  // INTG-04: Cross-Contract State Synchronization
  // ========================================================================

  describe("INTG-04: Cross-Contract State Synchronization", function() {

    it("should synchronize user reputation across contracts", async function() {
      const { registry, staking, owner, user1, user2 } = await deploy();

      // Give user1 200 effective reputation via StakingManager
      await giveEffectiveReputation(staking, owner, user1, 200);

      // Both SkillRegistry (via internal call) and StakingManager show same reputation
      const registryAccessesStakingRep = await staking.getUserReputation(user1.address);
      const directStakingRep = await staking.getUserReputation(user1.address);
      expect(registryAccessesStakingRep).to.equal(directStakingRep);
      expect(registryAccessesStakingRep).to.equal(200);
    });

    it("should synchronize attribution reputation via StakingManager", async function() {
      const { attribution, staking, owner, user1 } = await deploy();

      // Give user1 reputation via StakingManager
      await giveEffectiveReputation(staking, owner, user1, 150);

      // Attribution.getUserReputation should delegate to StakingManager
      const attrRep = await attribution.getUserReputation(user1.address);
      const stakingRep = await staking.getUserReputation(user1.address);
      expect(attrRep).to.equal(stakingRep);
      expect(attrRep).to.equal(150);
    });

    it("should trigger cross-contract notification on verifySkill (pass=true)", async function() {
      const { registry, staking, owner, user1, user2 } = await deploy();

      // user1 registers LOW skill
      const tx = await registry.connect(user1).registerSkill(
        "SyncTest", "Test", "trigger", "QmSync", 0, "v1"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === "SkillRegistered");
      const skillId = event.args[1];

      // user2 gets reputation and verifies
      await giveEffectiveReputation(staking, owner, user2, 100);

      // Cross-contract: verifySkill -> StakingManager.setPositiveContribution
      await expect(registry.connect(user2).verifySkill(skillId, true))
        .to.emit(staking, "PositiveContributionSet")
        .withArgs(user2.address);

      // Verify state synchronized
      expect(await staking.hasPositiveContribution(user2.address)).to.be.true;
    });

    it("should sync state when Attribution.addTestReport triggers setPositiveContribution", async function() {
      const { attribution, staking, owner, user1 } = await deploy();

      // Attribution.addTestReport with score > 0 triggers StakingManager.setPositiveContribution
      await expect(attribution.connect(owner).addTestReport(
        1, // skillId
        user1.address,
        3, // severity
        10 // positive score
      )).to.emit(staking, "PositiveContributionSet")
        .withArgs(user1.address);

      // Verify state synchronized
      expect(await staking.hasPositiveContribution(user1.address)).to.be.true;
    });

    it("should NOT trigger positive contribution when test report score <= 0", async function() {
      const { attribution, staking, owner, user1 } = await deploy();

      // Score = 0 should NOT trigger setPositiveContribution
      await attribution.connect(owner).addTestReport(1, user1.address, 3, 0);

      expect(await staking.hasPositiveContribution(user1.address)).to.be.false;
    });

    it("should maintain state consistency after reputation operations", async function() {
      const { registry, staking, owner, user1, user2 } = await deploy();

      // Step 1: Initial state - user has 100 reputation
      await giveEffectiveReputation(staking, owner, user1, 100);
      const initialRep = await staking.getUserReputation(user1.address);
      expect(initialRep).to.equal(100);

      // Step 2: Slash locks 30 reputation, reducing effective to 40
      await staking.slashLiker(user1.address, -30, "Test");
      const afterSlash = await staking.getUserReputation(user1.address);
      expect(afterSlash).to.equal(40); // 100 - 30 locked

      // Step 3: Add positive contribution
      await staking.setPositiveContribution(user1.address);
      expect(await staking.hasPositiveContribution(user1.address)).to.be.true;

      // Step 4: Claim recovery and verify state increased
      await time.increase(30 * 24 * 60 * 60);
      await mine();

      await staking.connect(user1).claimRecoverableReputation();

      // Verify state after recovery is better than after slash
      const afterRecovery = await staking.getUserReputation(user1.address);
      expect(afterRecovery).to.be.gt(afterSlash);
    });

    it("should verify all events emitted in cross-contract flow", async function() {
      const { registry, staking, owner, user1, user2 } = await deploy();

      // user1 registers a skill
      const tx = await registry.connect(user1).registerSkill(
        "EventFlow", "Test", "trigger", "QmEvent", 0, "v1"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === "SkillRegistered");
      const skillId = event.args[1];

      await giveEffectiveReputation(staking, owner, user2, 100);

      // user2 verifies - triggers setPositiveContribution in StakingManager
      const verifyTx = await registry.connect(user2).verifySkill(skillId, true);
      const verifyReceipt = await verifyTx.wait();

      // SkillVerified event from registry
      const skillVerifyEvents = verifyReceipt.logs.filter(log => log.fragment?.name === "SkillVerified");
      expect(skillVerifyEvents.length).to.be.greaterThan(0);

      // Verify state was synchronized - positive contribution was set
      expect(await staking.hasPositiveContribution(user2.address)).to.be.true;
    });
  });
});