# Registro de casamento on-chain

Um casamento registrado na rede **Base**: o noivo pede, a noiva aceita, os convidados
presenteiam em ETH e o casal saca depois do sim. Sem backend — a página conversa
direto com o contrato.

- **`contracts/`** — `WeddingGift.sol` + testes + scripts de deploy (Hardhat 3)
- **`frontend/`** — página única em React + Vite + Tailwind, pronta para GitHub Pages

---

## Como funciona o contrato

| Função | Quem pode chamar | Quando | O que faz |
| --- | --- | --- | --- |
| `propose(vow)` | só o noivo | enquanto não estiver casado | grava os votos dele e muda o estado para `Proposed` |
| `accept(vow)` | só a noiva | só se estiver `Proposed` | grava os votos dela, muda para `Married` e emite `MarriageCelebrated` |
| `depositGift(message)` | qualquer pessoa | sempre | recebe o presente em ETH, com recado opcional |
| `withdrawGift()` | noivo **ou** noiva | só depois de casados | envia **todo** o saldo para quem chamou |

Detalhes que valem saber:

- **Os endereços do casal são imutáveis.** Ficam gravados no deploy e não mudam nunca.
- **O saque leva 100%.** Quem chamar primeiro recebe tudo — foi a escolha combinada.
- **A dedicatória.** Quando o noivo ou a noiva depositam com uma mensagem, ela vira a
  `dedication` do contrato e é lida junto com os votos no evento final. O recado de um
  convidado fica só no evento `GiftReceived` e não sobrescreve a dedicatória.
- **O pedido pode ser reescrito** enquanto a noiva não responder — dá para corrigir um
  erro de digitação nos votos. Depois do sim, tudo trava para sempre.
- **Limite de 280 bytes** em votos, dedicatória e recados. O contador na tela conta bytes
  UTF-8, igual ao contrato (um "ç" custa 2).
- Sem dono, sem pause, sem upgrade: nada no código consegue reter o dinheiro do casal.

---

## Passo a passo

### 1. Testar tudo localmente

```bash
# terminal 1 — um nó blockchain na sua máquina
cd contracts
npm install
npm run node
```

```bash
# terminal 2 — deploy no nó local
cd contracts
cp .env.example .env        # o .env de exemplo já vem com as contas do Hardhat
npm test                    # 34 testes do contrato
npm run deploy:local
```

O deploy imprime o endereço do contrato e já copia a ABI para o frontend.

```bash
# terminal 3 — a página
cd frontend
npm install
cp .env.example .env
# preencha VITE_CHAIN_ID=31337, VITE_CONTRACT_ADDRESS=<o endereço impresso>,
# VITE_RPC_URL=http://127.0.0.1:8545
npm run dev
```

Para testar os papéis, importe no MetaMask as chaves privadas que o `npm run node`
imprime: a conta #0 é o noivo e a #1 é a noiva. Adicione a rede local (chainId 31337,
RPC `http://127.0.0.1:8545`).

### 2. Deploy em Base Sepolia (rede de teste, ETH sem valor)

Preencha `contracts/.env`:

```
PRIVATE_KEY=0x...        # a carteira que paga o deploy
GROOM_ADDRESS=0x...      # noivo
BRIDE_ADDRESS=0x...      # noiva
BASESCAN_API_KEY=...     # opcional, para verificar o contrato
```

Pegue ETH de teste em <https://www.alchemy.com/faucets/base-sepolia> e rode:

```bash
cd contracts
npm run deploy:sepolia
npx hardhat verify --network baseSepolia <endereço> <noivo> <noiva>
```

Depois aponte `frontend/.env` para `VITE_CHAIN_ID=84532`,
`VITE_RPC_URL=https://sepolia.base.org` e o endereço novo.

### 3. Deploy em Base mainnet (valendo de verdade)

Igual ao passo 2, com `npm run deploy:base`. Confira duas vezes os endereços do noivo e
da noiva antes: **eles não podem ser alterados depois.**

### 4. Publicar a página no GitHub Pages

1. Em **Settings → Pages**, escolha *Source: GitHub Actions*.
2. Em **Settings → Secrets and variables → Actions → Variables**, crie:
   - `VITE_CHAIN_ID` → `8453`
   - `VITE_CONTRACT_ADDRESS` → o endereço do contrato
   - `VITE_RPC_URL` → `https://mainnet.base.org`
   - `VITE_BASE_PATH` → `/wedding_tribute/` (ou `/` se usar domínio próprio)
3. Faça push na `main`. O workflow `.github/workflows/deploy-pages.yml` roda os testes,
   builda e publica.

> Essas quatro variáveis são **públicas** de propósito: o Vite as embute no JavaScript.
> Por isso são *variables*, não *secrets*. **A chave privada nunca entra aqui** — ela
> vive só em `contracts/.env`, que está no `.gitignore`.

---

## Personalizar

| O que | Onde |
| --- | --- |
| Nomes, data, local, monograma do selo | `frontend/src/content.js` |
| A mensagem da celebração | `frontend/src/content.js` → `celebration` |
| Valores sugeridos de presente | `frontend/src/content.js` → `gift.presets` |
| A foto do casal | substitua `frontend/public/couple.jpg` (proporção 4:5) |
| Cores e tipografia | `frontend/src/index.css`, bloco `@theme` |

---

## Testes

```bash
cd contracts && npm test     # 34 testes do contrato
cd frontend  && npm test     # 11 testes dos utilitários
```

---

## Decisões de projeto

**Leitura sem carteira.** A página cria um `JsonRpcProvider` no RPC público da Base e lê
o contrato por ali. Um convidado sem MetaMask abre o link e vê a foto, o status e o total
arrecadado. A carteira só entra em cena para assinar transações.

**Como os confetes disparam.** Para quem assina o aceite, o evento `MarriageCelebrated` é
lido direto do recibo da transação — garantido, sem depender de subscription. Para todo
mundo que estiver com a página aberta, um `summary()` a cada 10 segundos detecta a
virada para `Married`. Nada depende de `eth_getLogs` em tempo real, que RPC público
costuma limitar.

**Uma chamada RPC por atualização.** O contrato expõe `summary()`, que devolve estado,
saldo, endereços e os três textos de uma vez.

**Peso.** ~165 KB gzip no total, quase tudo `ethers`. O `canvas-confetti` é carregado sob
demanda e só aparece na hora da festa.
