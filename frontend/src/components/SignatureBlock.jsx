import { useState } from "react";
import { MAX_MESSAGE_BYTES, STATUS } from "../config.js";
import { byteLength, formatEth } from "../lib/format.js";
import VowField from "./VowField.jsx";

/**
 * The signature block of the document: only the two people named above ever see
 * anything here. Everyone else — guests and the deployer alike — gets the gift form
 * instead. The deployer can fund the gift and set the dedication, but proposing,
 * accepting and withdrawing are the couple's alone.
 */
export default function SignatureBlock({ ceremony, role, wallet, wedding, chain }) {
  const [vow, setVow] = useState("");

  if (!ceremony || (role !== "groom" && role !== "bride")) return null;

  const status = ceremony.status;
  const busy = wedding.tx.state === "pending";
  const blocked = !wallet.isOnExpectedChain;
  const vowTooLong = byteLength(vow) > MAX_MESSAGE_BYTES;

  const isGroom = role === "groom";
  const canPropose = isGroom && status !== STATUS.MARRIED;
  const canAccept = role === "bride" && status === STATUS.PROPOSED;
  const canWithdraw = status === STATUS.MARRIED && ceremony.balance > 0n;

  const submit = async (action) => {
    const sent = action === "propose" ? wedding.propose(vow) : wedding.accept(vow);
    const receipt = await sent;
    if (receipt) setVow("");
  };

  return (
    <section
      className="sheet mt-10 px-5 py-7 sm:px-8"
      aria-labelledby="signature-heading"
      style={{ borderColor: "var(--color-ink)" }}
    >
      <h2 id="signature-heading" className="label">
        {isGroom ? "Assinatura do noivo" : "Assinatura da noiva"}
      </h2>

      {canPropose ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-ink-soft">
            {status === STATUS.PENDING
              ? "Faça um pedido de casamento, com seus votos de forma resumida. Ficará gravado para a eternidade."
              : "O pedido já está no ar. Você ainda pode reescrever seus votos enquanto ela não responde."}
          </p>
          <VowField
            id="groom-vow"
            label="Seus votos"
            placeholder="O que você diria se não coubesse em uma aliança"
            value={vow}
            onChange={setVow}
            disabled={busy || blocked}
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy || blocked || vowTooLong}
            onClick={() => submit("propose")}
          >
            {status === STATUS.PENDING ? "Fazer o pedido" : "Reescrever o pedido"}
          </button>
        </div>
      ) : null}

      {canAccept ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-ink-soft">
            Ele já perguntou. Sua resposta é uma transação só — e não tem como desfazer.
          </p>
          <VowField
            id="bride-vow"
            label="Sua resposta"
            placeholder="Sim, e o resto é história"
            value={vow}
            onChange={setVow}
            disabled={busy || blocked}
          />
          <button
            type="button"
            className="btn btn-seal w-full"
            disabled={busy || blocked || vowTooLong}
            onClick={() => submit("accept")}
          >
            Aceitar o pedido
          </button>
        </div>
      ) : null}

      {role === "bride" && status === STATUS.PENDING ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Ainda não há pedido registrado. Quando houver, o botão aparece aqui.
        </p>
      ) : null}

      {status === STATUS.MARRIED ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            {canWithdraw
              ? `Há ${formatEth(ceremony.balance)} ${chain.currency.symbol} guardados. O saque envia tudo para a carteira conectada.`
              : "Não há saldo para sacar no momento."}
          </p>
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy || blocked || !canWithdraw}
            onClick={wedding.withdraw}
          >
            Sacar presentes
          </button>
        </div>
      ) : null}

      {blocked ? (
        <p className="mt-4 text-sm" style={{ color: "var(--color-seal)" }}>
          Troque para {chain.name} para assinar.
        </p>
      ) : null}
    </section>
  );
}
