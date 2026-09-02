import { STATUS } from "../config.js";
import { formatDateTime, formatEth } from "../lib/format.js";
import CeremonySeal from "./CeremonySeal.jsx";

const STAGES = [
  { at: STATUS.PENDING, label: "Pedido" },
  { at: STATUS.PROPOSED, label: "Resposta" },
  { at: STATUS.MARRIED, label: "Registro" },
];

const HEADLINE = {
  [STATUS.PENDING]: "Aguardando o pedido",
  [STATUS.PROPOSED]: "Aguardando a resposta",
  [STATUS.MARRIED]: "Casados",
};

export default function StatusPanel({
  ceremony,
  chain,
  monogram,
  isLoading,
  readError,
  onOpenCelebration,
}) {
  // Never invent a status. Until the contract answers, say so — a fabricated
  // "waiting for the proposal" would read as fact to a guest.
  if (!ceremony) {
    return (
      <section className="sheet mt-10 px-5 py-10 text-center sm:px-8">
        <p className="label">{readError ? "Registro indisponível" : "Lendo o registro"}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {readError
            ? `Não foi possível ler o contrato em ${chain.name}. A página tenta de novo sozinha.`
            : "Consultando a rede…"}
        </p>
      </section>
    );
  }

  const status = ceremony.status;
  const married = status === STATUS.MARRIED;

  return (
    <section className="sheet mt-10 px-5 py-8 sm:px-8" aria-labelledby="status-heading">
      <div className="flex flex-col items-center gap-6">
        <CeremonySeal struck={married} monogram={monogram} chainName={chain.name} />

        <div className="text-center">
          <h2
            id="status-heading"
            className="font-display text-2xl sm:text-3xl"
            style={{ color: married ? "var(--color-seal)" : "var(--color-ink)" }}
          >
            {HEADLINE[status]}
          </h2>
          {married && ceremony.marriedAt ? (
            <p className="data mt-2 text-xs text-ink-soft">
              {formatDateTime(ceremony.marriedAt)}
            </p>
          ) : null}
        </div>

        {married && onOpenCelebration ? (
          <button type="button" className="btn btn-quiet" onClick={onOpenCelebration}>
            Rever a celebração
          </button>
        ) : null}
      </div>

      {/* Three stages, because a wedding genuinely is a sequence: he asks, she
          answers, the chain records it. */}
      <ol className="mt-8 flex items-start">
        {STAGES.map((stage, index) => {
          const reached = status >= stage.at;
          const current = status === stage.at && !married;
          return (
            <li key={stage.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                <span
                  className={`h-px flex-1 ${index === 0 ? "opacity-0" : ""}`}
                  style={{ backgroundColor: "var(--color-rule)" }}
                />
                <span
                  aria-hidden="true"
                  className="mx-2 block h-2.5 w-2.5 rotate-45 border"
                  style={{
                    borderColor: reached ? "var(--color-seal)" : "var(--color-rule)",
                    backgroundColor: reached ? "var(--color-seal)" : "transparent",
                  }}
                />
                <span
                  className={`h-px flex-1 ${index === STAGES.length - 1 ? "opacity-0" : ""}`}
                  style={{ backgroundColor: "var(--color-rule)" }}
                />
              </div>
              <span
                className="label text-center"
                style={{
                  color: current
                    ? "var(--color-ink)"
                    : reached
                      ? "var(--color-seal)"
                      : "var(--color-ink-soft)",
                }}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div
        className="mt-8 flex items-baseline justify-between gap-4 border-t pt-5"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <span className="label">Presentes reunidos</span>
        <span className="data text-xl sm:text-2xl">
          {formatEth(ceremony.balance)}{" "}
          <span className="text-sm text-ink-soft">{chain.currency.symbol}</span>
        </span>
      </div>
    </section>
  );
}
