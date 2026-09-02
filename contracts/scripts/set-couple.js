import "dotenv/config";
import { network } from "hardhat";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Command-line alternative to the frontend's admin panel, for whoever prefers a
// terminal: reads GROOM_ADDRESS/BRIDE_ADDRESS from contracts/.env (if present) and
// the deployed address from deployments/<network>.json, then calls setGroom/setBride.
// Optional — the browser panel does the same thing with no setup at all.

const here = dirname(fileURLToPath(import.meta.url));

const groom = process.env.GROOM_ADDRESS;
const bride = process.env.BRIDE_ADDRESS;

if (!groom && !bride) {
  throw new Error(
    "Set GROOM_ADDRESS and/or BRIDE_ADDRESS in contracts/.env before running this script.",
  );
}

const { ethers, networkName } = await network.connect();

const deploymentPath = resolve(here, `../deployments/${networkName}.json`);
let address;
try {
  ({ address } = JSON.parse(readFileSync(deploymentPath, "utf8")));
} catch {
  throw new Error(
    `No deployment record found at ${deploymentPath} — run scripts/deploy.js first.`,
  );
}

const [deployer] = await ethers.getSigners();
const contract = await ethers.getContractAt("WeddingGift", address, deployer);

if (groom) {
  if (!ethers.isAddress(groom)) throw new Error(`Invalid GROOM_ADDRESS: ${groom}`);
  const current = await contract.groom();
  if (current !== ethers.ZeroAddress) {
    console.log(`Groom already set to ${current}, skipping.`);
  } else {
    const tx = await contract.setGroom(groom);
    await tx.wait();
    console.log(`✅ Groom set to ${groom}`);
  }
}

if (bride) {
  if (!ethers.isAddress(bride)) throw new Error(`Invalid BRIDE_ADDRESS: ${bride}`);
  const current = await contract.bride();
  if (current !== ethers.ZeroAddress) {
    console.log(`Bride already set to ${current}, skipping.`);
  } else {
    const tx = await contract.setBride(bride);
    await tx.wait();
    console.log(`✅ Bride set to ${bride}`);
  }
}
