const hre = require("hardhat");

async function main() {
  const blockNum = await hre.ethers.provider.getBlockNumber();
  console.log("✅ Connected! Current block:", blockNum);
  
  const balance = await hre.ethers.provider.getBalance((await hre.ethers.getSigners())[0].address);
  console.log("   Wallet balance:", hre.ethers.formatEther(balance), "MATIC");
  
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log("   Chain ID:", chainId);
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
