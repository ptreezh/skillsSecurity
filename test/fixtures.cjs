/**
 * Test Fixtures for AgentSkills Contracts
 *
 * Deployment Order (per D-02):
 * 1. ASKToken — no dependencies
 * 2. StakingManager — requires ASKToken address
 * 3. SkillRegistry — requires ASKToken + StakingManager addresses
 * 4. Attribution — requires setStakingManager() call after deployment (per D-03)
 */

/**
 * Deploy all contracts in correct dependency order.
 * Uses loadFixture for snapshot isolation (handles beforeEach automatically).
 *
 * @returns {Object} { token, staking, registry, attribution }
 */
async function deployContracts() {
  const [owner, user1, user2, ...accounts] = await ethers.getSigners();

  // 1. Deploy ASKToken
  const Token = await ethers.getContractFactory("ASKToken");
  const token = await Token.deploy();
  await token.waitForDeployment();

  // 2. Deploy StakingManager (requires token address)
  const Staking = await ethers.getContractFactory("StakingManager");
  const staking = await Staking.deploy(token);
  await staking.waitForDeployment();

  // 3. Deploy SkillRegistry (requires token + stakingManager addresses)
  const Registry = await ethers.getContractFactory("SkillRegistry");
  const registry = await Registry.deploy(token, staking);
  await registry.waitForDeployment();

  // 4. Deploy Attribution (no constructor args, but needs setStakingManager)
  const Attribution = await ethers.getContractFactory("Attribution");
  const attribution = await Attribution.deploy();
  await attribution.waitForDeployment();

  // CRITICAL: Wire Attribution to StakingManager (per D-03 and PITFALL #1)
  await attribution.setStakingManager(staking);

  return { token, staking, registry, attribution, owner, user1, user2, accounts };
}

module.exports = {
  deployContracts,
  // Also export contract names for direct use
  ASKToken: "ASKToken",
  StakingManager: "StakingManager",
  SkillRegistry: "SkillRegistry",
  Attribution: "Attribution"
};