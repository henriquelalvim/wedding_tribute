import "dotenv/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const {
  PRIVATE_KEY,
  BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org",
  BASE_RPC_URL = "https://mainnet.base.org",
  BASESCAN_API_KEY = "",
} = process.env;

// Only forward the deployer key when it is actually configured, so `hardhat test`
// works on a fresh clone with no .env file.
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

export default {
  plugins: [hardhatToolboxMochaEthers],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // In-process chain used by `hardhat test`.
    hardhat: {
      type: "edr-simulated",
      chainType: "op",
      chainId: 31337,
    },
    // Standalone node started with `npm run node`.
    localhost: {
      type: "http",
      chainType: "op",
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    baseSepolia: {
      type: "http",
      chainType: "op",
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts,
    },
    base: {
      type: "http",
      chainType: "op",
      url: BASE_RPC_URL,
      chainId: 8453,
      accounts,
    },
  },

  verify: {
    etherscan: { apiKey: BASESCAN_API_KEY },
  },
};
