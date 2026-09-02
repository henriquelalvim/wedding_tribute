import { useWallet } from "../hooks/useWallet.js";
import content from "../content.js";
import CopyButton from "./CopyButton.jsx";

/**
 * The standalone "?login=1" view: no ceremony, no tribute wall, no narrative — just a
 * way for the groom/bride to log in and read off their own address, so they can send
 * it back to the deployer without touching the discreet admin panel themselves.
 */
export default function AddressReveal() {
  const wallet = useWallet();
  const copy = content.addressReveal;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="label">{copy.eyebrow}</p>
      <h1 className="font-display mt-3 text-3xl">{copy.title}</h1>
      <p className="mt-4 leading-relaxed text-ink-soft">{copy.intro}</p>

      <div className="sheet mt-8 p-6">
        {wallet.isConnected ? (
          <>
            <p className="label">{copy.addressLabel}</p>
            <p className="data mt-2 text-base break-all">{wallet.account}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CopyButton value={wallet.account} className="btn btn-primary" />
              <button type="button" className="btn btn-quiet" onClick={wallet.disconnect}>
                Sair
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {wallet.hasPrivy ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={wallet.connectWithGoogle}
                disabled={wallet.isConnecting}
              >
                {wallet.isConnecting ? "Entrando…" : "Entrar com Google"}
              </button>
            ) : null}
            {wallet.hasWallet ? (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={wallet.connect}
                disabled={wallet.isConnecting}
              >
                Conectar carteira
              </button>
            ) : null}
            {!wallet.hasPrivy && !wallet.hasWallet ? (
              <p className="text-sm text-ink-soft">{copy.noOptions}</p>
            ) : null}
          </div>
        )}

        {wallet.error ? (
          <p className="mt-4 text-sm" style={{ color: "var(--color-seal)" }}>
            {wallet.error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
