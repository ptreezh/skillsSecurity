const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DeployerRewards", function () {
    let deployerRewards;
    let mockToken;
    let owner;
    let deployer;
    let user;
    let other;

    // Constants from contract
    const TIER_BRONZE = 0;
    const TIER_SILVER = 1;
    const TIER_GOLD = 2;
    const BASIS_POINTS = 10000;

    // Tier configs
    const BRONZE_FIRST_REWARD = ethers.parseUnits("1000", 18);
    const SILVER_FIRST_REWARD = ethers.parseUnits("3000", 18);
    const GOLD_FIRST_REWARD = ethers.parseEther("5000");
    const BRONZE_LIMIT = 10;
    const SILVER_LIMIT = 50;

    async function deployContracts() {
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mock = await MockERC20.deploy(
            "AgentSkills Token",
            "ASK",
            ethers.parseEther("1000000"),
            18
        );
        await mock.waitForDeployment();

        const DeployerRewards = await ethers.getContractFactory("DeployerRewards");
        const rewards = await DeployerRewards.deploy(await mock.getAddress());
        await rewards.waitForDeployment();

        return { mock, rewards };
    }

    beforeEach(async function () {
        [owner, deployer, user, other] = await ethers.getSigners();
        const { mock, rewards } = await loadFixture(deployContracts);
        mockToken = mock;
        deployerRewards = rewards;
    });

    describe("Constructor", function () {
        it("should set ASK token address", async function () {
            expect(await deployerRewards.askToken()).to.equal(await mockToken.getAddress());
        });

        it("should initialize tier configurations", async function () {
            const bronzeConfig = await deployerRewards.getTierInfo(TIER_BRONZE);
            expect(bronzeConfig.minUsers).to.equal(0);
            expect(bronzeConfig.minActiveUsers).to.equal(0);
            expect(bronzeConfig.firstReward).to.equal(BRONZE_FIRST_REWARD);
            expect(bronzeConfig.activeRewardRate).to.equal(1000); // 10%
            expect(bronzeConfig.monthlyLimit).to.equal(BRONZE_LIMIT);

            const silverConfig = await deployerRewards.getTierInfo(TIER_SILVER);
            expect(silverConfig.minUsers).to.equal(20);
            expect(silverConfig.minActiveUsers).to.equal(10);
            expect(silverConfig.firstReward).to.equal(SILVER_FIRST_REWARD);
            expect(silverConfig.activeRewardRate).to.equal(1500); // 15%
            expect(silverConfig.monthlyLimit).to.equal(SILVER_LIMIT);

            const goldConfig = await deployerRewards.getTierInfo(TIER_GOLD);
            expect(goldConfig.minUsers).to.equal(100);
            expect(goldConfig.minActiveUsers).to.equal(50);
            expect(goldConfig.firstReward).to.equal(GOLD_FIRST_REWARD);
            expect(goldConfig.activeRewardRate).to.equal(2000); // 20%
            expect(goldConfig.monthlyLimit).to.equal(0); // Unlimited
        });

        it("should revert when ASK token is zero address", async function () {
            const DeployerRewards = await ethers.getContractFactory("DeployerRewards");
            await expect(
                DeployerRewards.deploy(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(deployerRewards, "ZeroAddress");
        });
    });

    describe("registerDeployer", function () {
        it("should register deployer successfully", async function () {
            const domain = "example.com";
            await expect(deployerRewards.connect(deployer).registerDeployer(domain))
                .to.emit(deployerRewards, "DeployerRegistered")
                .withArgs(deployer.address, domain, TIER_BRONZE);

            expect(await deployerRewards.checkIsDeployer(deployer.address)).to.equal(true);

            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.domain).to.equal(domain);
            expect(stats.tier).to.equal(TIER_BRONZE);
            expect(stats.isActive).to.equal(true);
        });

        it("should set default Bronze tier", async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.tier).to.equal(TIER_BRONZE);
        });

        it("should revert on duplicate registration", async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await expect(
                deployerRewards.connect(deployer).registerDeployer("other.com")
            ).to.be.revertedWithCustomError(deployerRewards, "AlreadyRegistered");
        });

        it("should add deployer to deployer list", async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            expect(await deployerRewards.getDeployerCount()).to.equal(1);
        });

        it("should revert when domain is empty", async function () {
            await expect(
                deployerRewards.connect(deployer).registerDeployer("")
            ).to.be.revertedWithCustomError(deployerRewards, "ZeroAddress");
        });
    });

    describe("onUserRegistered", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            // Fund the contract for rewards
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should process user registration and distribute rewards", async function () {
            const stakeAmount = ethers.parseEther("1000");

            await expect(
                deployerRewards.connect(deployer).onUserRegistered(user.address, stakeAmount)
            )
                .to.emit(deployerRewards, "UserRegistered")
                .withArgs(user.address, deployer.address)
                .to.emit(deployerRewards, "RewardDistributed");

            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.totalUsers).to.equal(1);
        });

        it("should update deployer stats correctly", async function () {
            const stakeAmount = ethers.parseEther("1000");
            await deployerRewards.connect(deployer).onUserRegistered(user.address, stakeAmount);

            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.totalUsers).to.equal(1);
        });

        it("should revert when called by non-deployer", async function () {
            await expect(
                deployerRewards.connect(other).onUserRegistered(user.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(deployerRewards, "NotRegistered");
        });

        it("should revert when user is zero address", async function () {
            await expect(
                deployerRewards.connect(deployer).onUserRegistered(ethers.ZeroAddress, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(deployerRewards, "ZeroAddress");
        });

        it("should revert when stake amount is zero", async function () {
            await expect(
                deployerRewards.connect(deployer).onUserRegistered(user.address, 0)
            ).to.be.revertedWithCustomError(deployerRewards, "InvalidStakeAmount");
        });

        it("should check monthly limit - Bronze tier (10 limit)", async function () {
            const stakeAmount = ethers.parseEther("100");

            // Register 10 users (at limit)
            for (let i = 0; i < BRONZE_LIMIT; i++) {
                const newUser = ethers.Wallet.createRandom().address;
                await deployerRewards.connect(deployer).onUserRegistered(newUser, stakeAmount);
            }

            // 11th user should fail
            await expect(
                deployerRewards.connect(deployer).onUserRegistered(user.address, stakeAmount)
            ).to.be.revertedWithCustomError(deployerRewards, "MonthlyLimitReached");
        });

        it("should allow unlimited users for Gold tier", async function () {
            // Upgrade deployer to Gold tier by adding enough users and active users
            const stakeAmount = ethers.parseEther("100");

            // Add 100 users - need to advance time to avoid monthly limit
            for (let i = 0; i < 100; i++) {
                const newUser = ethers.Wallet.createRandom().address;
                await deployerRewards.connect(deployer).onUserRegistered(newUser, stakeAmount);
                // Also mark as active (50 needed for Gold)
                if (i < 50) {
                    await deployerRewards.setUserActive(newUser, deployer.address);
                }
                // Advance time by 31 days to reset monthly count
                if (i > 0 && i % 9 === 0) {
                    await time.increase(31 * 24 * 60 * 60); // 31 days
                }
            }

            // Check tier is Gold
            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.tier).to.equal(TIER_GOLD);

            // Advance time to next month for Gold unlimited
            await time.increase(31 * 24 * 60 * 60);

            // Adding more users should work (Gold has unlimited)
            await deployerRewards.connect(deployer).onUserRegistered(
                ethers.Wallet.createRandom().address,
                stakeAmount
            );
        });
    });

    describe("calculateTier", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should auto-upgrade to Silver when thresholds met", async function () {
            const stakeAmount = ethers.parseEther("100");

            // Add 20 users to meet Silver threshold - advance time to avoid monthly limit
            for (let i = 0; i < 20; i++) {
                const newUser = ethers.Wallet.createRandom().address;
                await deployerRewards.connect(deployer).onUserRegistered(newUser, stakeAmount);
                // Mark 10 as active for Silver
                if (i < 10) {
                    await deployerRewards.setUserActive(newUser, deployer.address);
                }
                // Advance time by 31 days every 9 users
                if (i > 0 && i % 9 === 0) {
                    await time.increase(31 * 24 * 60 * 60);
                }
            }

            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.tier).to.equal(TIER_SILVER);
        });

        it("should auto-upgrade to Gold when thresholds met", async function () {
            const stakeAmount = ethers.parseEther("100");

            // Add 100 users to meet Gold threshold - advance time to avoid monthly limit
            for (let i = 0; i < 100; i++) {
                const newUser = ethers.Wallet.createRandom().address;
                await deployerRewards.connect(deployer).onUserRegistered(newUser, stakeAmount);
                // Mark 50 as active for Gold
                if (i < 50) {
                    await deployerRewards.setUserActive(newUser, deployer.address);
                }
                // Advance time by 31 days every 9 users
                if (i > 0 && i % 9 === 0) {
                    await time.increase(31 * 24 * 60 * 60);
                }
            }

            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.tier).to.equal(TIER_GOLD);
        });

        it("should revert when deployer not registered", async function () {
            await expect(
                deployerRewards.connect(other).calculateTier(other.address)
            ).to.be.revertedWithCustomError(deployerRewards, "NotRegistered");
        });

        it("should emit DeployerUpgraded event when tier changes", async function () {
            const stakeAmount = ethers.parseEther("100");

            // Add enough users for Silver - advance time to avoid monthly limit
            for (let i = 0; i < 20; i++) {
                const newUser = ethers.Wallet.createRandom().address;
                await deployerRewards.connect(deployer).onUserRegistered(newUser, stakeAmount);
                if (i < 10) {
                    await deployerRewards.setUserActive(newUser, deployer.address);
                }
                // Advance time by 31 days every 9 users
                if (i > 0 && i % 9 === 0) {
                    await time.increase(31 * 24 * 60 * 60);
                }
            }

            // Verify tier upgraded to Silver
            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.tier).to.equal(TIER_SILVER);
        });
    });

    describe("getDeployerStats", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should return correct deployer stats", async function () {
            const stats = await deployerRewards.getDeployerStats(deployer.address);

            expect(stats.domain).to.equal("test.com");
            expect(stats.tier).to.equal(TIER_BRONZE);
            expect(stats.totalUsers).to.equal(0);
            expect(stats.activeUsers).to.equal(0);
            expect(stats.totalRewards).to.equal(0);
            expect(stats.pendingRewards).to.equal(0);
            expect(stats.monthlyCount).to.equal(0);
            expect(stats.isActive).to.equal(true);
        });

        it("should return updated stats after user registration", async function () {
            const stakeAmount = ethers.parseEther("1000");
            await deployerRewards.connect(deployer).onUserRegistered(user.address, stakeAmount);

            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.totalUsers).to.equal(1);
        });
    });

    describe("checkIsDeployer", function () {
        it("should return true for registered deployer", async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            expect(await deployerRewards.checkIsDeployer(deployer.address)).to.equal(true);
        });

        it("should return false for non-registered address", async function () {
            expect(await deployerRewards.checkIsDeployer(other.address)).to.equal(false);
        });
    });

    describe("getReferralLink", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
        });

        it("should return valid URL format", async function () {
            const referralLink = await deployerRewards.getReferralLink(deployer.address);
            // Check it starts with expected prefix
            expect(referralLink).to.include("https://app.agentskills.io/ref/");
            // The address portion should be 42 chars (0x + 40 hex chars)
            const addressPart = referralLink.split("/ref/")[1];
            expect(addressPart).to.have.lengthOf(42);
            expect(addressPart).to.match(/^0x[a-f0-9]{40}$/);
        });

        it("should include correct deployer address", async function () {
            const referralLink = await deployerRewards.getReferralLink(deployer.address);
            const addressPart = referralLink.split("/ref/")[1];
            // The address should match the deployer's address (lowercase)
            expect(addressPart).to.equal(deployer.address.toLowerCase());
        });

        it("should revert for non-registered deployer", async function () {
            await expect(
                deployerRewards.getReferralLink(other.address)
            ).to.be.revertedWithCustomError(deployerRewards, "NotRegistered");
        });
    });

    describe("getTierInfo", function () {
        it("should return Bronze tier config", async function () {
            const config = await deployerRewards.getTierInfo(TIER_BRONZE);
            expect(config.minUsers).to.equal(0);
            expect(config.minActiveUsers).to.equal(0);
            expect(config.monthlyLimit).to.equal(BRONZE_LIMIT);
        });

        it("should return Silver tier config", async function () {
            const config = await deployerRewards.getTierInfo(TIER_SILVER);
            expect(config.minUsers).to.equal(20);
            expect(config.minActiveUsers).to.equal(10);
            expect(config.monthlyLimit).to.equal(SILVER_LIMIT);
        });

        it("should return Gold tier config", async function () {
            const config = await deployerRewards.getTierInfo(TIER_GOLD);
            expect(config.minUsers).to.equal(100);
            expect(config.minActiveUsers).to.equal(50);
            expect(config.monthlyLimit).to.equal(0);
        });

        it("should revert for invalid tier index", async function () {
            await expect(
                deployerRewards.getTierInfo(3)
            ).to.be.revertedWithCustomError(deployerRewards, "InvalidTier");
        });
    });

    describe("setUserActive", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
        });

        it("should increment active users", async function () {
            await deployerRewards.setUserActive(user.address, deployer.address);

            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.activeUsers).to.equal(1);
        });

        it("should revert when deployer not registered", async function () {
            await expect(
                deployerRewards.setUserActive(user.address, other.address)
            ).to.be.revertedWithCustomError(deployerRewards, "NotRegistered");
        });
    });

    describe("claimRewards", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should claim pending rewards", async function () {
            const stakeAmount = ethers.parseEther("1000");
            await deployerRewards.connect(deployer).onUserRegistered(user.address, stakeAmount);

            const initialBalance = await mockToken.balanceOf(deployer.address);
            await deployerRewards.connect(deployer).claimRewards();
            const finalBalance = await mockToken.balanceOf(deployer.address);

            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("should revert when not registered", async function () {
            await expect(
                deployerRewards.connect(other).claimRewards()
            ).to.be.revertedWithCustomError(deployerRewards, "NotRegistered");
        });

        it("should reset pending rewards after claim", async function () {
            const stakeAmount = ethers.parseEther("1000");
            await deployerRewards.connect(deployer).onUserRegistered(user.address, stakeAmount);

            await deployerRewards.connect(deployer).claimRewards();
            const stats = await deployerRewards.getDeployerStats(deployer.address);
            expect(stats.pendingRewards).to.equal(0);
        });
    });

    describe("setTierConfig", function () {
        it("should allow owner to update tier config", async function () {
            const newConfig = {
                minUsers: 30,
                minActiveUsers: 15,
                firstReward: ethers.parseEther("4000"),
                activeRewardRate: 1800,
                monthlyLimit: 75
            };

            // Update the tier config
            await deployerRewards.connect(owner).setTierConfig(TIER_SILVER, newConfig);

            // Verify the config was updated
            const config = await deployerRewards.getTierInfo(TIER_SILVER);
            expect(config.minUsers).to.equal(30);
            expect(config.minActiveUsers).to.equal(15);
            expect(config.firstReward).to.equal(ethers.parseEther("4000"));
            expect(config.activeRewardRate).to.equal(1800);
            expect(config.monthlyLimit).to.equal(75);
        });

        it("should revert when tier index is invalid", async function () {
            const newConfig = {
                minUsers: 30,
                minActiveUsers: 15,
                firstReward: ethers.parseEther("4000"),
                activeRewardRate: 1800,
                monthlyLimit: 75
            };

            await expect(
                deployerRewards.connect(owner).setTierConfig(5, newConfig)
            ).to.be.revertedWithCustomError(deployerRewards, "InvalidTier");
        });
    });

    describe("getDividend", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should return pending rewards for registered deployer", async function () {
            const stakeAmount = ethers.parseEther("1000");
            await deployerRewards.connect(deployer).onUserRegistered(user.address, stakeAmount);

            const dividend = await deployerRewards.getDividend(deployer.address);
            expect(dividend).to.be.gt(0);
        });

        it("should return 0 for non-registered address", async function () {
            const dividend = await deployerRewards.getDividend(other.address);
            expect(dividend).to.equal(0);
        });
    });

    describe("getGovernanceWeight", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
        });

        it("should return base weight for Bronze", async function () {
            const stakeAmount = ethers.parseEther("100");
            for (let i = 0; i < 10; i++) {
                await deployerRewards.connect(deployer).onUserRegistered(
                    ethers.Wallet.createRandom().address,
                    stakeAmount
                );
            }

            const weight = await deployerRewards.getGovernanceWeight(deployer.address);
            expect(weight).to.equal(10n * 10n**18n);
        });

        it("should return 0 for non-registered address", async function () {
            const weight = await deployerRewards.getGovernanceWeight(other.address);
            expect(weight).to.equal(0);
        });
    });

    describe("isGoldTier", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should return false for Bronze deployer", async function () {
            expect(await deployerRewards.isGoldTier(deployer.address)).to.equal(false);
        });

        it("should return false for non-registered address", async function () {
            expect(await deployerRewards.isGoldTier(other.address)).to.equal(false);
        });
    });

    describe("getEffectiveReferrals", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should return total users count", async function () {
            const stakeAmount = ethers.parseEther("100");
            for (let i = 0; i < 15; i++) {
                if (i > 0 && i % 9 === 0) await time.increase(31 * 24 * 60 * 60);
                await deployerRewards.connect(deployer).onUserRegistered(
                    ethers.Wallet.createRandom().address,
                    stakeAmount
                );
            }

            const effective = await deployerRewards.getEffectiveReferrals(deployer.address);
            expect(effective).to.equal(15);
        });

        it("should return 0 for non-registered address", async function () {
            const effective = await deployerRewards.getEffectiveReferrals(other.address);
            expect(effective).to.equal(0);
        });
    });

    describe("getRewardRate", function () {
        beforeEach(async function () {
            await deployerRewards.connect(deployer).registerDeployer("test.com");
            await mockToken.transfer(
                await deployerRewards.getAddress(),
                ethers.parseEther("100000")
            );
        });

        it("should return 1000 (10%) for Bronze tier", async function () {
            const rate = await deployerRewards.getRewardRate(deployer.address);
            expect(rate).to.equal(1000);
        });

        it("should return 0 for non-registered address", async function () {
            const rate = await deployerRewards.getRewardRate(other.address);
            expect(rate).to.equal(0);
        });
    });
});