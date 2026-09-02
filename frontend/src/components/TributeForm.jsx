import { useState } from "react";
import { MAX_MESSAGE_BYTES, MAX_NAME_BYTES } from "../config.js";
import { byteLength } from "../lib/format.js";
import NameField from "./NameField.jsx";
import VowField from "./VowField.jsx";

/**
 * Anyone can leave a tribute — that's the whole point, so this form is visible to
 * every visitor, wallet or not. Google/e-mail login (sponsored gas) is the primary
 * path for a guest with no wallet; MetaMask stays available underneath for anyone
 * who prefers it.
 */
export default function TributeForm({ copy, chain, wallet, wedding, onSent }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const busy = wedding.tx.state === "pending";
  const messageTooLong = byteLength(message) > MAX_MESSAGE_BYTES;
  const nameTooLong = byteLength(name) > MAX_NAME_BYTES;
  const canSubmit = message.trim() !== "" && !messageTooLong && !nameTooLong;
  const canSend = wallet.isConnected && wallet.isOnExpectedChain;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSend || !canSubmit) return;
    const receipt = await wedding.sendTribute(name, message);
    if (receipt) {
      setName("");
      setMessage("");
      onSent?.();
    }
  };

  return (
    <section
      className="mt-10 border-t pt-8"
      style={{ borderColor: "var(--color-rule)" }}
      aria-labelledby="tribute-heading"
    >
      <h2 id="tribute-heading" className="font-display text-2xl">
        {copy.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{copy.intro}</p>

      <form className="mt-6 space-y-5" onSubmit={submit}>
        <NameField
          id="tribute-name"
          label={copy.nameLabel}
          placeholder={copy.namePlaceholder}
          value={name}
          onChange={setName}
          disabled={busy}
        />

        <VowField
          id="tribute-message"
          label={copy.messageLabel}
          placeholder={copy.messagePlaceholder}
          value={message}
          onChange={setMessage}
          disabled={busy}
        />

        {canSend ? (
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={busy || !canSubmit}
          >
            {copy.submit}
          </button>
        ) : null}
      </form>

      {canSend ? null : (
        <div className="mt-5 space-y-3">
          {wallet.hasPrivy ? (
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={wallet.connectWithGoogle}
              disabled={wallet.isConnecting}
            >
              {wallet.isConnecting ? "Entrando…" : "Entrar com Google para homenagear"}
            </button>
          ) : null}

          {wallet.isConnected && !wallet.isOnExpectedChain ? (
            <button type="button" className="btn btn-seal w-full" onClick={wallet.switchNetwork}>
              Trocar para {chain.name}
            </button>
          ) : !wallet.hasWallet && !wallet.hasPrivy ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Para deixar uma homenagem você precisa de uma carteira.{" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Instalar a MetaMask
              </a>
              .
            </p>
          ) : !wallet.isConnected && wallet.hasWallet ? (
            <button
              type="button"
              className="btn btn-quiet w-full"
              onClick={wallet.connect}
              disabled={wallet.isConnecting}
            >
              {wallet.isConnecting ? "Conectando…" : "Conectar carteira"}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
