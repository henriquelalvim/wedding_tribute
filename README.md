# Registro de casamento on-chain

Um casamento registrado na rede **Base**: o noivo pede, a noiva aceita, e qualquer
pessoa — convidado incluso — pode deixar uma homenagem gravada para sempre. Sem
backend — a página conversa direto com o contrato. Sem dinheiro envolvido: nada de
depósito, saldo ou saque.

- **`contracts/`** — `WeddingGift.sol` + testes + scripts de deploy (Hardhat 3)
- **`frontend/`** — página única em React + Vite + Tailwind, pronta para GitHub Pages

---

## Como funciona o contrato

| Função | Quem pode chamar | Quando | O que faz |
| --- | --- | --- | --- |
| `setGroom(address)` / `setBride(address)` | só o deployer | uma vez cada, enquanto ainda não definido | atribui o noivo/a noiva — eles não existem como carteira até fazer login pela primeira vez |
| `propose(vow)` | só o noivo | enquanto não estiver casado | grava os votos dele e muda o estado para `Proposed` |
| `accept(vow)` | só a noiva | só se estiver `Proposed` | grava os votos dela, muda para `Married` e emite `MarriageCelebrated` |
| `sendTribute(name, message)` | **qualquer pessoa** | sempre | grava uma homenagem no mural público, sem controle de acesso nenhum |
| `hideTribute(id)` | só o deployer | sempre | oculta uma homenagem abusiva/spam do mural (não apaga o histórico) |

Detalhes que valem saber:

- **O noivo e a noiva não são fixados no deploy.** Uma carteira criada por login social
  (Google/e-mail) só existe depois do primeiro login — por isso o deployer atribui os
  dois endereços depois, uma vez cada, por um painel discreto no rodapé da página
  (só aparece pra quem está logado como deployer, e só enquanto faltar definir alguém).
- **O pedido pode ser reescrito** enquanto a noiva não responder — dá para corrigir um
  erro de digitação nos votos. Depois do sim, tudo trava para sempre.
- **O mural é público de verdade.** Qualquer carteira — noivo, noiva, deployer ou
  convidado anônimo — pode deixar uma homenagem. A única moderação possível é o
  deployer ocultar uma entrada abusiva depois.
- **Limite de 280 bytes** em votos e recados, 64 bytes no nome da homenagem. O contador
  na tela conta bytes UTF-8, igual ao contrato (um "ç" custa 2).
- Sem dono geral, sem pause, sem upgrade, e o contrato não tem função `payable`
  nenhuma — não há dinheiro para reter.

---

## Login: MetaMask ou Google/e-mail

A página aceita duas formas de conectar, lado a lado:

- **MetaMask** (ou qualquer carteira injetada) — o caminho de sempre.
- **Google/e-mail via [Privy](https://www.privy.io)** — cria uma carteira embarcada na
  hora, sem instalar nada. Como essa carteira nasce com saldo zero, o envio de
  homenagem por esse caminho é **patrocinado** (gas pago por um Paymaster, não pelo
  convidado) via Privy Smart Wallets.

Isso é opcional: sem preencher `VITE_PRIVY_APP_ID`, o botão "Entrar com Google" some e
a página funciona só com MetaMask, como antes.

Pra habilitar:

1. Crie um app em <https://dashboard.privy.io>, restrinja os métodos de login a
   Google e e-mail, e copie o App ID.
2. Configure Smart Wallets no painel do Privy e registre a URL de um Paymaster pra
   rede que for usar (ex.: o Paymaster da [Coinbase Developer
   Platform](https://www.coinbase.com/developer-platform) pra Base, que tem tier
   grátis pro volume de uma festa). Isso é feito **no painel do Privy**, não no `.env`.
3. Preencha `VITE_PRIVY_APP_ID` em `frontend/.env`.

> A carteira MetaMask/injetada paga o próprio gas normalmente — o patrocínio existe só
> pra quem loga com Google/e-mail, que é o caminho pensado pra convidados sem carteira.

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
cp .env.example .env
npm test                    # 42 testes do contrato
npm run deploy:local
```

O deploy imprime o endereço do contrato e já copia a ABI para o frontend. Ele **não**
pede endereço de noivo/noiva — isso vem depois.

```bash
# terminal 3 — a página
cd frontend
npm install
cp .env.example .env
# preencha VITE_CHAIN_ID=31337, VITE_CONTRACT_ADDRESS=<o endereço impresso>,
# VITE_RPC_URL=http://127.0.0.1:8545
npm run dev
```

Conecte com a primeira conta que o `npm run node` imprime — ela é o deployer — e use o
painel "Configuração do contrato" no rodapé da página pra atribuir noivo e noiva
(qualquer outra conta local serve pra teste). Só depois disso os botões de propor/
aceitar aparecem pra quem conectar com essas contas.

### 2. Deploy em Base Sepolia (rede de teste, ETH sem valor)

Preencha `contracts/.env`:

```
PRIVATE_KEY=0x...        # a carteira que paga o deploy — também a única que pode
                          # atribuir noivo/noiva e ocultar homenagens depois
BASESCAN_API_KEY=...     # opcional, para verificar o contrato
```

Pegue ETH de teste em <https://www.alchemy.com/faucets/base-sepolia> e rode:

```bash
cd contracts
npm run deploy:sepolia
npx hardhat verify --network baseSepolia <endereço>
```

Depois aponte `frontend/.env` para `VITE_CHAIN_ID=84532`,
`VITE_RPC_URL=https://sepolia.base.org` e o endereço novo. Entre como deployer e
atribua noivo/noiva pelo painel — ou, se preferir terminal, preencha
`GROOM_ADDRESS`/`BRIDE_ADDRESS` em `contracts/.env` e rode
`npm run set-couple -- --network baseSepolia`.

### 3. Deploy em Base mainnet (valendo de verdade)

Igual ao passo 2, com `npm run deploy:base`. Diferente de antes, não precisa saber os
endereços do noivo e da noiva **antes** de deployar — pode fazer isso quando eles
efetivamente logarem pela primeira vez.

### 4. Publicar a página no GitHub Pages

1. Em **Settings → Pages**, escolha *Source: GitHub Actions*.
2. Em **Settings → Secrets and variables → Actions → Variables**, crie:
   - `VITE_CHAIN_ID` → `8453`
   - `VITE_CONTRACT_ADDRESS` → o endereço do contrato
   - `VITE_RPC_URL` → `https://mainnet.base.org`
   - `VITE_BASE_PATH` → `/wedding_tribute/` (ou `/` se usar domínio próprio)
   - `VITE_PRIVY_APP_ID` → opcional, se for habilitar login por Google/e-mail
3. Faça push na `main`. O workflow `.github/workflows/deploy-pages.yml` roda os testes,
   builda e publica.

> Essas variáveis são **públicas** de propósito: o Vite as embute no JavaScript. Por
> isso são *variables*, não *secrets*. **A chave privada nunca entra aqui** — ela vive
> só em `contracts/.env`, que está no `.gitignore`.

---

## Personalizar

| O que | Onde |
| --- | --- |
| Nomes, data, local, monograma do selo | `frontend/src/content.js` |
| A mensagem da celebração | `frontend/src/content.js` → `celebration` |
| Textos do formulário de homenagem | `frontend/src/content.js` → `tribute` |
| A foto do casal | substitua `frontend/public/couple.jpg` (proporção 4:5) |
| Cores e tipografia | `frontend/src/index.css`, bloco `@theme` |

---

## Testes

```bash
cd contracts && npm test     # 42 testes do contrato
cd frontend  && npm test     # 11 testes dos utilitários
```

O caminho de patrocínio de gas (Privy Smart Wallets + Paymaster) não dá pra testar
contra um nó local — Paymasters só reconhecem redes públicas registradas. Validação
real desse caminho é manual, na Base Sepolia, com login incógnito pra garantir uma
carteira embarcada zerada.

---

## Decisões de projeto

**Leitura sem carteira.** A página cria um `JsonRpcProvider` no RPC público da Base e lê
o contrato por ali. Um convidado sem carteira nenhuma abre o link e vê a foto, o status,
os votos e o mural. A carteira só entra em cena para assinar transações.

**Como os confetes disparam.** Para quem assina o aceite, o evento `MarriageCelebrated` é
lido direto do recibo da transação — garantido, sem depender de subscription. Para todo
mundo que estiver com a página aberta, um `summary()` a cada 10 segundos detecta a
virada para `Married`. Nada depende de `eth_getLogs` em tempo real, que RPC público
costuma limitar.

**Uma chamada RPC por atualização.** O contrato expõe `summary()`, que devolve estado,
endereços e os votos de uma vez; o mural tem seu próprio polling separado
(`getTributes()`), num intervalo mais espaçado, já que só cresce.

**Peso.** O núcleo (React + ethers + confete) continua leve — poucas centenas de KB
gzip. O SDK do Privy (login social + smart wallets) é uma dependência bem mais pesada
por natureza (puxa WalletConnect, Coinbase, etc.); grande parte dela é carregada sob
demanda em pedaços separados, mas o custo inicial ainda cresce sensivelmente frente à
versão só-MetaMask. Ative `VITE_PRIVY_APP_ID` sabendo desse trade-off.
