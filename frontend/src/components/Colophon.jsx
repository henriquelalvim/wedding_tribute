import AddressLink from "./AddressLink.jsx";

export default function Colophon({ chain, contractAddress, readError }) {
  return (
    <footer
      className="mt-12 border-t pt-6 pb-10"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label">Contrato</dt>
          <dd>
            <AddressLink address={contractAddress} explorer={chain.explorer} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label">Rede</dt>
          <dd className="data">
            {chain.name} · {chain.id}
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-xs leading-relaxed text-ink-soft">
        Esta página lê o contrato direto da rede, sem servidor no meio. Qualquer pessoa
        pode conferir os mesmos dados no explorador.
      </p>

      {readError ? (
        <p className="mt-3 text-xs" style={{ color: "var(--color-seal)" }}>
          Falha ao ler a rede: {readError}
        </p>
      ) : null}
    </footer>
  );
}
