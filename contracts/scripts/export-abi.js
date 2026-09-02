// Copies the compiled ABI into the frontend so the dApp and the contract can never
// drift apart. Run automatically at the end of scripts/deploy.js, or on its own with
// `npm run export-abi`.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ARTIFACT = resolve(here, "../artifacts/contracts/WeddingGift.sol/WeddingGift.json");
const TARGET = resolve(here, "../../frontend/src/abi/WeddingGift.json");

export function exportAbi() {
  const artifact = JSON.parse(readFileSync(ARTIFACT, "utf8"));
  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, `${JSON.stringify(artifact.abi, null, 2)}\n`);
  return TARGET;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`ABI exported to ${exportAbi()}`);
}
