const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployContracts() {
  const [owner, user1, user2, ...accounts] = await ethers.getSigners();

  // 1. Deploy ASKToken
  const Token = await ethers.getContractFactory("ASKToken");
  const token = await Token.deploy();
  const tokenTx = await token.waitForDeployment();
  console.log("ASKToken deployed at:", await token.getAddress());

  // 2. Deploy StakingManager (requires token address)
  const Staking = await ethers.getContractFactory("StakingManager");
  const staking = await Staking.deploy(token);
  const stakingTx = await staking.waitForDeployment();
  console.log("StakingManager deployed at:", await staking.getAddress());

  // 3. Deploy SkillRegistry (requires token + stakingManager addresses)
  const Registry = await ethers.getContractFactory("SkillRegistry");
  const registry = await Registry.deploy(token, staking);
  const registryTx = await registry.waitForDeployment();
  console.log("SkillRegistry deployed at:", await registry.getAddress());

  // 4. Deploy Attribution (no constructor args, but needs setStakingManager)
  const Attribution = await ethers.getContractFactory("Attribution");
  const attribution = await Attribution.deploy();
  const attributionTx = await attribution.waitForDeployment();
  console.log("Attribution deployed at:", await attribution.getAddress());

  // CRITICAL: Wire Attribution to StakingManager (per D-03 and PITFALL #1)
  await attribution.setStakingManager(staking);
  console.log("Attribution wired to StakingManager");

  return { token, staking, registry, attribution, owner, user1, user2, accounts };
}

describe("Fixture Smoke Test", function() {
  const fixture = deployContracts;

  it("should deploy all contracts successfully", async function() {
    const { token, staking, registry, attribution } = await loadFixture(fixture);

    // Verify all addresses are non-zero
    const AddressZero = "0x0000000000000000000000000000000000000000";
    expect(await token.getAddress()).to.not.equal(AddressZero);
    expect(await staking.getAddress()).to.not.equal(AddressZero);
    expect(await registry.getAddress()).to.not.equal(AddressZero);
    expect(await attribution.getAddress()).to.not.equal(AddressZero);
  });

  it("should wire contracts correctly", async function() {
    const { token, staking, registry, attribution } = await loadFixture(fixture);

    // Verify SkillRegistry has correct token and stakingManager
    expect(await registry.token()).to.equal(await token.getAddress());
    expect(await registry.stakingManager()).to.equal(await staking.getAddress());

    // Verify Attribution has stakingManager set (per D-03 and PITFALL #1)
    expect(await attribution.stakingManager()).to.equal(await staking.getAddress());
  });

  it("should have correct contract dependencies", async function() {
    const { token, staking } = await loadFixture(fixture);

    // StakingManager should reference the token
    expect(await staking.token()).to.equal(await token.getAddress());
  });
});