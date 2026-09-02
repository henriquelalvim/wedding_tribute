import { MAX_MESSAGE_BYTES } from "../config.js";
import { byteLength } from "../lib/format.js";

/** A textarea with the same byte budget the contract enforces. */
export default function VowField({ id, label, placeholder, value, onChange, disabled }) {
  const used = byteLength(value);
  const over = used > MAX_MESSAGE_BYTES;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <span
          className="data text-[0.6875rem]"
          style={{ color: over ? "var(--color-seal)" : "var(--color-ink-soft)" }}
        >
          {used}/{MAX_MESSAGE_BYTES}
        </span>
      </div>
      <textarea
        id={id}
        rows={3}
        className="field mt-2 resize-y"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
