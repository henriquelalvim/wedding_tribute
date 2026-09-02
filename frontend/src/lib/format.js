const encoder = new TextEncoder();

/** UTF-8 byte length — the unit the contract measures messages in. */
export function byteLength(text) {
  return encoder.encode(text ?? "").length;
}

export function shortAddress(address) {
  if (!address || address.length < 10) return address ?? "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function sameAddress(a, b) {
  return Boolean(a) && Boolean(b) && a.toLowerCase() === b.toLowerCase();
}

export function formatDateTime(unixSeconds) {
  if (!unixSeconds) return "";
  return new Date(Number(unixSeconds) * 1000).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function explorerTxUrl(explorer, hash) {
  return explorer && hash ? `${explorer}/tx/${hash}` : "";
}

export function explorerAddressUrl(explorer, address) {
  return explorer && address ? `${explorer}/address/${address}` : "";
}

/**
 * Turns a wallet or RPC error into something a guest can act on.
 * MetaMask nests the useful part several levels down and shouts in English.
 */
export function friendlyError(error) {
  if (!error) return "";
  const code = error.code ?? error.info?.error?.code;
  if (code === "ACTION_REJECTED" || code === 4001) return "Transação cancelada na carteira.";
  if (code === "INSUFFICIENT_FUNDS" || error.code === -32000) {
    return "Saldo insuficiente para o valor mais a taxa de rede.";
  }

  const name = error.revert?.name ?? error.info?.error?.data?.name;
  const known = {
    NotGroom: "Só a carteira do noivo pode fazer o pedido.",
    NotBride: "Só a carteira da noiva pode responder.",
    InvalidStatus: "Esta ação não está disponível no estado atual da cerimônia.",
    MessageTooLong: "A mensagem passou do limite de 280 caracteres.",
    NotDeployer: "Só a carteira do deployer pode fazer isso.",
    AlreadySet: "Esse endereço já foi definido e não pode ser trocado.",
    InvalidCouple: "Endereço inválido — não pode ser vazio nem igual ao do outro cônjuge.",
    NameTooLong: "O nome passou do limite de 64 caracteres.",
    EmptyTribute: "Escreva um recado antes de enviar.",
    TributeNotFound: "Essa homenagem não existe.",
  };
  if (name && known[name]) return known[name];

  const MAX_LENGTH = 160;
  const message = error.shortMessage || error.reason || error.message || "Erro inesperado.";
  return message.length > MAX_LENGTH ? `${message.slice(0, MAX_LENGTH - 1)}…` : message;
}
