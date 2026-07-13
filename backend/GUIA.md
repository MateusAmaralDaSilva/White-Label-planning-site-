# Guia didático do backend

Este guia explica **como o backend funciona e por quê**, para quem está
aprendendo a programar. Não é uma referência seca: a ideia é você entender os
conceitos (multi-tenant, JWT, RLS, middleware, migrations…) e depois abrir os
arquivos reais — sempre citados — para ver na prática.

> Se algum termo parecer estranho, pule para o **[Glossário](#glossário)** no fim.

---

## 1. O que é esta aplicação (a visão de cima)

É uma plataforma **whitelabel multi-tenant**. Traduzindo:

- **Multi-tenant** = _um mesmo sistema_ atende _várias empresas_ ao mesmo tempo.
  Cada empresa é um **tenant** (inquilino). Pense num prédio: o código é o
  prédio, cada empresa é um apartamento. Todos moram no mesmo prédio, mas ninguém
  entra no apartamento do outro.
- **Whitelabel** = cada empresa vê o sistema com a _sua própria cara_ (nome,
  logo, cores, módulos ativos). O mesmo código, aparências diferentes.

O backend é o **cérebro**: ele guarda os dados, decide quem pode ver o quê e
responde às perguntas que o frontend (a tela) faz. Frontend e backend conversam
por **HTTP**, trocando **JSON**.

```
[Navegador / Frontend]  ⇄  HTTP + JSON  ⇄  [Backend (este projeto)]  ⇄  [Banco PostgreSQL]
```

---

## 2. A stack (as ferramentas) e por que cada uma

| Ferramenta | Para quê serve | Por que ela |
| --- | --- | --- |
| **Node.js + TypeScript** | Rodar JavaScript no servidor, com tipos | Mesma linguagem do frontend; os tipos pegam erros antes de rodar |
| **Express** | Receber requisições HTTP e roteá-las | Minimalista, fácil de entender |
| **PostgreSQL** | Guardar os dados (banco relacional) | Robusto e com **RLS** (isolamento por tenant no próprio banco) |
| **`pg`** | Falar com o Postgres a partir do Node | Driver oficial |
| **JWT** (`jsonwebtoken`) | Provar quem é o usuário sem guardar sessão no servidor | Simples e "stateless" |
| **bcryptjs** | Guardar senhas de forma segura (hash) | Padrão da indústria para senhas |
| **zod** | Validar os dados que chegam | Valida _e_ gera os tipos, sem duplicar |

---

## 3. Conceitos-chave (leia isto antes do resto)

### 3.1. Autenticação com JWT — "a pulseira da festa"

Quando você entra numa festa e mostra o documento, ganha uma **pulseira**. Depois
disso ninguém pede seu documento de novo: a pulseira já prova que você pode
estar ali. O **JWT** (JSON Web Token) é essa pulseira.

1. Você faz **login** (e-mail + senha) → o servidor confere e devolve um **token**.
2. Em toda requisição seguinte, o frontend manda esse token no cabeçalho
   `Authorization: Bearer <token>`.
3. O servidor **verifica a assinatura** do token e sabe quem você é — sem
   precisar consultar uma tabela de sessões.

O token carrega, assinado, coisas como: seu id (`sub`), seu `tenantId` e seus
papéis (`isPlatformAdmin`, `isTenantAdmin`). Como é **assinado com um segredo**
que só o servidor conhece (`JWT_SECRET`), o cliente **não consegue falsificar**
(ex.: não dá para se autopromover a admin editando o token).

Veja: `src/lib/jwt.ts` (`signToken`, `verifyToken`).

### 3.2. Hash de senha (bcrypt) — "trituração só de ida"

O banco **nunca** guarda a senha em texto puro. Guarda um **hash**: o resultado
de "triturar" a senha com um algoritmo que **não tem volta** (não dá para
descobrir a senha a partir do hash). No login, trituramos a senha digitada e
comparamos os hashes.

- Usamos **bcrypt** com "custo 12": ele é _de propósito_ lento, o que torna
  ataques de força bruta caros.
- Mesmo se o banco vazar, as senhas não são reveladas.

Veja: uso de `bcrypt.hash`/`bcrypt.compare` em `routes/auth.ts` e
`db/repositories/admin.repo.ts`.

### 3.3. Isolamento por tenant com RLS — "o porteiro dentro do banco"

Como garantir que a Empresa A nunca veja os dados da Empresa B? A resposta
_ingênua_ seria "lembrar de colocar `WHERE tenant_id = ...` em toda query". Mas
basta esquecer **uma vez** para vazar tudo.

Aqui a garantia mora **dentro do banco**, via **RLS (Row-Level Security)**:

- Toda tabela tem uma coluna `tenant_id` e uma **política**: "só enxergue as
  linhas em que `tenant_id = tenant_atual`".
- Antes de rodar as queries, a aplicação declara o tenant da vez com
  `SET LOCAL app.current_tenant = <tenantId do JWT>`.
- A partir daí, **mesmo uma query que esqueça o `WHERE`** não vaza: o banco
  simplesmente recusa as linhas de outros tenants.

E o `tenantId` vem **sempre do JWT** (assinado), nunca de um campo que o cliente
escolhe. Veja: `src/db/tenant-context.ts` (`withTenant`) e as políticas em
`db/migrations/0002_security.sql`.

### 3.4. Middleware — "a esteira de inspeção"

Uma requisição, antes de chegar no código que responde, passa por uma **esteira**
de pequenas funções chamadas **middlewares**. Cada uma inspeciona/prepara e diz
"pode passar" (`next()`) ou barra (lança um erro).

Exemplo da esteira de uma rota de dados:

```
requisição → requireAuth → loadCurrentUser → requireActiveSubscription → handler → resposta
             (tem token?)  (usuário existe?)  (assinatura em dia?)       (faz o trabalho)
```

Veja: `src/middleware/`.

### 3.5. Migrations — "o histórico de construção do banco"

O banco não é criado "na mão". Ele é construído por **migrations**: arquivos SQL
**numerados** (`0001`, `0002`, …) que rodam **em ordem**, cada um adicionando um
pedaço (uma tabela nova, uma coluna, uma função). É como o histórico de commits,
só que do banco.

- São **append-only**: uma vez aplicada, você não edita — cria uma nova.
- Ficam em `db/migrations/`. O passo a passo de como aplicar está em
  `db/README.md`.

### 3.6. Validação com zod — "o filtro de entrada"

Nunca confie no que chega de fora. Cada rota que recebe dados valida o corpo com
um **schema zod** antes de usar. Se vier algo inválido (e-mail torto, número
negativo onde não pode), a requisição é barrada com **400**. Bônus: o tipo
TypeScript é _derivado_ do schema (`z.infer`), então validação e tipo nunca ficam
diferentes.

```ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
const { email, password } = loginSchema.parse(req.body) // lança se inválido
```

---

## 4. O caminho de uma requisição (exemplo real)

Vamos seguir um **`GET /api/products`** (listar produtos), do início ao fim:

1. **Chega no Express** (`src/index.ts`). Ele já configurou CORS e leitura de
   JSON, e encaminha `/api/*` para o `dataRouter`.
2. **`requireAuth`** (`middleware/auth.ts`): lê o cabeçalho `Authorization`,
   verifica o JWT e preenche `req.auth` (com `tenantId`, `sub`, papéis). Sem
   token válido → **401**.
3. **`loadCurrentUser`**: com o `tenantId`/`sub` do token, consulta o banco para
   confirmar que o usuário **ainda existe** e reler o **papel atual** e a
   **assinatura**. Se foi excluído → **401** na hora. (É o que dá "revogação
   imediata" — veja §6.)
4. **`requireActiveSubscription`** (`middleware/subscription.ts`): se a
   assinatura do tenant expirou → **402** (o frontend mostra a tela de
   renovação). Admin de plataforma é isento.
5. **O handler** da rota (`routes/data/products.routes.ts`) chama o repositório
   `getProducts(tenantId)`.
6. **O repositório** (`db/repositories/products.repo.ts`) abre uma transação com
   `withTenant`, que faz `SET LOCAL app.current_tenant`, e roda um `SELECT`
   **parametrizado**. O **RLS** garante que só vêm os produtos daquele tenant.
7. A lista volta como **JSON**. Se algo deu errado no meio, um `throw` cai no
   **handler de erro central** (`middleware/error.ts`), que devolve o status
   certo — sem vazar detalhes internos.

---

## 5. Passeio pelas pastas (o que é cada coisa)

```
backend/
├── src/
│   ├── index.ts              # Ponto de entrada: monta o Express, CORS, rotas, erros, sobe o servidor
│   ├── config/
│   │   └── env.ts            # Lê variáveis de ambiente uma vez; "falha rápido" se faltar algo crítico
│   ├── types/                # Os "contratos" de dados da API, UM arquivo por domínio
│   │   ├── index.ts          #   barril: re-exporta tudo (export *); o front importa via @contracts
│   │   └── auth·sales·reports·common… .ts   #   um por domínio (common = Tone/IconKey)
│   ├── lib/                  # Peças reutilizáveis, sem estado
│   │   ├── jwt.ts            #   assina/verifica o token
│   │   ├── http.ts           #   HttpError + atalhos (badRequest, unauthorized, 402, 429…)
│   │   ├── async-handler.ts  #   faz erros de funções async caírem no handler central
│   │   ├── billing.ts        #   deriva "assinatura ativa?" a partir da data paid_until
│   │   ├── rate-limit.ts     #   freia tentativas de login (anti força-bruta)
│   │   └── relative-time.ts  #   transforma um timestamp em "há 5 min", "Hoje"…
│   ├── middleware/           # As funções da "esteira" de cada requisição
│   │   ├── auth.ts           #   requireAuth, loadCurrentUser, requireAdmin, requireTenantAdmin
│   │   ├── subscription.ts   #   bloqueia dados quando a assinatura vence (402)
│   │   └── error.ts          #   404 + tradução central de erros para JSON
│   ├── db/
│   │   ├── pool.ts           #   pool de conexões; conecta como a role de menor privilégio
│   │   ├── tenant-context.ts #   withTenant (transação + contexto de tenant) e withTransaction
│   │   └── repositories/     #   UM arquivo por domínio; o ÚNICO lugar que fala com o banco
│   └── routes/               # UM sub-router por domínio; o index.ts de cada grupo compõe
│       ├── auth.ts           #   /api/auth/login e /api/auth/me
│       ├── admin/            #   /api/admin/* (dono da plataforma): accounts + analytics
│       └── data/             #   /api/* (dados do tenant): products, sales, calendar, …
└── db/
    ├── migrations/           # A construção do banco, passo a passo (0001 … 0018)
    └── README.md             # Como criar o banco e aplicar as migrations
```

**Uma regra de ouro do projeto:** só os arquivos em `db/repositories/` falam com
o banco, e sempre com queries **parametrizadas** (`$1, $2…`) — nunca "colando"
texto do usuário dentro do SQL. É isso que fecha a porta para **SQL Injection**.

---

## 6. As funcionalidades, uma a uma

### 6.1. Login e sessão (`routes/auth.ts`)

- **`POST /api/auth/login`**: recebe e-mail/senha, confere o hash com bcrypt e
  devolve `{ token, user }`. Detalhe fino de segurança: mesmo quando o e-mail não
  existe, comparamos com um hash "de mentira", para o tempo de resposta não
  denunciar se o e-mail existe ou não (evita _timing attack_).
- **`GET /api/auth/me`**: revalida o token e devolve o usuário — útil para o
  frontend "reidratar" a sessão quando você atualiza a página.
- **Rate-limit**: o login aceita no máximo 10 tentativas a cada 15 min por IP
  (`lib/rate-limit.ts`), para frear ataques de força bruta.

### 6.2. Configuração do tenant (`routes/data/` + `tenants.repo.ts`)

- **`GET /api/config`**: o "bootstrap" logo após o login — marca (nome, logo,
  cores), tema, módulos ativos e estado da assinatura. É o que permite o
  whitelabel: a mesma tela se veste conforme o tenant.
- **`PUT /api/config`**: salva tema e ordem/visibilidade dos módulos.

### 6.3. Módulos de negócio (`routes/data/` + repos)

Cada um segue o mesmo padrão **CRUD** (Create, Read, Update, Delete), validado
com zod e isolado por tenant via RLS:

- **Produtos e Serviços** (`products.repo.ts`): mesma tabela, campo `kind`
  distingue os dois. Têm preço, custo e (produtos) estoque.
- **Clientes** (`customers.repo.ts`).
- **Vendas** (`sales.repo.ts`): ao registrar uma venda, o servidor **copia**
  preço/custo do produto naquele instante (um _snapshot_), para o histórico não
  mudar se você reajustar o preço depois.
- **Gastos** (`expenses.repo.ts`) e **Relatórios** (`reports.repo.ts`):
  os relatórios são **calculados** a partir de vendas − custos (receita, lucro,
  margem, top categorias) — não são dados "chumbados". Incluem também o ranking de
  **Melhores Clientes** (quem comprou mais e o quê), agregado das vendas do período.
- **Agenda** (`calendar.repo.ts`): agendas compartilhadas ou privadas, com
  visibilidade por usuário.
- **Suporte** (`support.repo.ts`), **Dashboard** (`dashboard.repo.ts`),
  **Notícias/Atividades/Notificações** (feeds da home).

### 6.4. Assinatura ("pago este mês?") (`lib/billing.ts`)

O acesso é **derivado de uma data**, `tenants.paid_until`:

- Enquanto `paid_until >= agora`, a conta está ativa.
- Quando a data passa, a conta **expira sozinha** — não existe nenhum robô/cron
  virando um interruptor. O simples fato de "hoje" ter passado da data já basta.
- Creditar meses só empurra a data para frente.

Isso é elegante porque **menos peças móveis = menos coisa para quebrar**.

### 6.5. Administração da plataforma (`routes/admin/` + `admin.repo.ts`)

O **dono da plataforma** (você) tem rotas próprias para provisionar contas
manualmente: criar tenant + primeiro login, adicionar logins, creditar meses e
definir o **ramo** da empresa. Também há o **painel financeiro**
(`platform-analytics.repo.ts`): receita, lucro, inadimplência e "quais ramos mais
usam a plataforma".

Essas operações **atravessam tenants** (criar uma conta acontece _fora_ de
qualquer contexto de tenant), então usam **funções `SECURITY DEFINER`** no banco
(explicado em §7).

---

## 7. Segurança em camadas (defesa em profundidade)

A ideia central: **não depender de uma única proteção**. Se uma falhar, outra
segura. Camadas deste projeto:

1. **RLS por tenant** — o banco recusa linhas de outro tenant (§3.3).
2. **Role sem privilégios** — a API conecta no banco como `whitelabel_app`, uma
   role que **não é dona das tabelas**, não pode `DROP`, não pode burlar o RLS.
   Mesmo uma invasão esbarra no que ela _não pode_ fazer. (`db/pool.ts`,
   `0002_security.sql`.)
3. **Tudo parametrizado** — nenhum dado do usuário entra "colado" no SQL → sem
   SQL Injection.
4. **Validação na borda (zod)** + **CHECKs no banco** — o mesmo limite conferido
   duas vezes (defesa em profundidade).
5. **Senhas com bcrypt** + **rate-limit no login**.
6. **Funções `SECURITY DEFINER` estreitas** — para operações que _precisam_
   atravessar tenants (admin), em vez de dar poder amplo à role, criamos funções
   específicas que rodam com privilégio elevado **e revalidam** "você é admin
   mesmo?" antes de agir. Poder cirúrgico, não uma chave-mestra.
7. **Revogação imediata** (`loadCurrentUser`) — como o JWT vale 7 dias, um usuário
   **excluído** poderia continuar entrando até o token vencer. Para evitar isso,
   toda requisição reconfere no banco se o usuário existe e qual o papel atual.
   Custo: uma consulta a mais por requisição — uma troca consciente de um
   pouquinho de performance por segurança.
8. **Segredos e limites** — `JWT_SECRET` obrigatório em produção (o servidor
   **recusa subir** sem ele), corpo de requisição limitado, timeouts no banco.

---

## 8. O banco de dados por dentro

- Tudo vive no schema **`app`** (um "namespace" de tabelas).
- Tabelas principais: `tenants` (as contas), `users` (logins), `products`,
  `customers`, `sales`, `expenses`, `calendars`/`calendar_events`,
  `support_tickets`, `news`/`activity_events`/`notifications`, e as do financeiro
  do dono (`billing_events`, `platform_expenses`).
- **Tipos `enum`** (ex.: categorias, tons) e **`CHECK`** (ex.: preço ≥ 0)
  garantem dados sãos mesmo que algo escape da validação da API.
- **Transações**: `withTenant`/`withTransaction` (`db/tenant-context.ts`)
  garantem **atomicidade** — um bloco de operações vale _por inteiro_ ou é
  desfeito (ex.: criar a conta **e** registrar a cobrança juntas: se uma falha,
  nada é gravado).

Cada migration tem um comentário no topo explicando **o que** faz e **por quê** —
ler as migrations em ordem é, por si só, um bom tour pela evolução do sistema.

---

## 9. Como rodar (resumo)

```bash
# 1) criar o banco e aplicar as migrations (ver db/README.md para o passo a passo)
# 2) copiar o .env
cp .env.example .env      # ajuste JWT_SECRET, CORS_ORIGINS, DATABASE_URL
# 3) instalar e subir
npm install
npm run dev               # http://localhost:4000, com reload automático
```

Outros comandos: `npm run build` (compila), `npm start` (roda o build),
`npm run typecheck` (só confere os tipos, sem gerar arquivos).

---

## Glossário

- **Tenant**: uma empresa/cliente dentro do sistema multi-tenant.
- **Endpoint / rota**: um endereço da API (ex.: `GET /api/products`).
- **Handler**: a função que efetivamente responde a uma rota.
- **Middleware**: função na "esteira" que roda antes do handler (autenticar,
  validar, etc.).
- **JWT**: token assinado que prova quem é o usuário, sem sessão no servidor.
- **Hash**: resultado "só de ida" de embaralhar um dado (usado em senhas).
- **RLS (Row-Level Security)**: recurso do Postgres que filtra linhas por regra —
  aqui, por tenant.
- **Migration**: arquivo SQL numerado que constrói/evolui o banco em ordem.
- **Seed**: dados de exemplo inseridos para testar/demonstrar.
- **Repositório (repository)**: camada que concentra o acesso ao banco de um
  domínio.
- **CRUD**: Create, Read, Update, Delete (as 4 operações básicas sobre um dado).
- **Transação**: bloco de operações no banco que valem "tudo ou nada".
- **`SECURITY DEFINER`**: função do banco que roda com o privilégio de quem a
  criou (o dono), não de quem a chama — usada com muito cuidado e revalidação.
- **Parametrizar**: passar valores como `$1, $2` em vez de concatenar no texto do
  SQL (evita SQL Injection).
- **Status HTTP**: 200 (ok), 201 (criado), 204 (ok sem corpo), 400 (dados
  inválidos), 401 (não autenticado), 402 (pagamento necessário), 403 (sem
  permissão), 404 (não encontrado), 409 (conflito), 429 (excesso de tentativas),
  500 (erro interno).

---

_Este guia é um complemento didático. Para detalhes de operação e decisões
técnicas, veja também `README.md` (backend) e `db/README.md` (banco)._
