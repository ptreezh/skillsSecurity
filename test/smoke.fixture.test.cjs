const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployContracts() {
  const [owner, user1, user2, ...accounts] = await ethers.getSigners();

  // 1. Deploy StakingManager (no token dependency in v1.5)
  const Staking = await ethers.getContractFactory("StakingManager");
  const staking = await Staking.deploy();
  await staking.waitForDeployment();
  console.log("StakingManager deployed at:", await staking.getAddress());

  // 2. Deploy SkillRegistry (requires stakingManager address)
  const Registry = await ethers.getContractFactory("SkillRegistry");
  const registry = await Registry.deploy(staking);
  await registry.waitForDeployment();
  console.log("SkillRegistry deployed at:", await registry.getAddress());

  // 3. Deploy Attribution (no constructor args, but needs setStakingManager)
  const Attribution = await ethers.getContractFactory("Attribution");
  const attribution = await Attribution.deploy();
  await attribution.waitForDeployment();
  console.log("Attribution deployed at:", await attribution.getAddress());

  // CRITICAL: Wire Attribution to StakingManager (per D-03 and PITFALL #1)
  await attribution.setStakingManager(staking);
  console.log("Attribution wired to StakingManager");

  // 4. Deploy ReputationBadges
  const Badges = await ethers.getContractFactory("ReputationBadges");
  const badges = await Badges.deploy();
  await badges.waitForDeployment();
  console.log("ReputationBadges deployed at:", await badges.getAddress());

  // 5. Deploy RevenueSplit
  const RevenueSplit = await ethers.getContractFactory("RevenueSplit");
  const revenueSplit = await RevenueSplit.deploy();
  await revenueSplit.waitForDeployment();
  console.log("RevenueSplit deployed at:", await revenueSplit.getAddress());

  // 6. Deploy SelfSustainingEcosystem
  const Ecosystem = await ethers.getContractFactory("SelfSustainingEcosystem");
  const ecosystem = await Ecosystem.deploy();
  await ecosystem.waitForDeployment();
  console.log("SelfSustainingEcosystem deployed at:", await ecosystem.getAddress());

  return {
    staking, registry, attribution, badges, revenueSplit, ecosystem,
    owner, user1, user2, accounts
  };
}

describe("Fixture Smoke Test", function() {
  const fixture = deployContracts;

  it("should deploy all core contracts successfully", async function() {
    const deployed = await loadFixture(fixture);

    const AddressZero = "0x0000000000000000000000000000000000000000";
    expect(deployed.staking.getAddress()).to.not.equal(AddressZero);
    expect(deployed.registry.getAddress()).to.not.equal(AddressZero);
    expect(deployed.attribution.getAddress()).to.not.equal(AddressZero);
  });

  it("should wire SkillRegistry to StakingManager", async function() {
    const { staking, registry } = await loadFixture(fixture);
    expect(await registry.stakingManager()).to.equal(await staking.getAddress());
  });

  it("should wire Attribution to StakingManager", async function() {
    const { staking, attribution } = await loadFixture(fixture);
    expect(await attribution.stakingManager()).to.equal(await staking.getAddress());
  });

  it("should deploy revenue contracts", async function() {
    const { badges, revenueSplit, ecosystem } = await loadFixture(fixture);

    const AddressZero = "0x0000000000000000000000000000000000000000";
    expect(await badges.getAddress()).to.not.equal(AddressZero);
    expect(await revenueSplit.getAddress()).to.not.equal(AddressZero);
    expect(await ecosystem.getAddress()).to.not.equal(AddressZero);
  });
});