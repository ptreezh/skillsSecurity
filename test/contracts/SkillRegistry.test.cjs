const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("SkillRegistry", function() {
  const fixture = deployContracts;

  async function deploy() {
    const result = await loadFixture(fixture);
    // Fund registry with tokens for stakes to be withdrawable
    await result.token.transfer(result.registry.target, ethers.parseEther("1000000"));
    return result;
  }

  // Helper to fund a user with tokens and approve the registry
  async function fundUser(token, user, registry, amount) {
    await token.transfer(user.address, amount);
    await token.connect(user).approve(registry.target, amount);
  }

  // Helper to give effective reputation via setEffectiveReputation (test-only helper)
  async function giveEffectiveReputation(staking, owner, user, targetAmount) {
    await staking.connect(owner).setEffectiveReputation(user.address, targetAmount);
  }

  // --- SKIL-01: Reputation Tier Gates ---

  describe("registerSkill - Reputation Thresholds", function() {

    it("LOW risk should register without reputation check", async function() {
      const { registry, token, user1 } = await deploy();
      await fundUser(token, user1, registry, ethers.parseEther("100"));

      await expect(registry.connect(user1).registerSkill(
        "LOWSkill",
        "A low risk skill",
        "trigger",
        "QmLow",
        0, // RiskLevel.LOW
        "v1"
      )).to.emit(registry, "SkillRegistered")
        .withArgs(user1.address, 0, "LOWSkill");
    });

    it("MEDIUM risk should revert when effective reputation < 500", async function() {
      const { registry, token, user1 } = await deploy();
      await fundUser(token, user1, registry, ethers.parseEther("100"));

      await expect(
        registry.connect(user1).registerSkill(
          "MEDIUMSkill",
          "A medium risk skill",
          "trigger",
          "QmMedium",
          1, // RiskLevel.MEDIUM
          "v1"
        )
      ).to.be.revertedWith("Insufficient effective reputation for MEDIUM skill");
    });

    it("MEDIUM risk should register when effective reputation >= 500", async function() {
      const { registry, staking, owner, token, user1 } = await deploy();
      // Give user1 500 effective reputation via likeSkill (250 calls * +2)
      await giveEffectiveReputation(staking, owner, user1, 500);
      await fundUser(token, user1, registry, ethers.parseEther("100"));

      await expect(registry.connect(user1).registerSkill(
        "MEDIUMSkill",
        "A medium risk skill",
        "trigger",
        "QmMedium",
        1, // RiskLevel.MEDIUM
        "v1"
      )).to.emit(registry, "SkillRegistered")
        .withArgs(user1.address, 0, "MEDIUMSkill");
    });

    it("HIGH risk should register when effective reputation >= 2000", async function() {
      const { registry, staking, owner, token, user1 } = await deploy();
      await giveEffectiveReputation(staking, owner, user1, 2000);
      await fundUser(token, user1, registry, ethers.parseEther("300"));

      await expect(registry.connect(user1).registerSkill(
        "HIGHSkill",
        "A high risk skill",
        "trigger",
        "QmHigh",
        2, // RiskLevel.HIGH
        "v1"
      )).to.emit(registry, "SkillRegistered")
        .withArgs(user1.address, 0, "HIGHSkill");
    });

    it("HIGH risk should revert when effective reputation < 2000", async function() {
      const { registry, staking, owner, token, user1 } = await deploy();
      // Give only 1000 effective reputation
      await giveEffectiveReputation(staking, owner, user1, 1000);
      await fundUser(token, user1, registry, ethers.parseEther("200"));

      await expect(
        registry.connect(user1).registerSkill(
          "HIGHSkill",
          "A high risk skill",
          "trigger",
          "QmHigh",
          2, // RiskLevel.HIGH
          "v1"
        )
      ).to.be.revertedWith("Insufficient effective reputation for HIGH skill");
    });

    it("CRITICAL risk should register when effective reputation >= 5000", async function() {
      const { registry, staking, owner, token, user1 } = await deploy();
      await giveEffectiveReputation(staking, owner, user1, 5000);
      await fundUser(token, user1, registry, ethers.parseEther("300"));

      await expect(registry.connect(user1).registerSkill(
        "CRITICALSkill",
        "A critical risk skill",
        "trigger",
        "QmCritical",
        3, // RiskLevel.CRITICAL
        "v1"
      )).to.emit(registry, "SkillRegistered")
        .withArgs(user1.address, 0, "CRITICALSkill");
    });

    it("CRITICAL risk should revert when effective reputation < 5000", async function() {
      const { registry, staking, owner, token, user1 } = await deploy();
      // Give only 4000 effective reputation
      await giveEffectiveReputation(staking, owner, user1, 4000);
      await fundUser(token, user1, registry, ethers.parseEther("300"));

      await expect(
        registry.connect(user1).registerSkill(
          "CRITICALSkill",
          "A critical risk skill",
          "trigger",
          "QmCritical",
          3, // RiskLevel.CRITICAL
          "v1"
        )
      ).to.be.revertedWith("Insufficient effective reputation for CRITICAL skill");
    });

    it("should emit FingerprintGenerated event on registration", async function() {
      const { registry, token, user1 } = await deploy();
      await fundUser(token, user1, registry, ethers.parseEther("100"));

      await expect(registry.connect(user1).registerSkill(
        "FingerprintSkill",
        "Skill for fingerprint test",
        "trigger",
        "QmFingerprint",
        0, // LOW risk
        "v1"
      )).to.emit(registry, "FingerprintGenerated");
    });
  });

  // --- SKIL-02: Fingerprint Generation ---

  describe("computeFingerprint", function() {

    it("should produce consistent fingerprint for same inputs", async function() {
      const { registry, user1 } = await deploy();
      const ipfsHash = "QmTestHash123";
      const timestamp = 1234567890;

      const fp1 = await registry.computeFingerprint(ipfsHash, user1.address, timestamp);
      const fp2 = await registry.computeFingerprint(ipfsHash, user1.address, timestamp);

      expect(fp1).to.equal(fp2);
    });

    it("should produce different fingerprints for different ipfsHash", async function() {
      const { registry, user1 } = await deploy();
      const timestamp = 1000;

      const fp1 = await registry.computeFingerprint("QmA", user1.address, timestamp);
      const fp2 = await registry.computeFingerprint("QmB", user1.address, timestamp);

      expect(fp1).to.not.equal(fp2);
    });

    it("should produce different fingerprints for different creators", async function() {
      const { registry, user1, user2 } = await deploy();
      const ipfsHash = "QmTest";
      const timestamp = 1000;

      const fp1 = await registry.computeFingerprint(ipfsHash, user1.address, timestamp);
      const fp2 = await registry.computeFingerprint(ipfsHash, user2.address, timestamp);

      expect(fp1).to.not.equal(fp2);
    });

    it("should produce different fingerprints for different timestamps", async function() {
      const { registry, user1 } = await deploy();
      const ipfsHash = "QmTest";

      const fp1 = await registry.computeFingerprint(ipfsHash, user1.address, 1000);
      const fp2 = await registry.computeFingerprint(ipfsHash, user1.address, 2000);

      expect(fp1).to.not.equal(fp2);
    });

    it("stored fingerprint should match computed fingerprint from registration", async function() {
      const { registry, token, user1 } = await deploy();
      await fundUser(token, user1, registry, ethers.parseEther("100"));

      const ipfsHash = "QmStoredFingerprint";
      const tx = await registry.connect(user1).registerSkill(
        "FingerprintStore",
        "Test fingerprint storage",
        "trigger",
        ipfsHash,
        0, // LOW risk
        "v1"
      );
      const receipt = await tx.wait();
      const blockTimestamp = (await receipt.getBlock()).timestamp;

      // Get stored fingerprint
      const storedFp = await registry.getFingerprint(0);

      // Compute expected fingerprint
      const expectedFp = await registry.computeFingerprint(
        ipfsHash,
        user1.address,
        blockTimestamp
      );

      expect(storedFp).to.equal(expectedFp);
    });
  });

  // --- SKIL-03 + SKIL-04: Verification Flow ---

  describe("verifySkill", function() {

    it("should verify LOW risk skill when verifier has 100+ effective reputation", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      // user1 registers LOW skill
      await fundUser(token, user1, registry, ethers.parseEther("100"));
      await registry.connect(user1).registerSkill("LowSkill", "", "trigger", "QmLow", 0, "v1");

      // user2 gets 100 effective reputation
      await giveEffectiveReputation(staking, owner, user2, 100);

      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(registry, "SkillVerified")
        .withArgs(user2.address, 0);
    });

    it("should verify MEDIUM risk skill when verifier has 500+ effective reputation", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      // user1 registers MEDIUM skill (needs 500 reputation)
      await giveEffectiveReputation(staking, owner, user1, 500);
      await fundUser(token, user1, registry, ethers.parseEther("100"));
      await registry.connect(user1).registerSkill("MedSkill", "", "trigger", "QmMed", 1, "v1");

      // user2 gets 500 effective reputation to verify
      await giveEffectiveReputation(staking, owner, user2, 500);

      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(registry, "SkillVerified")
        .withArgs(user2.address, 0);
    });

    it("should verify HIGH risk skill when verifier has 1000+ effective reputation", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      // user1 registers HIGH skill (needs 2000 reputation)
      await giveEffectiveReputation(staking, owner, user1, 2000);
      await fundUser(token, user1, registry, ethers.parseEther("200"));
      await registry.connect(user1).registerSkill("HighSkill", "", "trigger", "QmHigh", 2, "v1");

      // user2 gets 1000 effective reputation to verify
      await giveEffectiveReputation(staking, owner, user2, 1000);

      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(registry, "SkillVerified")
        .withArgs(user2.address, 0);
    });

    it("should verify CRITICAL risk skill when verifier has 2000+ effective reputation", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      // user1 registers CRITICAL skill (needs 5000 reputation)
      await giveEffectiveReputation(staking, owner, user1, 5000);
      await fundUser(token, user1, registry, ethers.parseEther("300"));
      await registry.connect(user1).registerSkill("CritSkill", "", "trigger", "QmCrit", 3, "v1");

      // user2 gets 2000 effective reputation to verify
      await giveEffectiveReputation(staking, owner, user2, 2000);

      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(registry, "SkillVerified")
        .withArgs(user2.address, 0);
    });

    it("should revert verifySkill when verifier has insufficient reputation", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      // user1 registers LOW skill
      await fundUser(token, user1, registry, ethers.parseEther("100"));
      await registry.connect(user1).registerSkill("LowSkill2", "", "trigger", "QmLow2", 0, "v1");

      // user2 has only 50 effective reputation (below 100 threshold)
      await giveEffectiveReputation(staking, owner, user2, 50);

      await expect(
        registry.connect(user2).verifySkill(0, true)
      ).to.be.revertedWith("Insufficient effective reputation");
    });

    it("verifySkill with pass=true should trigger setPositiveContribution (SKIL-04)", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      // user1 registers LOW skill
      await fundUser(token, user1, registry, ethers.parseEther("100"));
      await registry.connect(user1).registerSkill("LowSkill3", "", "trigger", "QmLow3", 0, "v1");

      // user2 has 100 effective reputation
      await giveEffectiveReputation(staking, owner, user2, 100);

      // Verify - should trigger PositiveContributionSet event via StakingManager
      await expect(registry.connect(user2).verifySkill(0, true))
        .to.emit(staking, "PositiveContributionSet")
        .withArgs(user2.address);

      // Also check state
      expect(await staking.hasPositiveContribution(user2.address)).to.be.true;
    });

    it("verifySkill with pass=false should NOT trigger setPositiveContribution", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      // user1 registers LOW skill
      await fundUser(token, user1, registry, ethers.parseEther("100"));
      await registry.connect(user1).registerSkill("LowSkill4", "", "trigger", "QmLow4", 0, "v1");

      // user2 has 100 effective reputation
      await giveEffectiveReputation(staking, owner, user2, 100);

      // Verify with pass=false
      await registry.connect(user2).verifySkill(0, false);

      // hasPositiveContribution should remain false
      expect(await staking.hasPositiveContribution(user2.address)).to.be.false;
    });

    it("verifySkill should revert for invalid skillId", async function() {
      const { registry, staking, owner, user2 } = await deploy();
      // Give user2 some reputation
      await giveEffectiveReputation(staking, owner, user2, 100);

      await expect(
        registry.connect(user2).verifySkill(999, true)
      ).to.be.revertedWith("Invalid skill");
    });

    it("verifiedSkills mapping should be set correctly after verification", async function() {
      const { registry, staking, owner, token, user1, user2 } = await deploy();
      await fundUser(token, user1, registry, ethers.parseEther("100"));
      await registry.connect(user1).registerSkill("VerifyMapTest", "", "trigger", "QmMap", 0, "v1");

      await giveEffectiveReputation(staking, owner, user2, 100);
      await registry.connect(user2).verifySkill(0, true);

      expect(await registry.verifiedSkills(0)).to.be.true;
    });
  });

  // --- Additional: getFingerprint and getUserReputation integration ---

  describe("getFingerprint", function() {

    it("should revert for invalid skillId", async function() {
      const { registry } = await deploy();
      await expect(registry.getFingerprint(999)).to.be.reverted;
    });

    it("should return non-zero fingerprint for registered skill", async function() {
      const { registry, token, user1 } = await deploy();
      await token.transfer(user1.address, ethers.parseEther("100"));
      await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
      await registry.connect(user1).registerSkill("SomeSkill", "", "trigger", "QmSome", 0, "v1");
      // skillId 0 is registered - should have a valid non-zero fingerprint
      const fp = await registry.getFingerprint(0);
      expect(fp).to.not.equal(ethers.ZeroHash);
    });
  });
});