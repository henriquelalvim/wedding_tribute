import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import { chain } from "../config.js";
import { friendlyError } from "../lib/format.js";

const injected = () => (typeof window === "undefined" ? undefined : window.ethereum);

/**
 * Wallet connection, current account and network switching.
 *
 * Reading the ceremony never goes through here — the page works with no wallet at
 * all. This hook only exists for the four transactions someone may want to sign.
 */
export function useWallet() {
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

  return {
    hasWallet,
    account,
    walletChainId,
    isOnExpectedChain: walletChainId === chain.id,
    isConnected: Boolean(account),
    isConnecting,
    error,
    connect,
    switchNetwork,
    getSigner,
  };
}
