/**
 * ReputationBadges Contract Tests
 * Tests for non-transferable reputation badges (ERC-721) - replaces token-based badges
 */

const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("ReputationBadges", function () {
  let badges;
  let owner, issuer, recipient, user;

  // Badge types from IReputationBadges
  const BadgeType = {
    SKILLSHARP_100: 0,
    VERIFIED_DEVELOPER: 1,
    TOP_RATED: 2,
    EARLY_ADOPTER: 3,
    SECURITY_AUDITOR: 4,
    CODE_REVIEWER: 5
  };

  beforeEach(async function () {
    [owner, issuer, recipient, user] = await ethers.getSigners();

    const Badges = await ethers.getContractFactory("ReputationBadges");
    badges = await Badges.deploy();
    await badges.waitForDeployment();
  });

  describe("Initialization", function () {
    it("should set deployer as initial issuer", async function () {
      expect(await badges.issuer()).to.equal(owner.address);
    });

    it("should have correct name and symbol", async function () {
      expect(await badges.name()).to.equal("AgentSkills Badges");
      expect(await badges.symbol()).to.equal("ASKB");
    });
  });

  describe("Badge Issuance", function () {
    it("should issue badge as owner", async function () {
      const evidence = "ipfs://QmTest123";

      await expect(badges.connect(owner).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, evidence))
        .to.emit(badges, "BadgeIssued")
        .withArgs(recipient, BadgeType.VERIFIED_DEVELOPER, 0, evidence);
    });

    it("should increment token ID for each badge", async function () {
      await badges.connect(owner).issueBadge(recipient, BadgeType.EARLY_ADOPTER, "ipfs://1");
      await badges.connect(owner).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, "ipfs://2");
      await badges.connect(owner).issueBadge(user, BadgeType.SECURITY_AUDITOR, "ipfs://3");

      const info1 = await badges.getBadgeInfo(0);
      expect(info1.badgeType).to.equal(BadgeType.EARLY_ADOPTER);

      const info2 = await badges.getBadgeInfo(1);
      expect(info2.badgeType).to.equal(BadgeType.VERIFIED_DEVELOPER);

      const info3 = await badges.getBadgeInfo(2);
      expect(info3.badgeType).to.equal(BadgeType.SECURITY_AUDITOR);
    });

    it("should record issuance timestamp", async function () {
      const before = await ethers.provider.getBlock('latest').then(b => b.timestamp);
      await badges.connect(owner).issueBadge(recipient, BadgeType.TOP_RATED, "ipfs://test");
      const after = await ethers.provider.getBlock('latest').then(b => b.timestamp);

      const info = await badges.getBadgeInfo(0);
      expect(info.issuedAt).to.be.gte(before);
      expect(info.issuedAt).to.be.lte(after);
    });

    it("should track badge count per user and type", async function () {
      await badges.connect(owner).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, "ipfs://1");
      await badges.connect(owner).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, "ipfs://2");

      const count = await badges.getUserBadgeCount(recipient, BadgeType.VERIFIED_DEVELOPER);
      expect(count).to.equal(2);
    });

    it("should revert with zero address recipient", async function () {
      await expect(
        badges.connect(owner).issueBadge(ethers.ZeroAddress, BadgeType.VERIFIED_DEVELOPER, "ipfs://test")
      ).to.be.revertedWith("Invalid recipient");
    });

    it("should revert with empty evidence", async function () {
      await expect(
        badges.connect(owner).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, "")
      ).to.be.revertedWith("Evidence required");
    });

    it("should revert if non-issuer tries to issue", async function () {
      await expect(
        badges.connect(user).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, "ipfs://test")
      ).to.be.revertedWith("Only issuer");
    });
  });

  describe("Badge Non-Transferability", function () {
    beforeEach(async function () {
      await badges.connect(owner).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, "ipfs://test");
    });

    it("should prevent transfer via transferFrom", async function () {
      await expect(
        badges.connect(recipient).transferFrom(recipient, user, 0)
      ).to.be.revertedWith("Badges are non-transferable");
    });

    it("should prevent safeTransferFrom", async function () {
      await expect(
        badges.connect(recipient).safeTransferFrom(recipient, user, 0)
      ).to.be.revertedWith("Badges are non-transferable");
    });

    it("should prevent safeTransferFrom with data", async function () {
      await expect(
        badges.connect(recipient)["safeTransferFrom(address,address,uint256,bytes)"](recipient, user, 0, "0x")
      ).to.be.revertedWith("Badges are non-transferable");
    });

    it("should still allow owner to mint (owner is always issuer initially)", async function () {
      await badges.connect(owner).issueBadge(user, BadgeType.CODE_REVIEWER, "ipfs://test2");
      const info = await badges.getBadgeInfo(1);
      expect(info.badgeType).to.equal(BadgeType.CODE_REVIEWER);
    });
  });

  describe("Badge Info Retrieval", function () {
    beforeEach(async function () {
      await badges.connect(owner).issueBadge(recipient, BadgeType.TOP_RATED, "ipfs://QmTopRated");
    });

    it("should return correct badge type", async function () {
      const info = await badges.getBadgeInfo(0);
      expect(info.badgeType).to.equal(BadgeType.TOP_RATED);
    });

    it("should return correct evidence", async function () {
      const info = await badges.getBadgeInfo(0);
      expect(info.evidence).to.equal("ipfs://QmTopRated");
    });

    it("should return correct timestamp", async function () {
      const info = await badges.getBadgeInfo(0);
      expect(info.issuedAt).to.be.gt(0);
    });

    it("should revert for non-existent token", async function () {
      await expect(badges.getBadgeInfo(999)).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Token URI", function () {
    it("should return valid token URI", async function () {
      await badges.connect(owner).issueBadge(recipient, BadgeType.SECURITY_AUDITOR, "ipfs://QmAudit");

      const uri = await badges.tokenURI(0);
      expect(uri).to.include("data:application/json");
      expect(uri).to.include("SECURITY_AUDITOR");
    });

    it("should revert for non-existent token", async function () {
      await expect(badges.tokenURI(999)).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Issuer Management", function () {
    it("should allow owner to change issuer", async function () {
      await badges.connect(owner).setIssuer(issuer);

      expect(await badges.issuer()).to.equal(issuer.address);
    });

    it("should emit IssuerChanged event", async function () {
      await expect(badges.connect(owner).setIssuer(issuer))
        .to.emit(badges, "IssuerChanged")
        .withArgs(issuer.address);
    });

    it("should revert with zero address issuer", async function () {
      await expect(
        badges.connect(owner).setIssuer(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid issuer");
    });

    it("should revert if non-owner tries to change issuer", async function () {
      await expect(
        badges.connect(user).setIssuer(user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("ERC-721 Compliance", function () {
    it("should support ERC-721 interface", async function () {
      const ERC721_INTERFACE_ID = "0x80ac58cd";
      expect(await badges.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
    });

    it("should return correct balance for user with badges", async function () {
      await badges.connect(owner).issueBadge(recipient, BadgeType.EARLY_ADOPTER, "ipfs://1");
      await badges.connect(owner).issueBadge(recipient, BadgeType.TOP_RATED, "ipfs://2");

      expect(await badges.balanceOf(recipient)).to.equal(2);
    });

    it("should return zero balance for user without badges", async function () {
      expect(await badges.balanceOf(user)).to.equal(0);
    });

    it("should return correct ownerOf for badge", async function () {
      await badges.connect(owner).issueBadge(recipient, BadgeType.VERIFIED_DEVELOPER, "ipfs://test");

      expect(await badges.ownerOf(0)).to.equal(recipient.address);
    });
  });
});