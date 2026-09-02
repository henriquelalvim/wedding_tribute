// ---------------------------------------------------------------------------
// Every piece of copy you may want to change lives here. Edit this file, not the
// components. Swap the photo by replacing public/couple.jpg with your own.
// ---------------------------------------------------------------------------

export const content = {
  /** Shown in the browser tab and at the top of the document. */
  registryLabel: "Registro de casamento",

  couple: {
    groomName: "Matheus",
    brideName: "Kellen",
    /** Initials struck into the seal. Two or three characters look best. */
    monogram: "M&K",
    /** Free text under the names. */
    date: "5 de Setembro de 2026",
    place: "São José da Coroa Grande, Pernambuco",
    photoAlt: "Foto do casal",
    photoCaption: "Mateu e Keli",
  },

  tribute: {
    title: "Deixe uma homenagem",
    intro:
      "Um recado seu, gravado para sempre neste registro. Não precisa ter carteira nem ETH — basta entrar com o Google.",
    nameLabel: "Seu nome",
    namePlaceholder: "Como quer assinar",
    messageLabel: "Recado",
    messagePlaceholder: "O que você gostaria de dizer ao casal",
    submit: "Gravar homenagem",
  },

  /** The message shown in the celebration modal, right after she says yes. */
  celebration: {
    eyebrow: "5 de Setembro de 2026",
    title: "Ela disse sim.",
    body: [
      "Neste bloco, e em todos os que vierem depois dele, fica registrado que duas pessoas escolheram uma à outra.",
      "Não existe cartório que dure mais que isto. Enquanto houver um único nó de pé em qualquer canto do mundo, este sim continua lá — sem carimbo para renovar, sem gaveta para se perder, sem ninguém que possa apagar.",
      "Que a felicidade e o amor de vocês perdure tanto tempo quanto o registro dessa transação.",
    ],
    signature: "Com todo o carinho de quem escreveu este contrato, Henrique Alvim",
  },

  /** Fallback text when a vow was left blank on-chain. */
  emptyVow: "— sem palavras, só o sim —",
};

export default content;
