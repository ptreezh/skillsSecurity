require("dotenv").config();
const ethers = require("ethers");
const hre = require("hardhat");

async function deploy(hre, artifact, args = []) {
  const provider = hre.network.provider;

  const accounts = await provider.send("eth_accounts");
  const deployerAddress = accounts[0];

  const nonce = await provider.send("eth_getTransactionCount", [deployerAddress, "pending"]);

  const bytecode = artifact.bytecode;
  const abi = artifact.abi;

  const constructorDef = abi.find(i => i.type === 'constructor');
  const constructorArgs = args.length > 0 && constructorDef
    ? ethers.utils.defaultAbiCoder.encode(
        constructorDef.inputs || [],
        args
      )
    : '0x';

  const data = bytecode + constructorArgs.slice(2);

  const gasEstimate = await provider.send("eth_estimateGas", [{
    from: deployerAddress,
    data: data
  }]);

  const gasPrice = await provider.send("eth_gasPrice", []);
  const gas = ethers.utils.hexValue(parseInt(gasEstimate.toString(), 16) + 200000);

  const txHash = await provider.send("eth_sendTransaction", [{
    from: deployerAddress,
    data: data,
    gas: gas,
    gasPrice: gasPrice,
    nonce: nonce
  }]);

  let receipt = null;
  while (!receipt) {
    await new Promise(r => setTimeout(r, 2000));
    receipt = await provider.send("eth_getTransactionReceipt", [txHash]);
  }

  if (receipt.status === "0x0") {
    throw new Error("Transaction failed");
  }

  return {
    address: receipt.contractAddress,
    abi: abi
  };
}

async function main() {
  console.log("Deploying ASKToken contracts...\n");
  console.log("Network:", hre.network.name);

  const accounts = await hre.network.provider.send("eth_accounts");
  console.log("Deployer:", accounts[0], "\n");

  const artifacts = hre.artifacts;

  console.log("1. Deploying ASKToken...");
  const askToken = await deploy(hre, await artifacts.readArtifact("ASKToken"));
  console.log(`   ASKToken deployed to: ${askToken.address}`);

  console.log("2. Deploying SkillRegistry...");
  const skillRegistry = await deploy(hre, await artifacts.readArtifact("SkillRegistry"), [askToken.address]);
  console.log(`   SkillRegistry deployed to: ${skillRegistry.address}`);

  console.log("3. Deploying StakingManager...");
  const stakingManager = await deploy(hre, await artifacts.readArtifact("StakingManager"), [askToken.address]);
  console.log(`   StakingManager deployed to: ${stakingManager.address}`);

  console.log("4. Deploying Attribution...");
  const attribution = await deploy(hre, await artifacts.readArtifact("Attribution"));
  console.log(`   Attribution deployed to: ${attribution.address}`);

  console.log("\n========================================");
  console.log("Deployment Summary");
  console.log("========================================");
  console.log(`ASKToken:         ${askToken.address}`);
  console.log(`SkillRegistry:    ${skillRegistry.address}`);
  console.log(`StakingManager:   ${stakingManager.address}`);
  console.log(`Attribution:      ${attribution.address}`);
  console.log("========================================\n");

  // 查询 Total Supply（直接通过 RPC）
  const provider = hre.network.provider;
  const totalSupplyData = await provider.send("eth_call", [{
    to: askToken.address,
    data: "0x18160ddd"  // totalSupply()
  }]);
  const totalSupply = BigInt(totalSupplyData);
  console.log(`ASKToken Total Supply: ${ethers.utils.formatEther(totalSupply)} ASK\n`);

  // 保存部署信息
  const fs = require("fs");
  const chainId = await provider.send("eth_chainId");
  const deployments = {
    network: hre.network.name,
    chainId: parseInt(chainId, 16),
    timestamp: new Date().toISOString(),
    deployer: accounts[0],
    contracts: {
      ASKToken: askToken.address,
      SkillRegistry: skillRegistry.address,
      StakingManager: stakingManager.address,
      Attribution: attribution.address
    }
  };

  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
  console.log("Deployment info saved to deployments.json");

  // 也保存到 contracts 目录
  fs.writeFileSync("contracts/deployments.json", JSON.stringify(deployments, null, 2));
  console.log("Deployment info saved to contracts/deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });