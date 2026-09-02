import { MAX_NAME_BYTES } from "../config.js";
import { byteLength } from "../lib/format.js";

/** A single-line input with the same byte budget the contract enforces on a name. */
export default function NameField({ id, label, placeholder, value, onChange, disabled }) {
  const used = byteLength(value);
  const over = used > MAX_NAME_BYTES;

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
          {used}/{MAX_NAME_BYTES}
        </span>
      </div>
      <input
        id={id}
        className="field mt-2"
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
