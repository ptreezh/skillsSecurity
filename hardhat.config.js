import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-verify";
import "solidity-coverage";
import "dotenv/config";

export default {
  solidity: {
    compilers: [
      { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } }
    ]
  },
  paths: {
    sources: "./contracts",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts"
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002
    },
    polygon: {
      url: process.env.POLYGON_RPC || "https://rpc.ankr.com/polygon",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137
    }
  },
  // Only run Solidity tests, exclude E2E Playwright tests
  testFiles: []
};
