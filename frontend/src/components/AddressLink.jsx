import { explorerAddressUrl, shortAddress } from "../lib/format.js";

/** An address, linked to the explorer when the chain has one. */
export default function AddressLink({ address, explorer, className = "" }) {
  const href = explorerAddressUrl(explorer, address);
  const text = shortAddress(address) || "—";

  if (!href) {
    return <span className={`data ${className}`}>{text}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={address}
      className={`data underline decoration-rule underline-offset-4 transition-colors hover:decoration-ink ${className}`}
    >
      {text}
    </a>
  );
}
