import { Contract, JsonRpcProvider } from "ethers";
import abi from "../abi/WeddingGift.json";
import { chain, contractAddress, isConfigured } from "../config.js";

// A single read-only provider, shared by every hook that needs one. staticNetwork
// stops ethers from re-checking the chain id before each call, which halves the
// requests sent to the public RPC. Reads never touch the wallet, so a guest with no
// wallet at all still sees the photo, the status and the tribute wall.
export const readProvider = isConfigured
  ? new JsonRpcProvider(chain.rpcUrl, chain.id, { staticNetwork: true })
  : null;

export const readContract = readProvider ? new Contract(contractAddress, abi, readProvider) : null;
