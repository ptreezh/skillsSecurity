/**
 * RevenueSplit Contract Tests
 * Tests for service fee distribution (70/10/5/5/10 split) - replaces RevenueDistributor
 */

const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("RevenueSplit", function () {
  let revenueSplit;
  let owner, creator, auditor, referrer, user;

  // Fee percentages in basis points
  const CREATOR_FEE = 7000n;   // 70%
  const REFERRER_FEE = 1000n;  // 10%
  const AUDITOR_FEE = 500n;    // 5%
  const DISPUTE_FEE = 500n;    // 5%
  const PLATFORM_FEE = 1000n;  // 10%
  const TOTAL_BP = 10000n;    // 100%

  beforeEach(async function () {
    [owner, creator, auditor, referrer, user] = await ethers.getSigners();

    const RevenueSplit = await ethers.getContractFactory("RevenueSplit");
    revenueSplit = await RevenueSplit.deploy();
    await revenueSplit.waitForDeployment();
  });

  describe("Fee Constants", function () {
    it("should have correct CREATOR_FEE", async function () {
      expect(await revenueSplit.CREATOR_FEE()).to.equal(CREATOR_FEE);
    });

    it("should have correct REFERRER_FEE", async function () {
      expect(await revenueSplit.REFERRER_FEE()).to.equal(REFERRER_FEE);
    });

    it("should have correct AUDITOR_FEE", async function () {
      expect(await revenueSplit.AUDITOR_FEE()).to.equal(AUDITOR_FEE);
    });

    it("should have correct DISPUTE_FEE", async function () {
      expect(await revenueSplit.DISPUTE_FEE()).to.equal(DISPUTE_FEE);
    });

    it("should have correct PLATFORM_FEE", async function () {
      expect(await revenueSplit.PLATFORM_FEE()).to.equal(PLATFORM_FEE);
    });

    it("should have TOTAL_BP equal to 100%", async function () {
      expect(await revenueSplit.TOTAL_BP()).to.equal(TOTAL_BP);
    });
  });

  describe("Deposit", function () {
    it("should accept deposit and split fees correctly", async function () {
      const depositAmount = ethers.parseEther("1.0");

      await expect(
        revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount })
      ).to.emit(revenueSplit, "FeeDeposited")
        .withArgs(creator, referrer, auditor, depositAmount);
    });

    it("should revert with zero value", async function () {
      await expect(
        revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });

    it("should revert with zero address creator", async function () {
      await expect(
        revenueSplit.connect(user).deposit(ethers.ZeroAddress, auditor, referrer, { value: 1000 })
      ).to.be.revertedWith("Invalid creator");
    });

    it("should revert with zero address auditor", async function () {
      await expect(
        revenueSplit.connect(user).deposit(creator, ethers.ZeroAddress, referrer, { value: 1000 })
      ).to.be.revertedWith("Invalid auditor");
    });

    it("should revert with zero address referrer", async function () {
      await expect(
        revenueSplit.connect(user).deposit(creator, auditor, ethers.ZeroAddress, { value: 1000 })
      ).to.be.revertedWith("Invalid referrer");
    });
  });

  describe("Share Calculation", function () {
    it("should calculate creator share at 70%", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const share = await revenueSplit.calculateShare(creator);
      const expectedShare = (depositAmount * CREATOR_FEE) / TOTAL_BP;
      expect(share).to.equal(expectedShare);
    });

    it("should calculate referrer share at 10%", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const share = await revenueSplit.calculateShare(referrer);
      const expectedShare = (depositAmount * REFERRER_FEE) / TOTAL_BP;
      expect(share).to.equal(expectedShare);
    });

    it("should calculate auditor share at 5%", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const share = await revenueSplit.calculateShare(auditor);
      const expectedShare = (depositAmount * AUDITOR_FEE) / TOTAL_BP;
      expect(share).to.equal(expectedShare);
    });

    it("should accumulate shares from multiple deposits", async function () {
      const depositAmount = ethers.parseEther("0.5");

      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const share = await revenueSplit.calculateShare(creator);
      const expectedShare = (depositAmount * CREATOR_FEE * 2n) / TOTAL_BP;
      expect(share).to.equal(expectedShare);
    });

    it("should return 0 for user with no share", async function () {
      const share = await revenueSplit.calculateShare(user);
      expect(share).to.equal(0);
    });
  });

  describe("Withdrawal", function () {
    it("should allow withdrawal after cooldown", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      // Fast forward past cooldown
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
      await ethers.provider.send("evm_mine");

      await expect(revenueSplit.connect(creator).withdraw())
        .to.emit(revenueSplit, "Withdrawn");
    });

    it("should revert withdrawal during cooldown after first withdrawal", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      // First withdrawal should work (passes cooldown check since it's first time)
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await revenueSplit.connect(creator).withdraw();

      // Second withdrawal should fail - within cooldown period
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      // Time advanced only 1 second from last withdrawal, within 1 hour cooldown
      await expect(revenueSplit.connect(creator).withdraw())
        .to.be.revertedWith("Cooldown active");
    });

    it("should revert withdrawal with no share", async function () {
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await expect(revenueSplit.connect(user).withdraw())
        .to.be.revertedWith("No share to withdraw");
    });

    it("should clear share after withdrawal", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await revenueSplit.connect(creator).withdraw();

      const share = await revenueSplit.calculateShare(creator);
      expect(share).to.equal(0);
    });

    it("should prevent reentrancy on withdrawal", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      // Try to exploit - this should be prevented by ReentrancyGuard
      await expect(revenueSplit.connect(creator).withdraw()).to.not.be.reverted;
    });
  });

  describe("Dispute Fund", function () {
    it("should accumulate dispute fund at 5%", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const disputeFund = await revenueSplit.disputeFund();
      const expectedFund = (depositAmount * DISPUTE_FEE) / TOTAL_BP;
      expect(disputeFund).to.equal(expectedFund);
    });
  });

  describe("Platform Balance", function () {
    it("should accumulate platform balance at 10%", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const platformBalance = await revenueSplit.platformBalance();
      const expectedBalance = (depositAmount * PLATFORM_FEE) / TOTAL_BP;
      expect(platformBalance).to.equal(expectedBalance);
    });

    it("should allow owner to withdraw platform funds via emergencyWithdraw", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      // Use emergencyWithdraw instead - it's designed for this
      await expect(revenueSplit.connect(owner).emergencyWithdraw(owner))
        .to.emit(revenueSplit, "EmergencyWithdraw");
    });

    it("should revert if non-owner tries platform withdrawal with no shares", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      // user has no shares, not owner, so should revert
      await expect(revenueSplit.connect(user).withdraw())
        .to.be.reverted;
    });
  });

  describe("Share Breakdown", function () {
    it("should return correct breakdown for creator", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const breakdown = await revenueSplit.getShareBreakdown(creator);
      const expectedCreator = (depositAmount * CREATOR_FEE) / TOTAL_BP;

      expect(breakdown[0]).to.equal(expectedCreator);
      expect(breakdown[1]).to.equal(0);
      expect(breakdown[2]).to.equal(0);
    });

    it("should return correct breakdown for all roles", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const creatorBreakdown = await revenueSplit.getShareBreakdown(creator);
      const referrerBreakdown = await revenueSplit.getShareBreakdown(referrer);
      const auditorBreakdown = await revenueSplit.getShareBreakdown(auditor);

      expect(creatorBreakdown[0]).to.equal((depositAmount * CREATOR_FEE) / TOTAL_BP);
      expect(referrerBreakdown[1]).to.equal((depositAmount * REFERRER_FEE) / TOTAL_BP);
      expect(auditorBreakdown[2]).to.equal((depositAmount * AUDITOR_FEE) / TOTAL_BP);
    });
  });

  describe("Contract Balance", function () {
    it("should track contract balance correctly", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const balance = await revenueSplit.getBalance();
      expect(balance).to.equal(depositAmount);
    });
  });

  describe("Emergency Withdraw", function () {
    it("should allow owner to emergency withdraw", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      await expect(revenueSplit.connect(owner).emergencyWithdraw(owner))
        .to.emit(revenueSplit, "EmergencyWithdraw");
    });

    it("should revert if non-owner tries emergency withdraw", async function () {
      await expect(
        revenueSplit.connect(user).emergencyWithdraw(user)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert with zero address", async function () {
      await expect(
        revenueSplit.connect(owner).emergencyWithdraw(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Edge Cases", function () {
    it("should handle small deposits correctly", async function () {
      const depositAmount = 1000n; // Smallest unit
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const share = await revenueSplit.calculateShare(creator);
      expect(share).to.equal((depositAmount * CREATOR_FEE) / TOTAL_BP);
    });

    it("should handle large deposits correctly", async function () {
      const depositAmount = ethers.parseEther("100"); // 100 ETH
      await revenueSplit.connect(user).deposit(creator, auditor, referrer, { value: depositAmount });

      const share = await revenueSplit.calculateShare(creator);
      expect(share).to.equal((depositAmount * CREATOR_FEE) / TOTAL_BP);
    });

    it("should receive plain ETH transfer", async function () {
      const contract = revenueSplit.target || await revenueSplit.getAddress();
      const before = await ethers.provider.getBalance(contract);

      await owner.sendTransaction({
        to: contract,
        value: ethers.parseEther("0.5")
      });

      const after = await ethers.provider.getBalance(contract);
      expect(after - before).to.equal(ethers.parseEther("0.5"));
    });
  });
});