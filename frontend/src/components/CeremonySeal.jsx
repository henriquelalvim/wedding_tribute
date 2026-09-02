/**
 * The registry seal. Blind-embossed while the marriage is still unrecorded, struck
 * in oxblood the moment the bride accepts. This is the one element the page is
 * meant to be remembered by, so nothing else on the sheet competes with it.
 */
export default function CeremonySeal({ struck, monogram, chainName }) {
  const ink = struck ? "var(--color-seal)" : "var(--color-rule)";

  return (
    <svg
      viewBox="0 0 200 200"
      className={`h-32 w-32 sm:h-36 sm:w-36 ${struck ? "animate-seal-strike" : ""}`}
      style={{ transform: struck ? "rotate(-6deg)" : "none" }}
      role="img"
      aria-label={struck ? "Selo de casamento registrado" : "Selo ainda não registrado"}
    >
      <defs>
        <path id="seal-arc" d="M 100,100 m -74,0 a 74,74 0 1,1 148,0" fill="none" />
      </defs>

      <circle cx="100" cy="100" r="92" fill="none" stroke={ink} strokeWidth="1.5" />
      <circle
        cx="100"
        cy="100"
        r="85"
        fill="none"
        stroke={ink}
        strokeWidth="4"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="62" fill="none" stroke={ink} strokeWidth="1" />

      <text
        fill={ink}
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.22em",
        }}
      >
        <textPath href="#seal-arc" startOffset="50%" textAnchor="middle">
          CASAMENTO REGISTRADO
        </textPath>
      </text>

      <text
        x="100"
        y="103"
        textAnchor="middle"
        fill={struck ? "var(--color-seal)" : "var(--color-rule)"}
        style={{ fontFamily: "var(--font-display)", fontSize: "34px" }}
      >
        {monogram}
      </text>

      <line x1="72" y1="118" x2="128" y2="118" stroke={ink} strokeWidth="1" />
      <text
        x="100"
        y="136"
        textAnchor="middle"
        fill={ink}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.1em",
        }}
      >
        {chainName}
      </text>
      <path d="M100 148 l4 5 -4 5 -4 -5 z" fill={ink} />
    </svg>
  );
}
