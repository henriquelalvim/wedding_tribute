import { useState } from "react";
import { MAX_MESSAGE_BYTES } from "../config.js";
import { byteLength } from "../lib/format.js";

/** Accepts "0,01" as readily as "0.01" — the keyboard on a Brazilian phone gives a comma. */
function normalizeAmount(input) {
  return input.replace(",", ".").trim();
}

function isValidAmount(input) {
  const value = Number(normalizeAmount(input));
  return Number.isFinite(value) && value > 0;
}

export default function GiftForm({ copy, chain, wallet, wedding, role }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const busy = wedding.tx.state === "pending";
  const messageTooLong = byteLength(message) > MAX_MESSAGE_BYTES;
  const amountOk = isValidAmount(amount);
  // Groom, bride and whoever deployed the contract are all allowed to set the
  // dedication read out at the wedding — worth telling them so before they send it.
  const canDedicate = role !== "guest";

  const canSend = wallet.isConnected && wallet.isOnExpectedChain;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSend || !amountOk || messageTooLong) return;
    const receipt = await wedding.depositGift(normalizeAmount(amount), message);
    if (receipt) setMessage("");
  };

  return (
    <section
      className="mt-10 border-t pt-8"
      style={{ borderColor: "var(--color-rule)" }}
      aria-labelledby="gift-heading"
    >
      <h2 id="gift-heading" className="font-display text-2xl">
        {copy.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{copy.intro}</p>

      <form className="mt-6 space-y-5" onSubmit={submit}>
        <div>
          <label htmlFor="gift-amount" className="label">
            {copy.amountLabel}
          </label>
          <div className="mt-2 flex items-stretch">
            <input
              id="gift-amount"
              className="field flex-1"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.01"
              value={amount}
              disabled={busy}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby="gift-amount-unit"
            />
            <span
              id="gift-amount-unit"
              className="data flex items-center border border-l-0 px-4 text-sm text-ink-soft"
              style={{ borderColor: "var(--color-rule)" }}
            >
              {chain.currency.symbol}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="gift-message" className="label">
              {copy.messageLabel}
            </label>
            <span
              className="data text-[0.6875rem]"
              style={{
                color: messageTooLong ? "var(--color-seal)" : "var(--color-ink-soft)",
              }}
            >
              {byteLength(message)}/{MAX_MESSAGE_BYTES}
            </span>
          </div>
          <input
            id="gift-message"
            className="field mt-2"
            type="text"
            value={message}
            disabled={busy}
            placeholder={copy.messagePlaceholder}
            onChange={(event) => setMessage(event.target.value)}
          />
          {canDedicate ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Esta carteira pode gravar a dedicatória: esta mensagem vira o texto lido
              na hora do sim.
            </p>
          ) : null}
        </div>

        {canSend ? (
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={busy || !amountOk || messageTooLong}
          >
            {copy.submit}
          </button>
        ) : null}

        {!amountOk && amount.trim() !== "" ? (
          <p className="text-sm" style={{ color: "var(--color-seal)" }}>
            Informe um valor maior que zero.
          </p>
        ) : null}
      </form>

      {canSend ? null : (
        <div className="mt-5">
          {!wallet.hasWallet ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Para presentear você precisa de uma carteira.{" "}
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
          ) : !wallet.isConnected ? (
            <button
              type="button"
              className="btn btn-quiet w-full"
              onClick={wallet.connect}
              disabled={wallet.isConnecting}
            >
              {wallet.isConnecting ? "Conectando…" : "Conectar carteira para presentear"}
            </button>
          ) : (
            <button type="button" className="btn btn-seal w-full" onClick={wallet.switchNetwork}>
              Trocar para {chain.name}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
