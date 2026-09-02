import AddressLink from "./AddressLink.jsx";
import { formatDateTime } from "../lib/format.js";

export default function TributeWall({ tributes, isLoading, error, explorer }) {
  return (
    <section
      className="mt-10 border-t pt-8"
      style={{ borderColor: "var(--color-rule)" }}
      aria-labelledby="wall-heading"
    >
      <h2 id="wall-heading" className="label">
        Mural de homenagens
      </h2>

      {tributes.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          {isLoading
            ? "Carregando…"
            : error
              ? "Não foi possível carregar as homenagens no momento."
              : "Ainda não há nenhuma homenagem — seja a primeira pessoa a deixar uma."}
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {tributes.map((tribute, index) => (
            <li
              key={`${tribute.author}-${tribute.timestamp}-${index}`}
              className="sheet px-5 py-5"
            >
              <p className="font-display text-lg leading-snug">“{tribute.message}”</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="data text-xs">{tribute.name || "Anônimo"}</span>
                <span className="text-xs text-ink-soft">{formatDateTime(tribute.timestamp)}</span>
              </div>
              <AddressLink
                address={tribute.author}
                explorer={explorer}
                className="mt-1 block text-[0.6875rem] text-ink-soft"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
