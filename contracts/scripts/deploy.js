import "dotenv/config";
import { network } from "hardhat";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exportAbi } from "./export-abi.js";

const here = dirname(fileURLToPath(import.meta.url));

const EXPLORERS = {
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

// `connect()` is the only API that honours the CLI `--network` flag.
const { ethers, networkName } = await network.connect();

const [deployer] = await ethers.getSigners();
const { chainId } = await ethers.provider.getNetwork();
const balance = await ethers.provider.getBalance(deployer.address);

console.log(`\nNetwork   ${networkName} (chainId ${chainId})`);
console.log(`Deployer  ${deployer.address}  (${ethers.formatEther(balance)} ETH)\n`);

if (balance === 0n) {
  throw new Error("Deployer has no ETH on this network.");
}

// The couple's addresses are no longer known at deploy time: they don't exist until
// the groom/bride log in for the first time. Deploy now, assign them later — either
// through the frontend's admin panel, or with scripts/set-couple.js.
const factory = await ethers.getContractFactory("WeddingGift");
const contract = await factory.connect(deployer).deploy();
console.log(`Deploying... tx ${contract.deploymentTransaction()?.hash}`);
await contract.waitForDeployment();

const address = await contract.getAddress();
console.log(`\n✅ WeddingGift deployed at ${address}`);

const explorer = EXPLORERS[Number(chainId)];
if (explorer) {
  console.log(`   ${explorer}/address/${address}`);
}

// Record the deployment so the frontend .env can be filled in without guesswork.
const outDir = resolve(here, "../deployments");
mkdirSync(outDir, { recursive: true });
const record = {
  network: networkName,
  chainId: Number(chainId),
  address,
  deployer: deployer.address,
  deployedAt: new Date().toISOString(),
};
writeFileSync(
  resolve(outDir, `${networkName}.json`),
  `${JSON.stringify(record, null, 2)}\n`,
);

exportAbi();
console.log("   ABI exported to frontend/src/abi/WeddingGift.json");

console.log("\nNext steps:");
console.log(`  1. frontend/.env  →  VITE_CONTRACT_ADDRESS=${address}`);
console.log(`                       VITE_CHAIN_ID=${chainId}`);
console.log(
  "  2. Log in as the deployer in the frontend and use the discreet admin panel\n" +
    "     to assign groom/bride once you know their addresses — or run\n" +
    "     `npm run set-couple -- --network " +
    networkName +
    "` if GROOM_ADDRESS/BRIDE_ADDRESS are set in .env.",
);
if (explorer) {
  console.log(`  3. npx hardhat verify --network ${networkName} ${address}`);
}
console.log("");
