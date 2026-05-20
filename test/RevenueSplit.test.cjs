const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RevenueSplit", function () {
  let revenueSplit;
  let owner, creator, auditor, referrer;

  beforeEach(async function () {
    const RevenueSplit = await ethers.getContractFactory("RevenueSplit");
    [owner, creator, auditor, referrer] = await ethers.getSigners();
    revenueSplit = await RevenueSplit.deploy();
    await revenueSplit.waitForDeployment();
  });

  it("should deposit and split correctly", async function () {
    const depositAmount = ethers.parseEther("1");
    await revenueSplit.deposit(creator.address, auditor.address, referrer.address, { value: depositAmount });

    expect(await revenueSplit.creatorShares(creator.address)).to.equal(ethers.parseEther("0.7"));
    expect(await revenueSplit.referrerShares(referrer.address)).to.equal(ethers.parseEther("0.1"));
    expect(await revenueSplit.auditorShares(auditor.address)).to.equal(ethers.parseEther("0.05"));
  });

  it("should allow creator to withdraw after cooldown", async function () {
    await revenueSplit.deposit(creator.address, auditor.address, referrer.address, { value: ethers.parseEther("1") });

    // Advance time to pass cooldown
    await time.increase(2 * 60 * 60);

    // Check share balance before
    const share = await revenueSplit.calculateShare(creator.address);
    expect(share).to.equal(ethers.parseEther("0.7"));

    // Withdraw should succeed
    await revenueSplit.connect(creator).withdraw();

    // Verify share is now zero
    expect(await revenueSplit.creatorShares(creator.address)).to.equal(0);
  });

  it("should calculate share correctly", async function () {
    await revenueSplit.deposit(creator.address, auditor.address, referrer.address, { value: ethers.parseEther("1") });

    const share = await revenueSplit.calculateShare(creator.address);
    expect(share).to.equal(ethers.parseEther("0.7"));
  });

  it("should allow emergency withdrawal by owner", async function () {
    await revenueSplit.deposit(creator.address, auditor.address, referrer.address, { value: ethers.parseEther("10") });

    await revenueSplit.emergencyWithdraw(owner.address);

    // Contract should be empty
    expect(await revenueSplit.getBalance()).to.equal(0);
  });
});

describe("ReputationBadges", function () {
  let badges, owner, user;

  beforeEach(async function () {
    const ReputationBadges = await ethers.getContractFactory("ReputationBadges");
    [owner, user] = await ethers.getSigners();
    badges = await ReputationBadges.deploy();
    await badges.waitForDeployment();
  });

  it("should issue badge to user", async function () {
    const tx = await badges.connect(owner).issueBadge(user.address, 0, "100+ deliveries");
    await tx.wait();

    expect(await badges.balanceOf(user.address)).to.equal(1);
  });

  it("should prevent transfers", async function () {
    await badges.connect(owner).issueBadge(user.address, 0, "Early adopter");

    await expect(
      badges.connect(user).transferFrom(user.address, owner.address, 0)
    ).to.be.revertedWith("Badges are non-transferable");
  });

  it("should only allow owner to issue badges", async function () {
    await expect(
      badges.connect(user).issueBadge(user.address, 0, "Test")
    ).to.be.reverted;
  });

  it("should store badge info correctly", async function () {
    await badges.connect(owner).issueBadge(user.address, 1, "Certified developer");

    const info = await badges.getBadgeInfo(0);
    expect(info[0]).to.equal(1); // badgeType = VERIFIED_DEVELOPER
    expect(info[1]).to.equal("Certified developer");
    expect(info[2]).to.be.gt(0);
  });

  it("should count user badges correctly", async function () {
    await badges.connect(owner).issueBadge(user.address, 0, "100+");
    await badges.connect(owner).issueBadge(user.address, 0, "100++");

    expect(await badges.getUserBadgeCount(user.address, 0)).to.equal(2);
  });
});

describe("SelfSustainingEcosystem", function () {
  let ecosystem, owner, user1;

  beforeEach(async function () {
    const SelfSustainingEcosystem = await ethers.getContractFactory("SelfSustainingEcosystem");
    [owner, user1] = await ethers.getSigners();
    ecosystem = await SelfSustainingEcosystem.deploy();
    await ecosystem.waitForDeployment();
  });

  it("should register a role", async function () {
    await ecosystem.connect(user1).registerRole(0); // CREATOR = 0

    const roles = await ecosystem.getUserRoles(user1.address);
    expect(roles.length).to.equal(1);
    expect(roles[0][0]).to.equal(0); // Role.CREATOR = 0
    expect(roles[0][1]).to.equal(0); // Tier.BRONZE = 0
  });

  it("should prevent duplicate role registration", async function () {
    await ecosystem.connect(user1).registerRole(0);

    await expect(
      ecosystem.connect(user1).registerRole(0)
    ).to.be.revertedWith("Role already registered");
  });

  it("should record contributions", async function () {
    await ecosystem.connect(user1).registerRole(0);
    await ecosystem.connect(user1).recordContribution(0, 5);

    const info = await ecosystem.getRoleInfo(user1.address, 0);
    expect(info[2]).to.equal(5); // contributions = 5
  });

  it("should auto-upgrade tier on contributions", async function () {
    await ecosystem.connect(user1).registerRole(0);

    // Add enough contributions to reach SILVER tier (10 min)
    for (let i = 0; i < 4; i++) {
      await ecosystem.connect(user1).recordContribution(0, 3);
    }

    // Check tier upgrade
    const info = await ecosystem.getRoleInfo(user1.address, 0);
    expect(info[1]).to.equal(1); // SILVER tier
  });

  it("should calculate rewards correctly", async function () {
    await ecosystem.connect(user1).registerRole(0);
    await ecosystem.connect(user1).recordContribution(0, 10);

    const rewards = await ecosystem.calculateRewards(user1.address, 0);
    expect(rewards).to.be.gt(0);
  });

  it("should allow claiming rewards", async function () {
    // Register role first
    await ecosystem.connect(user1).registerRole(0);

    // Fund the contract
    await owner.sendTransaction({ to: ecosystem.target, value: ethers.parseEther("1") });

    // Add rewards manually (only owner can do this)
    await ecosystem.addRewards(user1.address, 0, ethers.parseEther("0.5"));

    const balanceBefore = await ethers.provider.getBalance(user1.address);
    await ecosystem.connect(user1).claimRewards();
    const balanceAfter = await ethers.provider.getBalance(user1.address);

    // Check reward was received (gas cost means exact match won't work)
    const received = balanceAfter - balanceBefore;
    expect(received).to.be.closeTo(ethers.parseEther("0.5"), ethers.parseEther("0.01"));
  });
});