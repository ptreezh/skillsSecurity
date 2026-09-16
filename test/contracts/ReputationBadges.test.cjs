const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ReputationBadges", function() {
  async function deployBadges() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const ReputationBadges = await ethers.getContractFactory("ReputationBadges");
    const badges = await ReputationBadges.deploy();
    await badges.waitForDeployment();

    return { badges, owner, user1, user2, user3 };
  }

  describe("Badge Issuance", function() {
    it("should issue a badge and emit BadgeIssued event", async function() {
      const { badges, owner, user1 } = await deployBadges();

      await expect(
        badges.connect(owner).issueBadge(
          user1.address,
          1, // BadgeType.CODE_REVIEWER (enum index 1)
          "Great code review on PR #42"
        )
      )
        .to.emit(badges, "BadgeIssued")
        .withArgs(user1.address, 1, 0, "Great code review on PR #42");

      const info = await badges.getBadgeInfo(0);
      expect(info.badgeType).to.equal(1);
      expect(info.evidence).to.equal("Great code review on PR #42");
      expect(info.issuedAt).to.be.gt(0);
    });

    it("should track user badges via getUserBadges and getUserBadgeCount", async function() {
      const { badges, owner, user1 } = await deployBadges();

      // Issue two badges to user1
      await badges.connect(owner).issueBadge(user1.address, 1, "Review 1");
      await badges.connect(owner).issueBadge(user1.address, 1, "Review 2");
      await badges.connect(owner).issueBadge(user1.address, 2, "Verified dev badge");

      const badgeIds = await badges.getUserBadges(user1.address);
      expect(badgeIds.length).to.equal(3);

      const countType1 = await badges.getUserBadgeCount(user1.address, 1);
      expect(countType1).to.equal(2);

      const countType2 = await badges.getUserBadgeCount(user1.address, 2);
      expect(countType2).to.equal(1);
    });

    it("should increment badgeId counter across issuances", async function() {
      const { badges, owner, user1, user2 } = await deployBadges();

      await badges.connect(owner).issueBadge(user1.address, 0, "Badge 0");
      await badges.connect(owner).issueBadge(user2.address, 1, "Badge 1");
      await badges.connect(owner).issueBadge(user1.address, 2, "Badge 2");

      const info1 = await badges.getBadgeInfo(1);
      expect(info1.badgeType).to.equal(1);
      expect(info1.evidence).to.equal("Badge 1");
    });
  });

  describe("Access Control", function() {
    it("should revert issueBadge when called by non-issuer", async function() {
      const { badges, user1 } = await deployBadges();

      await expect(
        badges.connect(user1).issueBadge(user1.address, 0, "Unauthorized badge")
      ).to.be.revertedWith("Only issuer");
    });

    it("should revert issueBadge for zero address", async function() {
      const { badges, owner } = await deployBadges();

      await expect(
        badges.connect(owner).issueBadge(ethers.ZeroAddress, 0, "Zero addr badge")
      ).to.be.revertedWith("Invalid recipient");
    });

    it("should revert issueBadge with empty evidence", async function() {
      const { badges, owner, user1 } = await deployBadges();

      await expect(
        badges.connect(owner).issueBadge(user1.address, 0, "")
      ).to.be.revertedWith("Evidence required");
    });

    it("should revert getBadgeInfo for non-existent badge", async function() {
      const { badges } = await deployBadges();

      await expect(badges.getBadgeInfo(99)).to.be.revertedWith("Badge does not exist");
    });
  });

  describe("Set Issuer", function() {
    it("should set new issuer (owner only)", async function() {
      const { badges, owner, user1 } = await deployBadges();

      await badges.connect(owner).setIssuer(user1.address);
      expect(await badges.issuer()).to.equal(user1.address);
    });

    it("should allow new issuer to issue badges", async function() {
      const { badges, owner, user1, user2 } = await deployBadges();

      await badges.connect(owner).setIssuer(user1.address);
      await expect(
        badges.connect(user1).issueBadge(user2.address, 0, "Issued by new issuer")
      ).to.emit(badges, "BadgeIssued");
    });

    it("should revert setIssuer from non-owner", async function() {
      const { badges, user1, user2 } = await deployBadges();

      await expect(
        badges.connect(user1).setIssuer(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert setIssuer to zero address", async function() {
      const { badges, owner } = await deployBadges();

      await expect(
        badges.connect(owner).setIssuer(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid issuer");
    });
  });
});
