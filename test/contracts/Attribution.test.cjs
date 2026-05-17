const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("Attribution", function() {
  const fixture = deployContracts;

  async function deploy() {
    const result = await loadFixture(fixture);
    // result.accounts has user3, user4, ... (after owner, user1, user2)
    return result;
  }

  // Helper to give effective reputation via setEffectiveReputation (test-only helper)
  async function giveEffectiveReputation(staking, owner, user, targetAmount) {
    await staking.connect(owner).setEffectiveReputation(user.address, targetAmount);
  }

  // =========================================================
  // ATTR-01: Contribution Creation Tests
  // Verifies: owner can add contributions, non-owner is blocked,
  // contributorSkills and contributionCount are tracked correctly.
  // =========================================================

  describe("addContribution - ATTR-01", function() {

    it("owner can add GENESIS contribution", async function() {
      const { attribution, owner, user1 } = await deploy();
      const skillId = 0;
      const share = 5000; // 50%

      await attribution.connect(owner).addContribution(
        skillId,
        user1.address,
        share,
        0, // ContributionType.GENESIS
        "QmGenesis"
      );

      // Access array element by passing index as second arg
      const contribution = await attribution.skillContributions(skillId, 0);
      expect(contribution.contributor).to.equal(user1.address);
      expect(contribution.share).to.equal(5000);
      expect(contribution.ctype).to.equal(0); // GENESIS
      expect(contribution.contentHash).to.equal("QmGenesis");
    });

    it("owner can add contributions of all five types", async function() {
      const { attribution, owner, user1 } = await deploy();

      // GENESIS (0)
      await attribution.connect(owner).addContribution(0, user1.address, 10000, 0, "QmGenesis");
      const c0 = await attribution.skillContributions(0, 0);
      expect(c0.ctype).to.equal(0);

      // FORK (1)
      await attribution.connect(owner).addContribution(1, user1.address, 7000, 1, "QmFork");
      const c1 = await attribution.skillContributions(1, 0);
      expect(c1.ctype).to.equal(1);

      // AUDIT (2)
      await attribution.connect(owner).addContribution(2, user1.address, 3000, 2, "QmAudit");
      const c2 = await attribution.skillContributions(2, 0);
      expect(c2.ctype).to.equal(2);

      // BUGFIX (3)
      await attribution.connect(owner).addContribution(3, user1.address, 5000, 3, "QmBugfix");
      const c3 = await attribution.skillContributions(3, 0);
      expect(c3.ctype).to.equal(3);

      // TRANSLATION (4)
      await attribution.connect(owner).addContribution(4, user1.address, 4000, 4, "QmTranslation");
      const c4 = await attribution.skillContributions(4, 0);
      expect(c4.ctype).to.equal(4);
    });

    it("multiple contributions accumulate for same skill", async function() {
      const { attribution, owner, user1, user2 } = await deploy();
      const skillId = 10;

      await attribution.connect(owner).addContribution(skillId, user1.address, 3000, 0, "Qm1");
      await attribution.connect(owner).addContribution(skillId, user2.address, 4000, 1, "Qm2");
      await attribution.connect(owner).addContribution(skillId, owner.address, 3000, 2, "Qm3");

      // Check each element via array index
      const c0 = await attribution.skillContributions(skillId, 0);
      const c1 = await attribution.skillContributions(skillId, 1);
      const c2 = await attribution.skillContributions(skillId, 2);
      expect(c0.contributor).to.equal(user1.address);
      expect(c1.contributor).to.equal(user2.address);
      expect(c2.contributor).to.equal(owner.address);

      const count = await attribution.contributionCount(skillId);
      expect(count).to.equal(3);
    });

    it("addContribution tracks contributor's skill list (contributorSkills)", async function() {
      const { attribution, owner, user1 } = await deploy();
      const skillId = 5;

      await attribution.connect(owner).addContribution(
        skillId,
        user1.address,
        3000,
        2, // AUDIT
        "QmAuditContrib"
      );

      // contributorSkills returns uint256[], access by index
      const skillIdRecorded = await attribution.contributorSkills(user1.address, 0);
      expect(skillIdRecorded).to.equal(skillId);
    });

    it("contributorSkills accumulates for user with multiple contributions", async function() {
      const { attribution, owner, user1 } = await deploy();

      await attribution.connect(owner).addContribution(20, user1.address, 2000, 0, "QmA");
      await attribution.connect(owner).addContribution(21, user1.address, 3000, 1, "QmB");
      await attribution.connect(owner).addContribution(22, user1.address, 5000, 2, "QmC");

      const s0 = await attribution.contributorSkills(user1.address, 0);
      const s1 = await attribution.contributorSkills(user1.address, 1);
      const s2 = await attribution.contributorSkills(user1.address, 2);
      expect(s0).to.equal(20);
      expect(s1).to.equal(21);
      expect(s2).to.equal(22);
    });

    it("non-owner cannot add contribution", async function() {
      const { attribution, user1 } = await deploy();

      await expect(
        attribution.connect(user1).addContribution(0, user1.address, 5000, 0, "Qm")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("contribution stores correct share value (percentage * 100)", async function() {
      const { attribution, owner, user1 } = await deploy();

      // 70% share
      await attribution.connect(owner).addContribution(30, user1.address, 7000, 0, "Qm70");
      const c30 = await attribution.skillContributions(30, 0);
      expect(c30.share).to.equal(7000);

      // 25% share
      await attribution.connect(owner).addContribution(31, user1.address, 2500, 0, "Qm25");
      const c31 = await attribution.skillContributions(31, 0);
      expect(c31.share).to.equal(2500);
    });
  });

  // =========================================================
  // ATTR-02: Like Mechanism Tests
  // Verifies: SkillLiked event, global hasLiked prevention,
  // same skill liked by different users, hasLiked state updated.
  // Note: hasLiked is global per user (not per skill-user pair).
  // =========================================================

  describe("likeSkill - ATTR-02", function() {

    it("user can like a skill and SkillLiked event is emitted", async function() {
      const { attribution, user1 } = await deploy();
      // Fresh user has 0 effective reputation, which satisfies >= 0

      await expect(attribution.connect(user1).likeSkill(1))
        .to.emit(attribution, "SkillLiked")
        .withArgs(user1.address, 1);
    });

    it("hasLiked mapping is updated after likeSkill", async function() {
      const { attribution, user1 } = await deploy();

      await attribution.connect(user1).likeSkill(1);

      expect(await attribution.hasLiked(user1.address)).to.be.true;
    });

    it("skillLikes array is populated after likeSkill", async function() {
      const { attribution, user2 } = await deploy();

      await attribution.connect(user2).likeSkill(5);

      // Access Like struct via (skillId, index)
      const like = await attribution.skillLikes(5, 0);
      expect(like.user).to.equal(user2.address);
      expect(like.skillId).to.equal(5);
    });

    it("likeCount is incremented after likeSkill", async function() {
      const { attribution, user1 } = await deploy();

      await attribution.connect(user1).likeSkill(3);

      const count = await attribution.likeCount(3);
      expect(count).to.equal(1);
    });

    it("same user cannot like again (global hasLiked check)", async function() {
      const { attribution, user1 } = await deploy();

      // First like succeeds
      await attribution.connect(user1).likeSkill(1);

      // Second like on a DIFFERENT skillId still reverts because hasLiked is global
      await expect(
        attribution.connect(user1).likeSkill(2)
      ).to.be.revertedWith("Already liked");
    });

    it("different users can like the same skill", async function() {
      const { attribution, accounts } = await deploy();
      // user1 = accounts[0], user2 = accounts[1], user3 = accounts[2]
      const user1 = accounts[0];
      const user2 = accounts[1];
      const user3 = accounts[2];
      const skillId = 7;

      await attribution.connect(user1).likeSkill(skillId);
      await attribution.connect(user2).likeSkill(skillId);
      await attribution.connect(user3).likeSkill(skillId);

      // skillLikes[skillId] has 3 entries
      const l0 = await attribution.skillLikes(skillId, 0);
      const l1 = await attribution.skillLikes(skillId, 1);
      const l2 = await attribution.skillLikes(skillId, 2);
      expect(l0.user).to.equal(user1.address);
      expect(l1.user).to.equal(user2.address);
      expect(l2.user).to.equal(user3.address);

      const count = await attribution.likeCount(skillId);
      expect(count).to.equal(3);
    });

    it("user with >= 0 effective reputation can like (0 reputation qualifies)", async function() {
      const { attribution, accounts } = await deploy();
      // accounts[0] = user4 (fresh, has 0 effective reputation)
      const user4 = accounts[0];

      await expect(attribution.connect(user4).likeSkill(8))
        .to.emit(attribution, "SkillLiked")
        .withArgs(user4.address, 8);
    });

    it("user with positive reputation can like", async function() {
      const { attribution, staking, owner, accounts } = await deploy();
      // accounts[1] = user5 (fresh)
      const user5 = accounts[1];

      await giveEffectiveReputation(staking, owner, user5, 1000);

      await expect(attribution.connect(user5).likeSkill(9))
        .to.emit(attribution, "SkillLiked")
        .withArgs(user5.address, 9);
    });
  });

  // =========================================================
  // ATTR-03 & ATTR-04: Cross-Contract Notification Tests
  // ATTR-03: addTestReport with positive score triggers
  //           StakingManager.setPositiveContribution
  // ATTR-04: setPositiveContribution marks contribution via
  //           addTestReport with positive score, hasPositiveContribution updated
  // =========================================================

  describe("addTestReport - ATTR-03 & ATTR-04 Cross-Contract Integration", function() {

    it("ATTR-04: positive score triggers setPositiveContribution (score > 0)", async function() {
      const { attribution, staking, owner, user1 } = await deploy();

      // score = 10 is positive, should trigger PositiveContributionSet
      await expect(attribution.connect(owner).addTestReport(0, user1.address, 5, 10))
        .to.emit(staking, "PositiveContributionSet")
        .withArgs(user1.address);

      // Verify state in StakingManager
      expect(await staking.hasPositiveContribution(user1.address)).to.be.true;
    });

    it("ATTR-03: negative score does NOT trigger setPositiveContribution", async function() {
      const { attribution, staking, owner, accounts } = await deploy();
      // Use fresh user (accounts[0] = user4)
      const user2 = accounts[0];

      await attribution.connect(owner).addTestReport(0, user2.address, 2, -5);

      // hasPositiveContribution should remain false
      expect(await staking.hasPositiveContribution(user2.address)).to.be.false;
    });

    it("ATTR-03: zero score does NOT trigger setPositiveContribution", async function() {
      const { attribution, staking, owner, accounts } = await deploy();
      // Fresh user (accounts[1] = user5)
      const user3 = accounts[1];

      await attribution.connect(owner).addTestReport(0, user3.address, 3, 0);

      expect(await staking.hasPositiveContribution(user3.address)).to.be.false;
    });

    it("score of 1 (positive) triggers setPositiveContribution", async function() {
      const { attribution, staking, owner, accounts } = await deploy();
      // Fresh user (accounts[2] = user6)
      const user4 = accounts[2];

      await attribution.connect(owner).addTestReport(0, user4.address, 5, 1);

      expect(await staking.hasPositiveContribution(user4.address)).to.be.true;
    });

    it("score of -1 (negative) does NOT trigger", async function() {
      const { attribution, staking, owner, accounts } = await deploy();
      // Fresh user (accounts[3] = user7)
      const user5 = accounts[3];

      await attribution.connect(owner).addTestReport(0, user5.address, 1, -1);

      expect(await staking.hasPositiveContribution(user5.address)).to.be.false;
    });

    it("skillTestReports mapping is populated correctly", async function() {
      const { attribution, owner, user1 } = await deploy();
      const skillId = 15;

      await attribution.connect(owner).addTestReport(skillId, user1.address, 5, 10);

      // Access TestReport struct via (skillId, index)
      const report = await attribution.skillTestReports(skillId, 0);
      expect(report.reporter).to.equal(user1.address);
      expect(report.severity).to.equal(5);
      expect(report.score).to.equal(10);
    });

    it("testReportCount is incremented correctly", async function() {
      const { attribution, owner, user1, accounts } = await deploy();
      const skillId = 16;

      // Use different reporters so setPositiveContribution doesn't conflict
      await attribution.connect(owner).addTestReport(skillId, user1.address, 3, 8);
      await attribution.connect(owner).addTestReport(skillId, accounts[0].address, 5, 12);
      await attribution.connect(owner).addTestReport(skillId, accounts[1].address, 1, -3);

      const count = await attribution.testReportCount(skillId);
      expect(count).to.equal(3);
    });

    it("non-owner cannot add test report", async function() {
      const { attribution, user1, user2 } = await deploy();
      const skillId = 0;

      await expect(
        attribution.connect(user1).addTestReport(skillId, user2.address, 5, 10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("severity values are preserved in test report", async function() {
      const { attribution, owner, user1, accounts } = await deploy();
      const skillId = 20;

      // Use different reporters to avoid setPositiveContribution conflicts
      await attribution.connect(owner).addTestReport(skillId, user1.address, 1, 5);
      await attribution.connect(owner).addTestReport(skillId, accounts[0].address, 3, 3);
      await attribution.connect(owner).addTestReport(skillId, accounts[1].address, 5, 10);

      const r0 = await attribution.skillTestReports(skillId, 0);
      const r1 = await attribution.skillTestReports(skillId, 1);
      const r2 = await attribution.skillTestReports(skillId, 2);
      expect(r0.severity).to.equal(1);
      expect(r1.severity).to.equal(3);
      expect(r2.severity).to.equal(5);
    });

    it("negative score can be large magnitude (e.g., -100)", async function() {
      const { attribution, staking, owner, accounts } = await deploy();
      // Fresh user (accounts[4] = user8)
      const user6 = accounts[4];

      await attribution.connect(owner).addTestReport(0, user6.address, 4, -100);

      // Should NOT trigger setPositiveContribution
      expect(await staking.hasPositiveContribution(user6.address)).to.be.false;

      // But the report should be recorded
      const report = await attribution.skillTestReports(0, await attribution.testReportCount(0).then(c => c - 1n));
      expect(report.score).to.equal(-100);
    });
  });
});