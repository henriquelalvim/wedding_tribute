import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { chain, hasPrivy } from "../config.js";
import { friendlyError } from "../lib/format.js";

const injected = () => (typeof window === "undefined" ? undefined : window.ethereum);

const PREFERRED_SOURCE_KEY = "wedding:preferredWalletSource";

function readPreferredSource() {
  try {
    return localStorage.getItem(PREFERRED_SOURCE_KEY);
  } catch {
    return null;
  }
}

function writePreferredSource(source) {
  try {
    if (source) localStorage.setItem(PREFERRED_SOURCE_KEY, source);
    else localStorage.removeItem(PREFERRED_SOURCE_KEY);
  } catch {
    // Private browsing or storage disabled — the session just won't survive a reload.
  }
}

/** The MetaMask/injected-wallet path — today's exact logic, unchanged. */
function useInjectedWallet() {
  const [account, setAccount] = useState(null);
  const [walletChainId, setWalletChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const hasWallet = useMemo(() => Boolean(injected()), []);

  useEffect(() => {
    const provider = injected();
    if (!provider) return undefined;

    let cancelled = false;

    // eth_accounts never prompts: it only reports an authorisation already given.
    Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" }),
    ])
      .then(([accounts, chainIdHex]) => {
        if (cancelled) return;
        setAccount(accounts?.[0] ?? null);
        setWalletChainId(Number(chainIdHex));
      })
      .catch(() => {});

    const onAccountsChanged = (accounts) => setAccount(accounts?.[0] ?? null);
    const onChainChanged = (chainIdHex) => setWalletChainId(Number(chainIdHex));

    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);

    return () => {
      cancelled = true;
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = injected();
    if (!provider) {
      setError("Nenhuma carteira encontrada neste navegador.");
      return;
    }
    setIsConnecting(true);
    setError("");
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      setAccount(accounts?.[0] ?? null);
      setWalletChainId(Number(chainIdHex));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const provider = injected();
    if (!provider) return;
    setError("");
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chain.hexId }],
      });
    } catch (err) {
      // 4902 means the wallet has never heard of this chain; offer to add it.
      const code = err?.code ?? err?.data?.originalError?.code;
      if (code !== 4902) {
        setError(friendlyError(err));
        return;
      }
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chain.hexId,
              chainName: chain.name,
              nativeCurrency: chain.currency,
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: chain.explorer ? [chain.explorer] : [],
            },
          ],
        });
      } catch (addErr) {
        setError(friendlyError(addErr));
      }
    }
  }, []);

  const getSigner = useCallback(async () => {
    const provider = injected();
    if (!provider) throw new Error("Nenhuma carteira encontrada neste navegador.");
    return new BrowserProvider(provider).getSigner();
  }, []);

  // There is no standard EIP-1193 "disconnect" — the wallet, not the site, owns that
  // permission. wallet_revokePermissions (MetaMask 11+) does it for real when the
  // wallet supports it; everywhere else this just forgets the account on our side,
  // which is what every dApp's "disconnect" button actually does.
  const disconnect = useCallback(async () => {
    const provider = injected();
    try {
      await provider?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Not supported by this wallet — fall through to the local forget below.
    }
    setAccount(null);
  }, []);

  return {
    hasWallet,
    account,
    walletChainId,
    isOnExpectedChain: walletChainId === chain.id,
    isConnected: Boolean(account),
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    getSigner,
  };
}

/**
 * The Privy (Google/e-mail) path — an embedded wallet, created on first login, with
 * gas for tributes paid by a sponsor rather than the guest. Only called when
 * `hasPrivy` is true, which is the exact same constant that decides whether
 * <PrivyProvider>/<SmartWalletsProvider> are mounted in main.jsx — so its hooks
 * always have the context they need.
 */
function usePrivyWallet() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { client: smartWalletClient } = useSmartWallets();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  // Only "google"/"email" login methods are enabled (see main.jsx), so there is never
  // an externally-connected wallet to confuse with the embedded one — wallets[0] is
  // always the auto-created embedded wallet once authenticated.
  const wallet = wallets[0];
  const account = authenticated ? (wallet?.address ?? null) : null;

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError("");
    try {
      await login();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setIsConnecting(false);
    }
  }, [login]);

  const disconnect = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Best effort — nothing else to fall back to on this path.
    }
  }, [logout]);

  const getSigner = useCallback(async () => {
    if (!wallet) throw new Error("Nenhuma carteira encontrada.");
    const provider = await wallet.getEthereumProvider();
    return new BrowserProvider(provider).getSigner();
  }, [wallet]);

  return {
    hasWallet: ready,
    account,
    walletChainId: chain.id,
    // An embedded wallet with only google/email login has no user-controlled network
    // switcher — it just signs for whatever chain the app asks it to.
    isOnExpectedChain: true,
    isConnected: Boolean(account),
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork: async () => {},
    getSigner,
    smartWallet: {
      isAvailable: Boolean(smartWalletClient) && Boolean(account),
      async sendSponsored(to, data) {
        return smartWalletClient.sendTransaction({ to, data, value: 0n });
      },
    },
  };
}

const NO_SMART_WALLET = { isAvailable: false, async sendSponsored() {
  throw new Error("Carteira inteligente indisponível.");
} };

/**
 * Wallet connection, current account and network switching — MetaMask or, where
 * configured, Google/e-mail via Privy. The returned shape never changes based on
 * which source is active: everything downstream (useWedding, SignatureBlock,
 * DocumentHeader, TributeForm) reads it the same way either way.
 */
export function useWallet() {
  const injectedWallet = useInjectedWallet();
  // `hasPrivy` is frozen at build time (see config.js) — this hook always runs the
  // exact same number of times across the whole life of a given deployed bundle.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const privyWallet = hasPrivy ? usePrivyWallet() : null;

  const [preferredSource, setPreferredSource] = useState(readPreferredSource);

  // Auto-detect which source is actually authorized, in case the stored preference
  // is stale (e.g. the injected wallet was disconnected from outside the page).
  useEffect(() => {
    if (preferredSource === "privy" && !privyWallet?.isConnected) {
      if (injectedWallet.isConnected) setPreferredSource("injected");
    } else if (preferredSource === "injected" && !injectedWallet.isConnected) {
      if (privyWallet?.isConnected) setPreferredSource("privy");
    } else if (!preferredSource) {
      if (privyWallet?.isConnected) setPreferredSource("privy");
      else if (injectedWallet.isConnected) setPreferredSource("injected");
    }
  }, [preferredSource, injectedWallet.isConnected, privyWallet?.isConnected]);

  const active = preferredSource === "privy" ? privyWallet : injectedWallet;

  const connect = useCallback(async () => {
    await injectedWallet.connect();
    setPreferredSource("injected");
    writePreferredSource("injected");
  }, [injectedWallet]);

  const connectWithGoogle = useCallback(async () => {
    if (!privyWallet) return;
    await privyWallet.connect();
    setPreferredSource("privy");
    writePreferredSource("privy");
  }, [privyWallet]);

  const disconnect = useCallback(async () => {
    await active?.disconnect();
    setPreferredSource(null);
    writePreferredSource(null);
  }, [active]);

  return {
    hasWallet: injectedWallet.hasWallet,
    hasPrivy,
    account: active?.account ?? null,
    walletChainId: active?.walletChainId ?? null,
    isOnExpectedChain: active?.isOnExpectedChain ?? false,
    isConnected: Boolean(active?.isConnected),
    isConnecting: Boolean(active?.isConnecting),
    error: active?.error ?? "",
    connect,
    connectWithGoogle,
    disconnect,
    switchNetwork: active?.switchNetwork ?? injectedWallet.switchNetwork,
    getSigner: active?.getSigner ?? injectedWallet.getSigner,
    smartWallet: preferredSource === "privy" ? (privyWallet?.smartWallet ?? NO_SMART_WALLET) : NO_SMART_WALLET,
  };
}
