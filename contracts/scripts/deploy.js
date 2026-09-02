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

const groom = process.env.GROOM_ADDRESS;
const bride = process.env.BRIDE_ADDRESS;

if (!groom || !bride) {
  throw new Error(
    "Set GROOM_ADDRESS and BRIDE_ADDRESS in contracts/.env (copy .env.example).",
  );
}
if (!ethers.isAddress(groom) || !ethers.isAddress(bride)) {
  throw new Error(`Invalid address: groom=${groom} bride=${bride}`);
}
if (groom.toLowerCase() === bride.toLowerCase()) {
  throw new Error("GROOM_ADDRESS and BRIDE_ADDRESS must be different.");
}

const [deployer] = await ethers.getSigners();
const { chainId } = await ethers.provider.getNetwork();
const balance = await ethers.provider.getBalance(deployer.address);

console.log(`\nNetwork   ${networkName} (chainId ${chainId})`);
console.log(`Deployer  ${deployer.address}  (${ethers.formatEther(balance)} ETH)`);
console.log(`Groom     ${groom}`);
console.log(`Bride     ${bride}\n`);

if (balance === 0n) {
  throw new Error("Deployer has no ETH on this network.");
}

const factory = await ethers.getContractFactory("WeddingGift");
const contract = await factory.deploy(groom, bride);
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
  groom,
  bride,
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
if (explorer) {
  console.log(
    `  2. npx hardhat verify --network ${networkName} ${address} ${groom} ${bride}`,
  );
}
console.log("");
