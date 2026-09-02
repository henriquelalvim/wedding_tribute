import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Contract, Interface } from "ethers";
import abi from "../abi/WeddingGift.json";
import { contractAddress, POLL_INTERVAL_MS, STATUS } from "../config.js";
import { friendlyError, sameAddress } from "../lib/format.js";
import { readContract, readProvider } from "../lib/readContract.js";

const IDLE_TX = { state: "idle", action: null, hash: null, message: "" };

function toCeremony(summary) {
  return {
    status: Number(summary.status),
    marriedAt: summary.marriedAt,
    groom: summary.groom,
    bride: summary.bride,
    deployer: summary.deployer,
    groomName: summary.groomName,
    brideName: summary.brideName,
    groomVow: summary.groomVow,
    brideVow: summary.brideVow,
  };
}

/**
 * The ceremony state, polled from the public RPC, plus its transactions: propose,
 * accept, setGroom/setBride (the deployer's one-shot admin actions) and sendTribute.
 *
 * Reads never touch the wallet, so a guest with no wallet at all still sees the
 * photo, the status and the vows.
 */
export function useWedding(wallet) {
  const [ceremony, setCeremony] = useState(null);
  const [readError, setReadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tx, setTx] = useState(IDLE_TX);
  const [celebration, setCelebration] = useState(null);

  // Remembers the status seen on the previous poll, so confetti fires on the
  // transition rather than on every page load of an already-married contract.
  const previousStatus = useRef(null);
  const celebratedOnce = useRef(false);

  const refresh = useCallback(async () => {
    if (!readContract) {
      setIsLoading(false);
      return null;
    }
    try {
      const summary = toCeremony(await readContract.summary());
      setCeremony(summary);
      setReadError("");
      return summary;
    } catch (err) {
      setReadError(friendlyError(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Best effort: recover the hash of the accept transaction for viewers who were
  // not the ones who signed it. A single bounded getLogs call, never retried.
  const findCelebrationHash = useCallback(async () => {
    if (!readContract || !readProvider) return null;
    try {
      const latest = await readProvider.getBlockNumber();
      const events = await readContract.queryFilter(
        readContract.filters.MarriageCelebrated(),
        Math.max(0, latest - 9000),
        latest,
      );
      return events.at(-1)?.transactionHash ?? null;
    } catch {
      return null;
    }
  }, []);

  const celebrateFrom = useCallback((summary, hash) => {
    celebratedOnce.current = true;
    setCelebration({
      hash: hash ?? null,
      timestamp: summary.marriedAt,
      groomName: summary.groomName,
      brideName: summary.brideName,
      groomVow: summary.groomVow,
      brideVow: summary.brideVow,
    });
  }, []);

  // Poll the public RPC and watch for the moment she says yes.
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const summary = await refresh();
      if (cancelled || !summary) return;

      const before = previousStatus.current;
      previousStatus.current = summary.status;

      const justMarried =
        before !== null && before < STATUS.MARRIED && summary.status === STATUS.MARRIED;

      if (justMarried && !celebratedOnce.current) {
        celebrateFrom(summary, await findCelebrationHash());
      }
    };

    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh, findCelebrationHash, celebrateFrom]);

  const role = useMemo(() => {
    if (!wallet.account || !ceremony) return "guest";
    // Comparing the connected wallet against a still-unset groom/bride (address(0))
    // never matches a real wallet, so everyone correctly falls through to "guest"
    // until the deployer actually assigns each address.
    if (sameAddress(wallet.account, ceremony.groom)) return "groom";
    if (sameAddress(wallet.account, ceremony.bride)) return "bride";
    // The deployer signs no vows and can't propose or accept, but they're the one
    // who assigns groom/bride and may hide an abusive tribute — the UI needs to tell
    // them apart from an ordinary guest.
    if (sameAddress(wallet.account, ceremony.deployer)) return "deployer";
    return "guest";
  }, [wallet.account, ceremony]);

  const send = useCallback(
    async (action, call) => {
      setTx({ state: "pending", action, hash: null, message: "" });
      try {
        const signer = await wallet.getSigner();
        const writeContract = new Contract(contractAddress, abi, signer);
        const sent = await call(writeContract);
        setTx({ state: "pending", action, hash: sent.hash, message: "" });

        const receipt = await sent.wait();
        setTx({ state: "confirmed", action, hash: sent.hash, message: "" });
        await refresh();
        return receipt;
      } catch (err) {
        setTx({ state: "error", action, hash: null, message: friendlyError(err) });
        return null;
      }
    },
    [wallet, refresh],
  );

  // The sponsored path: a smart-wallet transaction has no signer/`.wait()` the way an
  // ordinary ethers transaction does — Privy's client resolves once the transaction
  // has actually landed, straight to a hash.
  const sendSponsored = useCallback(
    async (action, data) => {
      setTx({ state: "pending", action, hash: null, message: "" });
      try {
        const hash = await wallet.smartWallet.sendSponsored(contractAddress, data);
        setTx({ state: "confirmed", action, hash, message: "" });
        await refresh();
        return { hash };
      } catch (err) {
        setTx({ state: "error", action, hash: null, message: friendlyError(err) });
        return null;
      }
    },
    [wallet, refresh],
  );

  const propose = useCallback(
    (name, vow) => send("propose", (contract) => contract.propose(name, vow)),
    [send],
  );

  const accept = useCallback(
    async (name, vow) => {
      const receipt = await send("accept", (contract) => contract.accept(name, vow));
      if (!receipt) return null;

      // The event is read straight off the receipt: guaranteed to be there, and it
      // does not depend on a log subscription the public RPC may throttle.
      const iface = new Contract(contractAddress, abi).interface;
      const event = receipt.logs
        .map((log) => {
          try {
            return iface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "MarriageCelebrated");

      if (event) {
        celebratedOnce.current = true;
        previousStatus.current = STATUS.MARRIED;
        setCelebration({
          hash: receipt.hash,
          timestamp: event.args.timestamp,
          groomName: event.args.groomName,
          brideName: event.args.brideName,
          groomVow: event.args.groomVow,
          brideVow: event.args.brideVow,
        });
      }
      return receipt;
    },
    [send],
  );

  const setGroom = useCallback(
    (address) => send("setGroom", (contract) => contract.setGroom(address)),
    [send],
  );

  const setBride = useCallback(
    (address) => send("setBride", (contract) => contract.setBride(address)),
    [send],
  );

  const sendTribute = useCallback(
    (name, message) => {
      if (wallet.smartWallet?.isAvailable) {
        const data = new Interface(abi).encodeFunctionData("sendTribute", [name, message]);
        return sendSponsored("tribute", data);
      }
      return send("tribute", (contract) => contract.sendTribute(name, message));
    },
    [wallet, send, sendSponsored],
  );

  const openCelebration = useCallback(() => {
    if (!ceremony || ceremony.status !== STATUS.MARRIED) return;
    celebrateFrom(ceremony, celebration?.hash ?? null);
  }, [ceremony, celebration, celebrateFrom]);

  return {
    ceremony,
    isLoading,
    readError,
    role,
    tx,
    resetTx: () => setTx(IDLE_TX),
    refresh,
    propose,
    accept,
    setGroom,
    setBride,
    sendTribute,
    celebration,
    openCelebration,
    dismissCelebration: () => setCelebration(null),
  };
}
