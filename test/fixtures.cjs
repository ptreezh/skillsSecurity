/**
 * Test Fixtures for AgentSkills Contracts
 *
 * Deployment Order (no-token architecture, per D-02):
 * 1. StakingManager -- no constructor args
 * 2. SkillRegistry -- requires StakingManager address only
 * 3. Attribution -- no constructor args, needs setStakingManager() call after deployment
 */

/**
 * Deploy all contracts in correct dependency order.
 * Uses loadFixture for snapshot isolation (handles beforeEach automatically).
 *
 * @returns {Object} { staking, registry, attribution, owner, user1, user2, accounts }
 */
async function deployContracts() {
  const [owner, user1, user2, ...accounts] = await ethers.getSigners();

  // 1. Deploy StakingManager (no constructor args in no-token architecture)
  const Staking = await ethers.getContractFactory("StakingManager");
  const staking = await Staking.deploy();
  await staking.waitForDeployment();

  // Set governance to owner for testing (in production, use GovernanceTimelock)
  await staking.setGovernance(owner.address);

  // 2. Deploy SkillRegistry (only stakingManager address)
  const Registry = await ethers.getContractFactory("SkillRegistry");
  const registry = await Registry.deploy(staking);
  await registry.waitForDeployment();

  // 3. Deploy Attribution (no constructor args, but needs setStakingManager)
  const Attribution = await ethers.getContractFactory("Attribution");
  const attribution = await Attribution.deploy();
  await attribution.waitForDeployment();

  // CRITICAL: Wire Attribution to StakingManager (per D-03 and PITFALL #1)
  await attribution.setStakingManager(staking);

  return { staking, registry, attribution, owner, user1, user2, accounts };
}

module.exports = {
  deployContracts,
  // Also export contract names for direct use
  StakingManager: "StakingManager",
  SkillRegistry: "SkillRegistry",
  Attribution: "Attribution"
};