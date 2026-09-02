import { useState } from "react";
import { isAddress, ZeroAddress } from "ethers";

/**
 * Visible only to the deployer, and only until both addresses are assigned — the
 * groom/bride don't exist as wallets until they log in for the first time, so this
 * is where the deployer plugs them in once they know them (same as before, just
 * moved out of deploy time). Tucked behind a <details> so it never reads as part of
 * the narrative a guest sees.
 */
export default function CoupleAdminPanel({ role, ceremony, wedding }) {
  const [groomInput, setGroomInput] = useState("");
  const [brideInput, setBrideInput] = useState("");

  if (role !== "deployer" || !ceremony) return null;

  const groomUnset = ceremony.groom === ZeroAddress;
  const brideUnset = ceremony.bride === ZeroAddress;
  if (!groomUnset && !brideUnset) return null;

  const busy = wedding.tx.state === "pending";

  return (
    <details
      className="mt-10 border-t pt-6 text-sm"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <summary className="label cursor-pointer select-none">Configuração do contrato</summary>

      <div className="mt-4 space-y-5">
        {groomUnset ? (
          <div>
            <label htmlFor="admin-groom" className="label">
              Endereço do noivo
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="admin-groom"
                className="field flex-1"
                type="text"
                autoComplete="off"
                placeholder="0x..."
                value={groomInput}
                disabled={busy}
                onChange={(event) => setGroomInput(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-quiet shrink-0"
                disabled={busy || !isAddress(groomInput)}
                onClick={() => wedding.setGroom(groomInput)}
              >
                Definir
              </button>
            </div>
          </div>
        ) : null}

        {brideUnset ? (
          <div>
            <label htmlFor="admin-bride" className="label">
              Endereço da noiva
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="admin-bride"
                className="field flex-1"
                type="text"
                autoComplete="off"
                placeholder="0x..."
                value={brideInput}
                disabled={busy}
                onChange={(event) => setBrideInput(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-quiet shrink-0"
                disabled={busy || !isAddress(brideInput)}
                onClick={() => wedding.setBride(brideInput)}
              >
                Definir
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}
