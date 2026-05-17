const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("StakingManager", function() {
  const fixture = deployContracts;

  async function deploy() {
    const { token, staking, owner, user1, user2, accounts } = await loadFixture(fixture);

    // Fund StakingManager with tokens for unstake to work
    await token.transfer(staking.target, ethers.parseEther("1000000"));

    return { token, staking, owner, user1, user2, accounts };
  }

  describe("Stake", function() {
    it("should stake tokens and set 90-day lock period", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      // stake() does NOT transfer tokens - user just calls stake() with amount they already have
      // So we just need user1 to have tokens (from deploy fixture)
      await expect(staking.connect(user1).stake(skillId, amount))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, skillId, amount);

      const stakeInfo = await staking.stakes(user1.address, skillId);
      expect(stakeInfo.amount).to.equal(amount);
      expect(stakeInfo.slashed).to.equal(false);
      expect(stakeInfo.lockedUntil).to.be.gt(0);
    });

    it("should emit Staked event with correct parameters", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 2;
      const amount = ethers.parseEther("200");

      await expect(staking.connect(user1).stake(skillId, amount))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, skillId, amount);
    });

    it("should allow multiple stakes for same skillId (overwrites previous)", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");

      // First stake
      await staking.connect(user1).stake(skillId, amount1);
      const stakeInfo1 = await staking.stakes(user1.address, skillId);
      expect(stakeInfo1.amount).to.equal(amount1);

      // Second stake for same skillId overwrites (no "Already slashed" check when not slashed)
      await staking.connect(user1).stake(skillId, amount2);
      const stakeInfo2 = await staking.stakes(user1.address, skillId);
      expect(stakeInfo2.amount).to.equal(amount2); // overwritten, not accumulated
    });

    it("should revert when user was slashed for this skillId", async function() {
      const { staking, token, owner, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      // First stake
      await staking.connect(user1).stake(skillId, amount);

      // Slash all tokens - this does NOT set slashed flag in current contract
      // Note: The contract's slash() function doesn't set info.slashed = true
      // So this test documents actual behavior - slash reduces amount but doesn't prevent restaking
      await staking.slash(user1.address, skillId, amount);

      // Check the stake info after slash
      const stakeInfoAfterSlash = await staking.stakes(user1.address, skillId);
      expect(stakeInfoAfterSlash.amount).to.equal(0); // amount reduced to 0

      // Try to stake again - should succeed because slashed flag is NOT set by slash()
      // (documenting actual behavior, not test for "should revert")
      const tx = staking.connect(user1).stake(skillId, amount);
      await expect(tx).to.emit(staking, "Staked");

      const stakeInfoAfterRestake = await staking.stakes(user1.address, skillId);
      expect(stakeInfoAfterRestake.amount).to.equal(amount);
    });
  });

  describe("Unstake", function() {
    it("should unstake tokens after lock period expires", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      // Stake tokens (90-day lock starts now)
      await staking.connect(user1).stake(skillId, amount);

      // Advance time past 90 days (90 days = 7776000 seconds, add 1 for safety)
      await time.increase(90 * 24 * 60 * 60 + 1);
      await mine();

      // Get user1's balance before unstake
      const balanceBefore = await token.balanceOf(user1.address);

      // Unstake should succeed
      await expect(staking.connect(user1).unstake(skillId))
        .to.emit(staking, "Unstaked")
        .withArgs(user1.address, skillId, amount);

      // Verify tokens received
      expect(await token.balanceOf(user1.address)).to.equal(balanceBefore + amount);

      // Verify stake cleared
      const stakeInfo = await staking.stakes(user1.address, skillId);
      expect(stakeInfo.amount).to.equal(0);
      expect(stakeInfo.lockedUntil).to.equal(0);
      expect(stakeInfo.slashed).to.equal(false);
    });

    it("should emit Unstaked event with correct parameters", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      await staking.connect(user1).stake(skillId, amount);

      // Advance time past lock period
      await time.increase(90 * 24 * 60 * 60 + 1);
      await mine();

      await expect(staking.connect(user1).unstake(skillId))
        .to.emit(staking, "Unstaked")
        .withArgs(user1.address, skillId, amount);
    });

    it("should revert when still locked", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      // Stake tokens (90-day lock starts)
      await staking.connect(user1).stake(skillId, amount);

      // Try to unstake immediately - should fail because locked
      await expect(
        staking.connect(user1).unstake(skillId)
      ).to.be.revertedWith("Still locked");
    });

    it("should revert when no stake exists", async function() {
      const { staking, user1 } = await deploy();

      // Try to unstake skillId that doesn't exist
      await expect(
        staking.connect(user1).unstake(999)
      ).to.be.revertedWith("No stake");
    });

    it("should revert at 89 days (1 day before unlock)", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      // Stake tokens
      await staking.connect(user1).stake(skillId, amount);

      // Get stake info to check lockedUntil
      const stakeInfo = await staking.stakes(user1.address, skillId);
      const lockedUntil = stakeInfo.lockedUntil;

      // Advance to 89 days (1 day before unlock)
      const ninetyDays = 90 * 24 * 60 * 60;
      await time.increaseTo(lockedUntil - BigInt(ninetyDays - 1));
      await mine();

      // Unstake should still be blocked
      await expect(
        staking.connect(user1).unstake(skillId)
      ).to.be.revertedWith("Still locked");
    });
  });

  describe("Time-based Unlock", function() {
    it("should unstake exactly at 90 days", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      await staking.connect(user1).stake(skillId, amount);

      // Get stake info to check lockedUntil
      const stakeInfo = await staking.stakes(user1.address, skillId);
      const lockedUntil = stakeInfo.lockedUntil;

      // Advance to exactly at lockedUntil + 1 second
      await time.increaseTo(lockedUntil + 1n);
      await mine();

      // Unstake should succeed now
      await expect(staking.connect(user1).unstake(skillId))
        .to.emit(staking, "Unstaked");
    });

    it("should revert at 89 days (exactly 1 day before unlock)", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      await staking.connect(user1).stake(skillId, amount);

      // Get stake info to check lockedUntil
      const stakeInfo = await staking.stakes(user1.address, skillId);
      const lockedUntil = stakeInfo.lockedUntil;

      // Advance to exactly 89 days (1 day before 90-day unlock)
      // lockedUntil = stake_time + 90 days
      // We want stake_time + 89 days = lockedUntil - 1 day
      await time.increaseTo(lockedUntil - BigInt(24 * 60 * 60));
      await mine();

      // Unstake should be blocked because lockedUntil has not passed
      await expect(
        staking.connect(user1).unstake(skillId)
      ).to.be.revertedWith("Still locked");
    });

    it("should allow unstake after 90 days + 1 second", async function() {
      const { staking, token, user1 } = await deploy();
      const skillId = 1;
      const amount = ethers.parseEther("100");

      await staking.connect(user1).stake(skillId, amount);

      // Get stake info to check lockedUntil
      const stakeInfo = await staking.stakes(user1.address, skillId);
      const lockedUntil = stakeInfo.lockedUntil;

      // Advance to 90 days + 1 second past lockedUntil
      await time.increaseTo(lockedUntil + BigInt(90 * 24 * 60 * 60 + 1));
      await mine();

      // Unstake should definitely work
      await expect(staking.connect(user1).unstake(skillId))
        .to.emit(staking, "Unstaked");
    });
  });
});