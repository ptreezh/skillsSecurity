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
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337
    }
  },
  // Only run Solidity tests, exclude E2E Playwright tests
  testFiles: []
};
