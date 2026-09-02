import { useEffect, useRef } from "react";
import { celebrate } from "../lib/celebrate.js";
import { displayName, explorerTxUrl, formatDateTime } from "../lib/format.js";

export default function CelebrationModal({ celebration, copy, couple, chain, emptyVow, onClose }) {
  const dialogRef = useRef(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    celebrate();

    // Focus the dialog itself, not the close button at the bottom: focusing a
    // control down there scrolls the title out of frame on a phone, and the title
    // is the whole point of this moment.
    dialogRef.current?.focus({ preventScroll: true });
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const txUrl = explorerTxUrl(chain.explorer, celebration.hash);

  return (
    <div
      ref={scrollerRef}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain px-4 py-8"
      style={{ backgroundColor: "rgb(22 35 59 / 0.55)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        tabIndex={-1}
        className="sheet animate-fade-rise mx-auto w-full max-w-lg px-6 py-9 sm:px-9"
        style={{ borderColor: "var(--color-gilt)", borderWidth: "2px" }}
      >
        <p className="label text-center">{copy.eyebrow}</p>
        <h2
          id="celebration-title"
          className="font-display mt-3 text-center text-4xl leading-tight sm:text-5xl"
          style={{ color: "var(--color-seal)" }}
        >
          {copy.title}
        </h2>

        <div
          className="mx-auto mt-6 h-px w-16"
          style={{ backgroundColor: "var(--color-gilt)" }}
        />

        <div className="mt-6 space-y-4 text-[0.9375rem] leading-relaxed">
          {copy.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>

        <div
          className="mt-7 space-y-5 border-t pt-6"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <div>
            <p className="label">{displayName(celebration.groomName, couple.groomName)}</p>
            <p className="font-display mt-1.5 text-lg">
              {celebration.groomVow ? `“${celebration.groomVow}”` : emptyVow}
            </p>
          </div>
          <div>
            <p className="label">{displayName(celebration.brideName, couple.brideName)}</p>
            <p className="font-display mt-1.5 text-lg">
              {celebration.brideVow ? `“${celebration.brideVow}”` : emptyVow}
            </p>
          </div>
        </div>

        <dl
          className="mt-6 border-t pt-6 text-center text-sm"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <dt className="label">Registrado em</dt>
          <dd className="data mt-1.5">{formatDateTime(celebration.timestamp)}</dd>
        </dl>

        <p className="mt-7 text-center text-sm text-ink-soft">{copy.signature}</p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          {txUrl ? (
            <a href={txUrl} target="_blank" rel="noreferrer" className="btn btn-seal flex-1">
              Ver no {chain.explorerName}
            </a>
          ) : null}
          <button type="button" className="btn btn-quiet flex-1" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
