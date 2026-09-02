import { useState } from "react";

const FEEDBACK_MS = 1500;

/**
 * A small button that copies `value` to the clipboard and briefly confirms it
 * worked. Falls back to a hidden textarea + execCommand when the async
 * Clipboard API is unavailable (e.g. a non-HTTPS context).
 */
export default function CopyButton({ value, className = "", title = "Copiar endereço" }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement("textarea");
        field.value = value;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        document.body.removeChild(field);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch {
      // Clipboard permission denied or unavailable — the address stays
      // visible and selectable by hand, so this fails silently.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copiado!" : title}
      aria-label={copied ? "Endereço copiado" : title}
      className={className}
    >
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}
