/**
 * RevenueDistributor Contract Tests
 * Tests for automatic deployer dividend distribution system
 */

import pkg from 'hardhat';
const { ethers } = pkg;
import { expect } from 'chai';

describe("RevenueDistributor", function () {
  let revenueDistributor;
  let askToken;
  let deployerRewards;
  let owner, deployer1, deployer2, deployer3;

  beforeEach(async function () {
    [owner, deployer1, deployer2, deployer3] = await ethers.getSigners();

    // Deploy Mock ASK Token (name, symbol, initialSupply, decimals)
    const MockToken = await ethers.getContractFactory("MockERC20");
    const tokenInstance = await MockToken.deploy("AskToken", "ASK", 1000000, 18);
    askToken = await tokenInstance.waitForDeployment();

    // Deploy Mock DeployerRewards
    const MockDeployerRewards = await ethers.getContractFactory("MockDeployerRewards");
    const mr = await MockDeployerRewards.deploy();
    deployerRewards = await mr.waitForDeployment();

    // Add some deployers
    await deployerRewards.addDeployer(deployer1, 0); // Bronze
    await deployerRewards.addDeployer(deployer2, 1); // Silver
    await deployerRewards.addDeployer(deployer3, 2); // Gold

    // Deploy RevenueDistributor
    const RevenueDistributor = await ethers.getContractFactory("RevenueDistributor");
    const rd = await RevenueDistributor.deploy(askToken.target);
    revenueDistributor = await rd.waitForDeployment();

    // Configure
    await revenueDistributor.setDeployerRewards(deployerRewards.target);

    // Transfer some tokens to RevenueDistributor for distribution
    await askToken.transfer(revenueDistributor.target, ethers.parseEther("10000"));
  });

  describe("Distribution", function () {
    it("should correctly distribute revenue to deployers", async function () {
      const d1BalanceBefore = await askToken.balanceOf(deployer1.address);
      const d2BalanceBefore = await askToken.balanceOf(deployer2.address);
      const d3BalanceBefore = await askToken.balanceOf(deployer3.address);

      // Execute distribution
      await revenueDistributor.distribute();

      const d1Balance = await askToken.balanceOf(deployer1.address);
      const d2Balance = await askToken.balanceOf(deployer2.address);
      const d3Balance = await askToken.balanceOf(deployer3.address);

      // All deployers should receive dividends
      expect(d3Balance).to.be.gt(d2Balance); // Gold should get more than Silver
      expect(d2Balance).to.be.gt(d1Balance); // Silver should get more than Bronze
    });

    it("should track cumulative dividends", async function () {
      await revenueDistributor.distribute();

      const cumulative1 = await revenueDistributor.getCumulativeDividends(deployer1.address);
      const cumulative3 = await revenueDistributor.getCumulativeDividends(deployer3.address);

      expect(cumulative3).to.be.gt(0);
      expect(cumulative3).to.be.gt(cumulative1);
    });
  });

  describe("Configuration", function () {
    it("should allow updating distribution ratios", async function () {
      await expect(
        revenueDistributor.updateDistributionRatios(6000, 2000, 2000)
      ).to.not.be.reverted;

      const ratios = await revenueDistributor.distributionRatios();
      expect(ratios.toDeployers).to.equal(6000);
      expect(ratios.toTreasury).to.equal(2000);
      expect(ratios.toStakingPool).to.equal(2000);
    });

    it("should reject invalid ratios", async function () {
      await expect(
        revenueDistributor.updateDistributionRatios(5000, 3000, 3000) // Sum = 11000, invalid
      ).to.be.reverted;
    });
  });
});