import CopyButton from "./CopyButton.jsx";
import { shortAddress } from "../lib/format.js";

export default function DocumentHeader({ registryLabel, chain, wallet }) {
  const { hasWallet, hasPrivy, account, isConnected, isConnecting, isOnExpectedChain } = wallet;

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur-sm"
      style={{
        borderColor: "var(--color-rule)",
        backgroundColor: "color-mix(in srgb, var(--color-paper) 88%, transparent)",
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="label truncate">{registryLabel}</p>
          <p className="data mt-0.5 text-xs text-ink-soft">
            {chain.name}
            {chain.testnet ? " · rede de teste" : ""}
          </p>
        </div>

        {isConnected ? (
          <div className="flex shrink-0 items-stretch">
            <span
              className="data flex items-center border border-r-0 px-3 py-2 text-xs"
              style={{ borderColor: "var(--color-rule)" }}
              title={account}
            >
              {shortAddress(account)}
            </span>
            <CopyButton
              value={account}
              className="btn btn-quiet min-h-0 border-r-0 px-3 py-2 text-xs"
            />
            <button
              type="button"
              className="btn btn-quiet min-h-0 px-3 py-2 text-xs"
              onClick={wallet.disconnect}
              title="Desconectar carteira"
            >
              Sair
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            {hasPrivy ? (
              <button
                type="button"
                className="btn btn-quiet min-h-11 px-4 text-sm"
                onClick={wallet.connectWithGoogle}
                disabled={isConnecting}
              >
                {isConnecting ? "Entrando…" : "Entrar com Google"}
              </button>
            ) : null}
            {hasWallet ? (
              <button
                type="button"
                className="btn btn-quiet min-h-11 px-4 text-sm"
                onClick={wallet.connect}
                disabled={isConnecting}
              >
                Conectar carteira
              </button>
            ) : !hasPrivy ? (
              <span className="hidden text-xs text-ink-soft sm:block">Somente leitura</span>
            ) : null}
          </div>
        )}
      </div>

      {isConnected && !isOnExpectedChain ? (
        <div
          className="border-t px-5 py-2.5 sm:px-8"
          style={{
            borderColor: "var(--color-rule)",
            backgroundColor: "color-mix(in srgb, var(--color-seal) 10%, transparent)",
          }}
        >
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Sua carteira está em outra rede.</p>
            <button
              type="button"
              className="btn btn-seal min-h-10 px-3 py-1.5 text-sm"
              onClick={wallet.switchNetwork}
            >
              Trocar para {chain.name}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
