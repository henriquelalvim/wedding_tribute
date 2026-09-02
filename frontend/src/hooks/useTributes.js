import { useCallback, useEffect, useState } from "react";
import { TRIBUTES_POLL_INTERVAL_MS } from "../config.js";
import { friendlyError } from "../lib/format.js";
import { readContract } from "../lib/readContract.js";

/**
 * The public tribute wall, polled from the same read-only contract useWedding uses.
 * Kept on its own interval/hook: the list only grows, so it doesn't need to share a
 * poll cadence with the ceremony status.
 */
export function useTributes() {
  const [tributes, setTributes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!readContract) {
      setIsLoading(false);
      return;
    }
    try {
      const raw = await readContract.getTributes();
      setTributes(
        raw.map((t) => ({
          author: t.author,
          name: t.name,
          message: t.message,
          timestamp: t.timestamp,
        })),
      );
      setError("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };
    tick();
    const id = setInterval(tick, TRIBUTES_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh]);

  return { tributes, isLoading, error, refresh };
}
