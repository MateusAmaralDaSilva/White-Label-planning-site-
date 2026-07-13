# Backend — Plataforma Whitelabel

API que implementa a **estratégia 8.3.C ("Tenant via API")** descrita na
`../frontend/ARCHITECTURE.md`: após o login, o backend devolve a configuração do
tenant (marca, tema, módulos) e serve os dados de cada tela. Cada endpoint aqui
corresponde a um ponto de integração já previsto no frontend.

> 📚 **Começando agora / aprendendo?** Leia o **[GUIA.md](GUIA.md)** — uma
> explicação didática (com o "porquê") de como o backend e o banco funcionam:
> multi-tenant, JWT, RLS, middleware, migrations e o caminho de uma requisição.

## Stack

| Camada      | Tecnologia                   | Por quê                                |
| ----------- | ---------------------------- | --------------------------------------- |
| Runtime     | **Node + TypeScript**  | Mesma linguagem do frontend             |
| HTTP        | **Express**            | Minimalista e onipresente               |
| Auth        | **JWT** (jsonwebtoken) | Stateless; o`tenantId` viaja no token |
| Senhas      | **bcryptjs**           | Hash das senhas (nada em texto puro)    |
| Validação | **zod**                | Valida o corpo das requisições        |
| Dados       | **PostgreSQL** (pg)    | Isolamento por tenant imposto por RLS   |

Os dados vivem no **PostgreSQL**, no schema `app`, com isolamento por tenant
imposto pelo banco via **RLS** (Row-Level Security). Cada repositório em
`src/db/repositories/` abre uma transação, declara o tenant do JWT
(`SET LOCAL app.current_tenant`) e executa consultas parametrizadas. O schema, a
segurança e o seed estão em `db/migrations/`; ver **`db/README.md`** para como
criar o banco e aplicar as migrations.

## Rodando

```bash
npm install
cp .env.example .env      # ajuste JWT_SECRET / CORS / DATABASE_URL
# Crie o banco e aplique as migrations antes de subir — ver db/README.md.
npm run dev               # http://localhost:4000 (reload automático)
```

A API exige `DATABASE_URL` no boot (falha rápido se ausente). O passo a passo
para criar o banco, aplicar `db/migrations/*` e as credenciais de teste do seed
estão em **`db/README.md`**.

Outros comandos: `npm run build` (compila para `dist/`), `npm start` (roda o
build), `npm run typecheck`.

## Credenciais de teste

| E-mail                | Senha        | Tenant  |
| --------------------- | ------------ | ------- |
| `admin@acme.com`    | `senha123` | acme    |
| `maria@clinica.com` | `senha123` | clinica |

Cada tenant tem marca, tema e conjunto de módulos próprios — o mesmo código
serve os dois; o `tenantId` do JWT decide o que é retornado.

## Endpoints

Todas as rotas de dados exigem o header `Authorization: Bearer <token>`.
O `tenantId` é lido do token — o cliente nunca escolhe de qual tenant lê.

| Método | Rota                     | Retorno                                                                   | Integração no frontend                    |
| ------- | ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------- |
| GET     | `/health`              | `{ status }`                                                            | —                                          |
| POST    | `/api/auth/login`      | `{ token, user }`                                                       | `store/authStore.ts` → `login()`       |
| GET     | `/api/auth/me`         | `{ user }`                                                              | reidratar sessão no reload                 |
| GET     | `/api/config`          | `{ tenantId, brand, themeId, modules }`                                 | `appStore` + `themeStore` + `brand`   |
| PUT     | `/api/config`          | config atualizada                                                         | `appStore` salva módulos (ModuleManager) |
| GET     | `/api/news`            | `NewsItem[]`                                                            | `config/news.ts` → `getNews()`         |
| GET     | `/api/activity`        | `ActivityEvent[]`                                                       | `config/activity.ts` → `getActivity()` |
| GET     | `/api/notifications`   | `AppNotification[]`                                                     | `config/notifications.ts`                 |
| GET     | `/api/products`        | `Product[]` (com `cost` e `kind`; aceita `?kind=produto\|servico`) | `modules/products`, `modules/services`  |
| GET     | `/api/customers`       | `Customer[]`                                                            | `modules/customers`                       |
| GET     | `/api/sales`           | `Sale[]`                                                                | `modules/sales`                           |
| GET     | `/api/calendar/events` | `CalendarEvent[]`                                                       | `modules/calendar`                        |
| GET     | `/api/reports`         | `{ kpis, revenue, profit, categories, expenses }` (calculado)           | `modules/reports`                         |
| GET     | `/api/dashboard`       | `{ stats, tasks }`                                                      | `modules/dashboard`                       |
| GET     | `/api/support/tickets` | `Ticket[]`                                                              | `modules/support`                         |

As formas de resposta estão tipadas em `src/types/` (barril em `index.ts`) e espelham o que o
frontend já consome.

### Escrita (criar / editar / excluir)

As telas de negócio têm CRUD. Todo corpo é validado com **zod** (corpo inválido →
`400`); o `tenantId` do token entra no `WHERE`/`WITH CHECK`, então o RLS garante
que uma escrita nunca cruze a fronteira entre tenants. Recurso inexistente no
tenant → `404`.

| Método | Rota                         | Corpo                                             | Resposta         |
| ------- | ---------------------------- | ------------------------------------------------- | ---------------- |
| POST    | `/api/products`            | `{ name, category, kind, price, cost, stock }`  | `201` Product  |
| PUT     | `/api/products/:id`        | idem (substituição total)                       | `200` Product  |
| DELETE  | `/api/products/:id`        | —                                                | `204`          |
| POST    | `/api/sales`               | `{ productId, quantity, soldAt, email? }`       | `201` Sale     |
| DELETE  | `/api/sales/:id`           | —                                                | `204`          |
| POST    | `/api/expenses`            | `{ refMonth, label, amount }`                   | `201` Expense  |
| DELETE  | `/api/expenses/:id`        | —                                                | `204`          |
| POST    | `/api/customers`           | `{ name, email, phone, accent?, responsible? }` | `201` Customer |
| PUT     | `/api/customers/:id`       | idem (`accent` omitido mantém o atual)         | `200` Customer |
| DELETE  | `/api/customers/:id`       | —                                                | `204`          |
| POST    | `/api/calendar/events`     | `{ label, year, month, day, color? }`           | `201` Event    |
| PUT     | `/api/calendar/events/:id` | idem (`color` omitido mantém o atual)          | `200` Event    |
| DELETE  | `/api/calendar/events/:id` | —                                                | `204`          |
| POST    | `/api/support/tickets`     | `{ subject, customer }`                         | `201` Ticket   |
| PUT     | `/api/support/tickets/:id` | `{ subject, customer, status }`                 | `200` Ticket   |
| DELETE  | `/api/support/tickets/:id` | —                                                | `204`          |
| POST    | `/api/dashboard/tasks`     | `{ label }`                                     | `201` Task     |
| PUT     | `/api/dashboard/tasks/:id` | `{ label?, done? }` (patch; ao menos um)        | `200` Task     |
| DELETE  | `/api/dashboard/tasks/:id` | —                                                | `204`          |

Notas:

- **`month` é 0-based** (janeiro = 0), igual ao `Date` do JS e ao schema do banco.
- **Produtos/clientes** usam `id` numérico por tenant, calculado no servidor
  (não é enviado pelo cliente). **Chamados** têm `id` textual (`#083`); no
  frontend, o `#` precisa de `encodeURIComponent` na URL.
- **Chamado** nasce sempre com status `Aberto`; na edição o **tom acompanha o
  status** (`Aberto`→danger, `Em andamento`→warning, `Resolvido`→success),
  decidido no servidor.
- `price`, `stock`, valores monetários e `pct` têm `CHECK` no banco (defesa em
  profundidade) além do zod.
- **Tarefas do dashboard**: o `PUT` é um *patch* — o mesmo endpoint serve para
  editar o texto (`{ label }`) e para marcar/desmarcar (`{ done }`); campos
  omitidos não mudam.
- **Produtos e serviços** vivem na mesma tabela; `kind` (`produto`/`servico`)
  distingue os dois. Ambos têm `price` e `cost` → lucro unitário = `price - cost`.
- **Vendas** guardam um *snapshot* de preço/custo do item no momento (`soldAt` é
  data real): o cliente só envia `productId`, `quantity` e `soldAt` — o servidor
  copia preço/custo do produto, então o valor não pode ser adulterado.
- **Relatórios são calculados** a partir de vendas + gastos (receita, CMV,
  lucro/prejuízo, margem, top categorias). Nunca `404`: sem dados, retorna
  estrutura vazia para a aba renderizar.
- **Produtos × Serviços**: mesma tabela; a UI separa em duas abas via
  `GET /api/products?kind=…`. `cost`/`price` valem para os dois.
- Campos opcionais: `customers.responsible` (texto livre) e `sales.email`
  (e-mail avulso para análise) — ambos anuláveis, adicionados em `0005`.

**`PUT /api/config`** persiste a config do usuário do tenant (do token). Corpo
parcial, validado com zod — envie só o que mudou:

```jsonc
{
  "themeId": "dark",                                  // opcional
  "modules": [{ "id": "home", "enabled": true, "order": 0 }] // opcional
}
```

`brand` e `tenantId` não são editáveis. O frontend chama este endpoint
automaticamente ao ligar/desligar/reordenar módulos no ModuleManager. A
persistência é no PostgreSQL (tabela `app.modules`, por tenant).

### Duas diferenças propositais em relação aos mocks

1. **Ícones viram chaves de texto.** O backend não envia componentes React.
   Onde o mock embutia um ícone do `lucide-react` (notificações, dashboard,
   relatórios), a API envia `iconKey` (ex.: `"sale"`, `"revenue"`) e o frontend
   mapeia `iconKey → ícone`. O mesmo já valia para `type`/`category` em
   activity/news, que o frontend traduz via `ACTIVITY_TYPE`/`NEWS_CATEGORY`.
2. **Valores monetários viram números.** `price`, `spent`, `value` vêm como
   número (ex.: `79.9`) em vez de string pré-formatada. O frontend formata com
   `Intl.NumberFormat` — a função `formatBRL` já existe em `config/activity.ts`.
   (Os valores de `activity.amount` já eram números, então isto mantém a
   consistência.)

## Integração com o frontend

O frontend **já consome esta API** (não usa mais mocks). O cliente HTTP fica em
`frontend/src/lib/api.ts` (`api.get/post/put/del`), que anexa o
`Authorization: Bearer <token>` e derruba a sessão em `401`. O login
(`store/authStore.ts`) guarda o `token` via `persist` do Zustand; a leitura de
dados usa o hook `useApi` + o componente `<Async>`. A base da URL vem de
`VITE_API_URL` (padrão `http://localhost:4000`).

## Estrutura

```
src/
├── index.ts              # app Express: CORS, JSON, monta os routers, handlers de erro
├── config/
│   └── env.ts            # variáveis de ambiente (falha rápido se faltar algo crítico)
├── types/                # contratos da API, UM arquivo por domínio + barril
│   ├── index.ts          #   re-exporta tudo (export *) — ponto único de import
│   ├── common.ts         #   Tone, IconKey (primitivos compartilhados)
│   └── auth·sales·reports·products·… .ts   # um por domínio; o front importa via @contracts
├── lib/                  # utilitários sem estado (não conhecem Express nem o banco)
│   ├── jwt.ts            #   assina/verifica JWT
│   ├── http.ts           #   HttpError + helpers (401, 402, 404, 429…)
│   ├── async-handler.ts  #   captura erros de handlers async
│   ├── billing.ts        #   deriva "assinatura ativa?" de paid_until
│   └── rate-limit.ts     #   freio de força-bruta no login
├── middleware/
│   ├── auth.ts           #   requireAuth · loadCurrentUser · requireAdmin · requireTenantAdmin
│   ├── subscription.ts   #   402 quando a assinatura vence
│   └── error.ts          #   404 + handler de erro central
├── db/                   # ÚNICA camada que fala com o banco
│   ├── pool.ts           #   pool pg (conecta como a role whitelabel_app)
│   ├── tenant-context.ts #   withTenant(): transação + SET app.current_tenant; withTransaction
│   └── repositories/     #   um repositório por domínio (getX/createX/updateX/deleteX)
└── routes/               # endpoints HTTP (routers) — um sub-router por domínio
    ├── auth.ts           #   /api/auth/login, /api/auth/me
    ├── data/             #   /api/* (dados do tenant): index.ts compõe + <domínio>.routes.ts
    └── admin/            #   /api/admin/* (dono da plataforma): index.ts + accounts/analytics.routes.ts

db/migrations/            # construção do banco: schema (0001), segurança/RLS (0002), seed (0003)… (0001–0018)
```

## Distribuição de responsabilidades (pastas de `src/`)

Cada pasta de `src/` tem **uma** função no fluxo de uma requisição. De fora para
dentro, uma chamada atravessa `routes → middleware → db`, apoiada por `lib`,
`types` e `config`:

- **`routes/`** — a porta de entrada HTTP. Define os endpoints (Express Routers),
  valida o corpo (zod) e orquestra a resposta. Não contém acesso a dados: delega
  aos repositórios. Um sub-router por domínio; o `index.ts` de cada grupo aplica os
  middlewares (na ordem certa) e monta os sub-routers.
- **`middleware/`** — a "esteira" que toda requisição atravessa antes do handler:
  autenticação (`auth.ts`), bloqueio por assinatura (`subscription.ts`) e a
  tradução central de erros para JSON (`error.ts`).
- **`db/`** — a **única** camada que conversa com o PostgreSQL: `pool.ts`
  (conexões), `tenant-context.ts` (transação + isolamento por tenant via RLS) e
  `repositories/` (um arquivo por domínio, todas as queries parametrizadas).
- **`lib/`** — peças reutilizáveis e **sem estado**, usadas por várias camadas
  (JWT, HttpError, billing, rate-limit…). Não conhecem Express nem o banco.
- **`types/`** — os contratos de dados da API (o "formato" das respostas), por
  domínio. É a **fonte única** que o frontend consome via alias `@contracts`.
- **`config/`** — lê as variáveis de ambiente uma vez, com falha rápida se faltar
  algo crítico (`JWT_SECRET`, `DATABASE_URL`).
- **`index.ts`** — o ponto de entrada: cria o app Express, aplica CORS/JSON, monta
  os três grupos de rotas (`/api/auth`, `/api/admin`, `/api`) e os handlers de erro.

**1Regra de ouro:** só `db/repositories/` fala com o banco, e sempre com queries
parametrizadas — é o que fecha a porta para **SQL Injection**.

## Revisão do backend (limpeza, segurança e eficiência)

Revisão do código do backend com o mesmo espírito da do banco (ver
`db/README.md` → "Dívidas técnicas / TODO"): itens concretos e de baixo risco já
aplicados; o resto registrado como próximo passo, com o trade-off. Nada é
bloqueante hoje.

### O que está bom (manter)

- **Isolamento por tenant à prova de esquecimento.** `withTenant` abre uma
  transação e faz `SET LOCAL app.current_tenant = <tenantId do JWT>`; o RLS do
  banco filtra tudo. O `tenantId` vem **sempre** do JWT assinado, nunca do corpo.
- **Consultas 100% parametrizadas.** Nenhuma entrada do usuário é concatenada em
  SQL em nenhum repositório (nem o `tenantId` do `SET`).
- **Validação na borda com zod + tipos derivados** (`z.infer`) — validação e
  tipagem nunca divergem; os limites espelham as `CHECK` do banco.
- **Segredos tratados com cuidado.** Senhas com bcrypt custo 12 (o banco nunca vê
  a senha em claro); o hash nunca sai nas respostas (`toPublicUser`); o login usa
  comparação de tempo constante mesmo sem usuário (não vaza "e-mail existe" por
  tempo).
- **Defesa em camadas nas ações de admin de plataforma.** `requireAdmin` (flag do
  JWT) **e** as funções `app.admin_*` revalidam o papel do ator no banco.
- **Erros centralizados e async seguro** (`errorHandler` + `asyncHandler`), sem
  vazar stack para o cliente; `pool` com teto de conexões e timeouts.

### ✅ Feitos (aplicados nesta revisão)

- **[Segurança] `JWT_SECRET` falha rápido em produção.** Antes, faltando o
  segredo em produção a API só emitia um *warning* e subia com o padrão inseguro
  (qualquer um poderia forjar um token de admin). Agora `config/env.ts` faz
  `process.exit(1)`, igual ao `DATABASE_URL`.
- **[Segurança/custo] Limite de corpo escopado.** O teto de ~2MB (necessário só
  para a logo em data URI) valia para toda a API, inclusive o `/login` não
  autenticado. Agora os 2MB ficam só em `/api/admin`; o restante usa 256KB
  (`index.ts`), reduzindo a superfície de DoS por payload gigante.
- **[Eficiência] Módulos gravados num só INSERT.** `updateTenantConfig` fazia um
  `INSERT` por módulo num laço (N idas ao banco). Agora é um único
  `INSERT … SELECT unnest($2::text[], $3::boolean[], $4::int[])` — uma ida,
  texto SQL fixo, tudo parametrizado.
- **[Segurança] Rate-limit no `/api/auth/login`.** Freio de brute force por IP
  (10 tentativas / 15 min) em `lib/rate-limit.ts` (em memória, sem dependência
  nova), aplicado à rota de login. Complementa o bcrypt (encarece cada palpite) +
  comparação de tempo constante. Chaveia por IP (não por e-mail, que permitiria
  trancar a conta de uma vítima). Atrás de proxy, configure `TRUST_PROXY` para o
  `req.ip` ser o do cliente. Limitação: estado por instância — para escala
  horizontal, trocar por store compartilhado (Redis).
- **[Segurança] Revogação imediata do usuário (claims não ficam mais "presas").**
  Novo middleware `loadCurrentUser` (`middleware/auth.ts`) revalida o usuário no
  banco a **cada requisição** das rotas de dados e de admin: se o login foi
  **excluído**, responde 401 na hora; o papel (`is_*_admin`) é **relido do banco**
  e sobrescreve o do token, então **rebaixar/promover** vale já no próximo request
  (o JWT deixa de ser a fonte da verdade para autorização). Fecha a brecha em que
  um login excluído ou um admin rebaixado mantinha acesso/poder por até 7 dias.
  Custo: uma consulta indexada por requisição — trade-off consciente da revogação
  instantânea (Opção 3); em escala, evoluir para refresh tokens.
  - *Nota:* a otimização anterior que embutia `paidUntil` no JWT (para pular a
    consulta de assinatura) foi **substituída** por esta — como agora relemos o
    usuário a cada requisição, a assinatura viaja nessa **mesma** consulta única
    (existência + papel + assinatura em `getCurrentUser`), e
    `requireActiveSubscription` só lê `req.billing`, sem tocar no banco.
- **[Consistência] Ledger de cobrança agora é atômico.** `createAccount` e
  `creditMonths` rodam a mudança na conta **e** o registro no ledger na MESMA
  transação (`withTransaction`, em `db/tenant-context.ts`). Se o registro da
  cobrança falhar, a criação/renovação inteira é desfeita — sem conta sem cobrança
  (era best-effort: podia deixar a conta sem o evento no ledger).

### ⏳ Pendentes (trade-off a decidir)

- **[Robustez] Geração de `id` por tenant via `max(id)+1`.** Em produtos, clientes,
  tarefas e chamados, dois `POST` simultâneos no **mesmo** tenant podem ler o mesmo
  `max` e colidir na PK (um recebe 500). Raro (mesma conta, concorrência exata).
  Resolver com sequência por tenant ou advisory lock se a concorrência crescer.
- **[Produção] Endurecimentos gerais.** Cabeçalhos de segurança (helmet), logger
  estruturado (hoje é `console.*`) e *shutdown* gracioso (drenar o pool no
  `SIGTERM`). Nada bloqueante; endurecem para produção.
- **[Config] Trocar a senha placeholder da role `whitelabel_app`** (em
  `0002_security.sql` e no `DATABASE_URL`) por um segredo forte.

## Modularização por domínio (2026-07-12)

Sequência de refactors para deixar o código mais legível, **sem mudar
comportamento**. Tudo verificado com `tsc` + build; as rotas conferidas por
introspecção do router (mesmos método/caminho de antes):

- **Relatórios — seção "Melhores Clientes".** `reports.repo.ts` passou a agregar,
  a partir das **vendas** do período, um ranking de clientes (receita / lucro /
  nº de compras, ticket médio, última compra e "o que comprou"); vendas sem e-mail
  caem numa linha "Sem identificação". Novos contratos `CustomerRank` /
  `CustomerProduct` (em `types/reports.ts`).
- **`types/` dividido por domínio.** O antigo `types/index.ts` (~514 linhas) virou
  um arquivo por domínio (`auth.ts`, `sales.ts`, `reports.ts`, `common.ts` =
  Tone/IconKey, …) com `index.ts` como **barril** (`export *`). Todos os imports
  (do backend e o alias `@contracts` do frontend) seguem apontando para o mesmo
  `index.ts` — nada quebrou.
- **`routes/data.ts` → `routes/data/`.** Um sub-router por domínio
  (`products.routes.ts`, `calendar.routes.ts`, …) + `helpers.ts`
  (`tenant`/`uid`/`intId`) + `index.ts` (raiz de composição). A **ordem** dos
  middlewares foi preservada — em especial `GET /config` **antes** do bloqueio de
  assinatura (o front precisa ler `billing` mesmo com a conta expirada).
- **`routes/admin.ts` → `routes/admin/`.** Mesmo padrão, menor:
  `accounts.routes.ts` (contas/logins/crédito) + `analytics.routes.ts`
  (financeiro) + `helpers.ts` (`actor`/`guard`/`translatePgError`) + `index.ts`.
- **Fonte única de tipos front↔back.** O frontend deixou de redefinir interfaces
  iguais às do backend; agora importa de `@contracts` (alias →
  `backend/src/types/index.ts`). **Convenção para um tipo novo:** criar/editar o
  arquivo de domínio e, se for arquivo novo, adicionar `export *` no `index.ts`.

**Convenção de rotas** (vale para os três grupos): um sub-router por domínio em
`<domínio>.routes.ts`, um `helpers.ts` para o que é compartilhado, e um `index.ts`
que aplica os middlewares e monta os sub-routers.
