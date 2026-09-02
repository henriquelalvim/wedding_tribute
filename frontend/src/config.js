// Network and contract configuration, resolved once from the build-time env.
//
// Everything in import.meta.env.VITE_* is baked into the published bundle and is
// therefore public. Only ever put public data here: a contract address, a chain id
// and an RPC URL. Private keys belong in contracts/.env, which is gitignored.

const CHAINS = {
  8453: {
    id: 8453,
    hexId: "0x2105",
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    explorerName: "Basescan",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    testnet: false,
  },
  84532: {
    id: 84532,
    hexId: "0x14a34",
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    explorerName: "Basescan",
    currency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    testnet: true,
  },
  31337: {
    id: 31337,
    hexId: "0x7a69",
    name: "Hardhat local",
    rpcUrl: "http://127.0.0.1:8545",
    explorer: "",
    explorerName: "",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    testnet: true,
  },
};

const envChainId = Number(import.meta.env.VITE_CHAIN_ID ?? 84532);
const base = CHAINS[envChainId] ?? CHAINS[84532];

/** The single chain this deployment talks to. */
export const chain = {
  ...base,
  rpcUrl: import.meta.env.VITE_RPC_URL || base.rpcUrl,
};

export const contractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || "").trim();

/** False when .env has not been filled in yet — the UI says so instead of failing silently. */
export const isConfigured =
  /^0x[0-9a-fA-F]{40}$/.test(contractAddress) && Boolean(CHAINS[envChainId]);

export const configError = !contractAddress
  ? "VITE_CONTRACT_ADDRESS não foi definido."
  : !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)
    ? "VITE_CONTRACT_ADDRESS não é um endereço válido."
    : !CHAINS[envChainId]
      ? `VITE_CHAIN_ID=${envChainId} não é uma rede conhecida (use 8453, 84532 ou 31337).`
      : "";

/** How often the public RPC is polled for the ceremony state, in milliseconds. */
export const POLL_INTERVAL_MS = 10_000;

/** How often the public RPC is polled for the tribute list, in milliseconds. Kept
 * separate from POLL_INTERVAL_MS: the list only grows, so it doesn't need the same
 * cadence as the ceremony status. */
export const TRIBUTES_POLL_INTERVAL_MS = 20_000;

/** Mirrors WeddingGift.MAX_MESSAGE_LENGTH. */
export const MAX_MESSAGE_BYTES = 280;

/** Mirrors WeddingGift.MAX_NAME_LENGTH. */
export const MAX_NAME_BYTES = 64;

export const STATUS = { PENDING: 0, PROPOSED: 1, MARRIED: 2 };

/** Social login (Google/e-mail) via Privy, as an alternative to MetaMask. Blank until
 * a real app id is filled in — the "Entrar com Google" button stays hidden until then. */
export const privyAppId = (import.meta.env.VITE_PRIVY_APP_ID || "").trim();
export const hasPrivy = privyAppId.length > 0;

/** A minimal viem-shaped Chain descriptor for PrivyProvider, built from `chain` above
 * instead of importing a fixed constant from viem/chains — this way it automatically
 * matches whichever network VITE_CHAIN_ID/VITE_RPC_URL actually point at. */
export const privyChain = {
  id: chain.id,
  name: chain.name,
  nativeCurrency: chain.currency,
  rpcUrls: { default: { http: [chain.rpcUrl] } },
};
