import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Contract, JsonRpcProvider, parseEther } from "ethers";
import abi from "../abi/WeddingGift.json";
import {
  chain,
  contractAddress,
  isConfigured,
  POLL_INTERVAL_MS,
  STATUS,
} from "../config.js";
import { friendlyError, sameAddress } from "../lib/format.js";

// A single read-only provider, shared by every render. staticNetwork stops ethers
// from re-checking the chain id before each call, which halves the requests we send
// to the public RPC.
const readProvider = isConfigured
  ? new JsonRpcProvider(chain.rpcUrl, chain.id, { staticNetwork: true })
  : null;
const readContract = readProvider
  ? new Contract(contractAddress, abi, readProvider)
  : null;

const IDLE_TX = { state: "idle", action: null, hash: null, message: "" };

function toCeremony(summary) {
  return {
    status: Number(summary.status),
    balance: summary.balance,
    marriedAt: summary.marriedAt,
    groom: summary.groom,
    bride: summary.bride,
    deployer: summary.deployer,
    groomVow: summary.groomVow,
    brideVow: summary.brideVow,
    dedication: summary.dedication,
  };
}

/**
 * The ceremony state, polled from the public RPC, plus the four transactions.
 *
 * Reads never touch the wallet, so a guest with no MetaMask still sees the photo,
 * the status and the running total.
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
      totalAmount: summary.balance,
      timestamp: summary.marriedAt,
      groomVow: summary.groomVow,
      brideVow: summary.brideVow,
      dedication: summary.dedication,
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
    if (sameAddress(wallet.account, ceremony.groom)) return "groom";
    if (sameAddress(wallet.account, ceremony.bride)) return "bride";
    // The deployer signs no vows and can't propose, accept or withdraw — but their
    // deposit message becomes the dedication, same as the couple's, so the UI still
    // needs to tell them apart from an ordinary guest.
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

  const propose = useCallback(
    (vow) => send("propose", (contract) => contract.propose(vow)),
    [send],
  );

  const accept = useCallback(
    async (vow) => {
      const receipt = await send("accept", (contract) => contract.accept(vow));
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
          totalAmount: event.args.totalAmount,
          timestamp: event.args.timestamp,
          groomVow: event.args.groomVow,
          brideVow: event.args.brideVow,
          dedication: event.args.dedication,
        });
      }
      return receipt;
    },
    [send],
  );

  const depositGift = useCallback(
    (amountEth, message) =>
      send("deposit", (contract) =>
        contract.depositGift(message, { value: parseEther(amountEth) }),
      ),
    [send],
  );

  const withdraw = useCallback(
    () => send("withdraw", (contract) => contract.withdrawGift()),
    [send],
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
    depositGift,
    withdraw,
    celebration,
    openCelebration,
    dismissCelebration: () => setCelebration(null),
  };
}
