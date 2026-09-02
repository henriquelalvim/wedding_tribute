import { configError } from "../config.js";

/** Shown when frontend/.env has not been filled in yet. */
export default function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="label">Configuração pendente</p>
      <h1 className="font-display mt-3 text-3xl">Falta apontar o contrato</h1>
      <p className="mt-4 leading-relaxed text-ink-soft">{configError}</p>
      <p className="mt-6 text-sm leading-relaxed">
        Copie <code className="data">frontend/.env.example</code> para{" "}
        <code className="data">frontend/.env</code>, preencha os valores impressos pelo
        script de deploy e rode <code className="data">npm run dev</code> de novo.
      </p>
    </main>
  );
}
