import { explorerTxUrl } from "../lib/format.js";

const LABELS = {
  propose: "Pedido",
  accept: "Resposta",
  setGroom: "Noivo definido",
  setBride: "Noiva definida",
  tribute: "Homenagem",
};

const HEADLINE = {
  pending: "Aguardando confirmação na rede…",
  confirmed: "Confirmado na blockchain.",
  error: "A transação não foi concluída.",
};

export default function TxBanner({ tx, chain, onDismiss }) {
  if (tx.state === "idle") return null;

  // Only linked once the transaction is actually confirmed — a pending hash
  // may still drop or be replaced, so there is nothing worth showing yet.
  const url = tx.state === "confirmed" ? explorerTxUrl(chain.explorer, tx.hash) : "";
  const accent = tx.state === "error" ? "var(--color-seal)" : "var(--color-ink)";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3"
      style={{ borderColor: accent, backgroundColor: "var(--color-paper-raised)" }}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="label" style={{ color: accent }}>
            {LABELS[tx.action] ?? "Transação"}
          </p>
          <p className="mt-0.5 truncate text-sm">{tx.message || HEADLINE[tx.state]}</p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="data mt-1 inline-block text-xs underline underline-offset-4"
            >
              Ver no {chain.explorerName}
            </a>
          ) : null}
        </div>
        {tx.state !== "pending" ? (
          <button
            type="button"
            className="btn btn-quiet min-h-10 shrink-0 px-3 py-1.5 text-sm"
            onClick={onDismiss}
          >
            Fechar
          </button>
        ) : null}
      </div>
    </div>
  );
}
