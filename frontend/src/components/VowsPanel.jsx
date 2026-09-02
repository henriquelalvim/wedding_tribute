import { STATUS } from "../config.js";

function Clause({ who, text, fallback }) {
  return (
    <div>
      <p className="label">{who}</p>
      <blockquote className="font-display mt-2 text-lg leading-snug sm:text-xl">
        {text ? `“${text}”` : <span className="text-ink-soft">{fallback}</span>}
      </blockquote>
    </div>
  );
}

export default function VowsPanel({ ceremony, couple, emptyVow }) {
  if (!ceremony || ceremony.status === STATUS.PENDING) return null;

  const married = ceremony.status === STATUS.MARRIED;

  return (
    <section
      className="mt-10 border-t pt-8"
      style={{ borderColor: "var(--color-rule)" }}
      aria-labelledby="vows-heading"
    >
      <h2 id="vows-heading" className="label">
        Registrado em contrato
      </h2>

      <div className="mt-6 space-y-7">
        <Clause who={couple.groomName} text={ceremony.groomVow} fallback={emptyVow} />
        {married ? (
          <Clause who={couple.brideName} text={ceremony.brideVow} fallback={emptyVow} />
        ) : null}
      </div>
    </section>
  );
}
