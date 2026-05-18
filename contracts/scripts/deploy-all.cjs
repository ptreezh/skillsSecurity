/**
 * AgentSkills Deployment Script - Polygon Amoy
 *
 * Deploys all contracts in correct dependency order:
 * 1. ASKToken (no dependencies)
 * 2. StakingManager (requires ASKToken address)
 * 3. SkillRegistry (requires ASKToken + StakingManager addresses)
 * 4. Attribution (no constructor args, then wire setStakingManager)
 *
 * Usage: npx hardhat run contracts/scripts/deploy-all.cjs --network polygonAmoy
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const hre = require("hardhat");
const fs = require("fs");

// D-05: Hybrid approach - use .env file if exists
let PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("ERROR: PRIVATE_KEY not found in .env file.");
  console.error("Please set PRIVATE_KEY in contracts/.env");
  process.exit(1);
}

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;

async function main() {
  console.log("=".repeat(60));
  console.log("AgentSkills Deployment - Polygon Amoy Testnet");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);

  const provider = new hre.ethers.JsonRpcProvider(
    process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology"
  );
  const wallet = new hre.ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Deployer:", wallet.address);
  console.log("=".repeat(60));

  const deployed = {};

  // 1. Deploy ASKToken (D-03: deployment order)
  console.log("\n[1/4] Deploying ASKToken...");
  const ASKToken = await hre.ethers.getContractFactory("ASKToken", wallet);
  const askToken = await ASKToken.deploy();
  await askToken.waitForDeployment();
  const askTokenAddress = await askToken.getAddress();
  deployed.ASKToken = askTokenAddress;
  console.log("  ASKToken deployed to:", askTokenAddress);

  // 2. Deploy StakingManager
  console.log("\n[2/4] Deploying StakingManager...");
  const StakingManager = await hre.ethers.getContractFactory("StakingManager", wallet);
  const stakingManager = await StakingManager.deploy(askTokenAddress);
  await stakingManager.waitForDeployment();
  const stakingManagerAddress = await stakingManager.getAddress();
  deployed.StakingManager = stakingManagerAddress;
  console.log("  StakingManager deployed to:", stakingManagerAddress);

  // 3. Deploy SkillRegistry
  console.log("\n[3/4] Deploying SkillRegistry...");
  const SkillRegistry = await hre.ethers.getContractFactory("SkillRegistry", wallet);
  const skillRegistry = await SkillRegistry.deploy(askTokenAddress, stakingManagerAddress);
  await skillRegistry.waitForDeployment();
  const skillRegistryAddress = await skillRegistry.getAddress();
  deployed.SkillRegistry = skillRegistryAddress;
  console.log("  SkillRegistry deployed to:", skillRegistryAddress);

  // 4. Deploy Attribution (no constructor args)
  console.log("\n[4/4] Deploying Attribution...");
  const Attribution = await hre.ethers.getContractFactory("Attribution", wallet);
  const attribution = await Attribution.deploy();
  await attribution.waitForDeployment();
  const attributionAddress = await attribution.getAddress();
  deployed.Attribution = attributionAddress;
  console.log("  Attribution deployed to:", attributionAddress);

  // CRITICAL: Wire Attribution to StakingManager (D-04)
  console.log("\n[Wiring] Calling Attribution.setStakingManager()...");
  await attribution.setStakingManager(stakingManagerAddress);
  console.log("  Attribution wired to StakingManager at:", stakingManagerAddress);

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("ASKToken:       ", askTokenAddress);
  console.log("StakingManager:", stakingManagerAddress);
  console.log("SkillRegistry: ", skillRegistryAddress);
  console.log("Attribution:   ", attributionAddress);
  console.log("=".repeat(60));

  // Save deployments.json
  const deployments = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    timestamp: new Date().toISOString(),
    deployer: wallet.address,
    contracts: deployed
  };

  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\nDeployment info saved to:", deploymentsPath);

  // Verify contracts if API key is present (D-11, D-12)
  if (POLYGONSCAN_API_KEY) {
    console.log("\n" + "=".repeat(60));
    console.log("VERIFYING CONTRACTS ON POLYGONSCAN");
    console.log("=".repeat(60));

    try {
      // Verify ASKToken (no constructor args)
      console.log("\n[Verify 1/4] Verifying ASKToken...");
      await hre.run("verify:verify", {
        address: askTokenAddress,
        constructorArguments: []
      });
      console.log("  ASKToken verified successfully");
    } catch (err) {
      console.warn("  ASKToken verification failed:", err.message);
    }

    try {
      // Verify StakingManager
      console.log("\n[Verify 2/4] Verifying StakingManager...");
      await hre.run("verify:verify", {
        address: stakingManagerAddress,
        constructorArguments: [askTokenAddress]
      });
      console.log("  StakingManager verified successfully");
    } catch (err) {
      console.warn("  StakingManager verification failed:", err.message);
    }

    try {
      // Verify SkillRegistry
      console.log("\n[Verify 3/4] Verifying SkillRegistry...");
      await hre.run("verify:verify", {
        address: skillRegistryAddress,
        constructorArguments: [askTokenAddress, stakingManagerAddress]
      });
      console.log("  SkillRegistry verified successfully");
    } catch (err) {
      console.warn("  SkillRegistry verification failed:", err.message);
    }

    try {
      // Verify Attribution (no constructor args)
      console.log("\n[Verify 4/4] Verifying Attribution...");
      await hre.run("verify:verify", {
        address: attributionAddress,
        constructorArguments: []
      });
      console.log("  Attribution verified successfully");
    } catch (err) {
      console.warn("  Attribution verification failed:", err.message);
    }

    console.log("\n" + "=".repeat(60));
    console.log("Verification complete. Check https://polygonscan.com/");
    console.log("=".repeat(60));
  } else {
    console.log("\nWARNING: POLYGONSCAN_API_KEY not set, skipping verification");
    console.log("To verify contracts, set POLYGONSCAN_API_KEY in .env and run:");
    console.log("  npx hardhat verify <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS> --network polygonAmoy");
  }

  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment failed:", error.message);
    process.exit(1);
  });