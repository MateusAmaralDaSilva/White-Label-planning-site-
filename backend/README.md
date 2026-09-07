# Backend — Plataforma Whitelabel

API HTTP da plataforma de planejamento white-label. O backend atende a autenticação, a configuração de cada tenant, os módulos de negócio, o painel administrativo e o acesso seguro ao PostgreSQL.

O frontend não acessa o banco diretamente. O caminho normal é:

```text
React/Vite → API Express → middleware de autenticação → repositório → PostgreSQL/RLS
```

Documentação relacionada:

- [GUIA.md](GUIA.md): explicação didática do backend.
- [db/README.md](db/README.md): banco, segurança, migrations e bootstrap.
- [DEPLOY.md](../DEPLOY.md): configuração de produção e Docker.
- [frontend/README.md](../frontend/README.md): integração do frontend.

## Estado atual importante

- O entrypoint real do código é [`src/index.ts`](src/index.ts), e o build produz `dist/index.js`.
- Os scripts `dev` e `start` atualmente referenciam `src/server.ts` e `dist/server.js`, arquivos que não existem neste checkout. Até esses scripts serem corrigidos, use os comandos diretos descritos abaixo.
- A API não usa mais mocks em memória. Os dados vêm do PostgreSQL por meio dos repositórios em `src/db/repositories/`.
- O seed atual é [`scripts/bootstrap.js`](scripts/bootstrap.js), executado pelo serviço `seeder` do Docker Compose. O antigo `0003_seed.sql` não está na pasta atual de migrations.
- A migration `0021_default_dashboard.sql` garante que uma conta nova receba o módulo Dashboard, quatro cards iniciais e três tarefas de onboarding. A mesma função também corrige tenants existentes sem dados de dashboard.

## Stack

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Runtime | Node.js 20 + TypeScript | Processo da API |
| HTTP | Express 4 | Rotas, CORS, JSON e health check |
| Autenticação | JWT + `jsonwebtoken` | Sessão e identidade do tenant |
| Senhas | `bcryptjs` + PostgreSQL `crypt()` | Hash na criação e verificação dentro do banco |
| Validação | Zod | Validação dos corpos recebidos pela API |
| Persistência | PostgreSQL + `pg` | Dados, funções SQL, RLS e transações |
| Segurança | RLS + roles + funções `SECURITY DEFINER` | Isolamento entre tenants e operações administrativas |

## Estrutura do backend

```text
src/
├── index.ts                 # Express, CORS, limites JSON, mounts e listen
├── config/env.ts            # Variáveis de ambiente e fail-fast
├── routes/
│   ├── auth.ts              # Login e /me
│   ├── data/                # Rotas autenticadas por tenant
│   │   ├── index.ts         # Ordem dos middlewares e composição dos domínios
│   │   └── *.routes.ts      # Produtos, clientes, agenda, vendas etc.
│   └── admin/               # Rotas do administrador de plataforma
├── middleware/
│   ├── auth.ts              # JWT, usuário atual, admin de plataforma e admin do tenant
│   ├── subscription.ts      # Bloqueio HTTP 402 quando a assinatura expira
│   └── error.ts             # 404 e conversão central de erros para JSON
├── db/
│   ├── pool.ts              # Pool PostgreSQL com a role whitelabel_app
│   ├── tenant-context.ts    # withTenant() e withTransaction()
│   └── repositories/        # Única camada normal que executa SQL de domínio
├── lib/                     # JWT, erros HTTP, billing, rate-limit e helpers
└── types/                   # Contratos compartilhados com o frontend

db/
├── migrations/              # Histórico SQL ordenado do schema
├── old migrations/          # Histórico antigo; não entra no fluxo atual
├── ER whitelabel.png        # Diagrama visual
└── ER whitelabel.pgerd      # Fonte do diagrama

scripts/
└── bootstrap.js             # Tenants, usuários e dados de demonstração
```

### Como localizar uma mudança

| Quero mudar... | Comece em... | Depois confira... |
| --- | --- | --- |
| Endpoint de um domínio | `src/routes/data/<dominio>.routes.ts` | Repositório correspondente e `src/types/` |
| Login ou sessão | `src/routes/auth.ts` | `middleware/auth.ts`, `users.repo.ts`, migration `0019` |
| Administração de contas | `src/routes/admin/` | `admin.repo.ts` e funções `admin_*` no SQL |
| Regra de acesso por tenant | `src/db/tenant-context.ts` | `middleware/auth.ts`, repositório e RLS em `0002_security.sql` |
| Consulta ou validação de domínio | `src/db/repositories/<dominio>.repo.ts` | Contrato em `src/types/<dominio>.ts` |
| Formato usado pelo frontend | `src/types/` | Alias `@contracts` em `frontend/tsconfig.json` |
| Nova tabela, coluna, função ou política | `db/migrations/` | Criar a próxima migration; nunca editar uma já aplicada |

## Variáveis de ambiente

A API lê o ambiente uma vez em [`src/config/env.ts`](src/config/env.ts) e falha no boot sem `DATABASE_URL`. Não existe atualmente um `backend/.env.example`; mantenha valores reais fora do Git.

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Conexão da aplicação com PostgreSQL usando a role `whitelabel_app`. |
| `JWT_SECRET` | Em produção | Assinatura dos tokens. Em produção, a ausência encerra o processo. |
| `NODE_ENV` | Recomendável | Use `production` no deploy. |
| `CORS_ORIGINS` | Em produção | Origens do frontend separadas por vírgula. |
| `PORT` | Não | Porta HTTP; padrão `4000`. |
| `JWT_EXPIRES_IN` | Não | Validade do token; padrão `7d`. |
| `TRUST_PROXY` | Atrás de proxy | Configura confiança em `X-Forwarded-For` para o rate-limit. |
| `DB_POOL_MAX` | Não | Máximo de conexões por instância; padrão `10`. |
| `ADMIN_TEMP_PASSWORD` | Seeder | Senha temporária usada somente por `scripts/bootstrap.js` para criar o administrador de plataforma. |

O backend deve usar a role `whitelabel_app` em runtime. O dono do banco é reservado para aplicar migrations e executar operações administrativas de banco.

## Executar localmente

Pré-requisitos: Node.js, npm, PostgreSQL e `psql` disponíveis. Primeiro crie/configure o banco seguindo [db/README.md](db/README.md).

```bash
cd backend
npm ci
```

Configure um `.env` local com pelo menos `DATABASE_URL`. Em produção, também defina `NODE_ENV`, `JWT_SECRET` e `CORS_ORIGINS` adequadamente.

Como o script `npm run dev` está apontando para um arquivo inexistente neste momento, rode o entrypoint real diretamente:

```bash
npx tsx watch src/index.ts
```

Para compilar e executar o artefato atual:

```bash
npm run build
node dist/index.js
```

Verificações disponíveis:

```bash
npm run typecheck
curl http://localhost:4000/health
```

O health check responde:

```json
{ "status": "ok" }
```

## Pipeline de uma requisição

### Login

`POST /api/auth/login` valida o corpo com Zod, aplica rate-limit por IP e chama `app.verify_credentials(email, senha)`. O hash não sai do banco. Em caso de sucesso, a API assina um JWT com usuário, tenant e papéis.

### Requisição autenticada de tenant

1. `requireAuth` valida o Bearer token.
2. `loadCurrentUser` relê o usuário, os papéis e a assinatura no banco a cada requisição.
3. `requireActiveSubscription` bloqueia dados com HTTP 402 quando a assinatura expirou; o administrador de plataforma é isento.
4. O helper do domínio obtém `tenantId` do JWT.
5. O repositório abre `withTenant()`, inicia uma transação e executa `SET LOCAL app.current_tenant`.
6. O RLS do PostgreSQL impede leitura ou escrita fora do tenant, mesmo que uma consulta esqueça um filtro explícito.

`GET /api/config` fica antes do bloqueio de assinatura para que o frontend consiga carregar billing e mostrar o paywall.

### Dashboard padrão e personalização

Ao criar uma conta pelo painel `/admin`, o banco executa `app.ensure_default_dashboard(tenant_id)` dentro do provisionamento. Isso cria, apenas quando o tenant ainda não possui dados:

- cards de Receita total, Novos clientes, Pedidos e Ticket médio;
- tarefas iniciais para cadastrar produto, registrar venda e adicionar cliente.

O dashboard pode ser alterado sem duplicar a regra padrão:

- **Tarefas do cliente:** o usuário pode criar, editar, concluir e excluir tarefas diretamente na tela `/dashboard`, usando `/api/dashboard/tasks`.
- **Cards e layout da tela:** a apresentação fica em `frontend/src/modules/dashboard/` (`StatsGrid.tsx`, `RecentActivity.tsx` e `TasksCard.tsx`); os dados dos cards ficam em `app.dashboard_stats`.
- **Novo padrão para futuras contas:** altere a função `app.ensure_default_dashboard` em uma nova migration. Nunca edite `0021` depois de aplicada.
- **Dashboard de um tenant específico:** crie uma operação administrativa explícita para editar `app.dashboard_stats`/`app.dashboard_tasks` ou aplique uma alteração SQL controlada com o contexto e as permissões corretas. Não altere o padrão global para resolver uma necessidade de apenas um cliente.

Após qualquer mudança de cards, campos ou contrato, atualize `backend/src/types/dashboard.ts`, o repositório e os componentes correspondentes, e faça build do backend e do frontend.

### Administração de plataforma

As rotas `/api/admin/*` exigem `requireAuth`, `loadCurrentUser` e `requireAdmin`. Além do middleware, as funções SQL administrativas revalidam o papel do ator. Elas podem listar/criar/editar contas, gerenciar logins, creditar meses, registrar custos e consultar analytics entre tenants.

## Endpoints

Todas as rotas abaixo, exceto `/health` e o login, exigem `Authorization: Bearer <token>` quando indicado. O tenant nunca vem de um campo escolhido pelo frontend.

| Grupo | Rotas principais | Uso |
| --- | --- | --- |
| Saúde | `GET /health` | Health check do processo. |
| Auth | `POST /api/auth/login`, `GET /api/auth/me` | Entrar e revalidar a sessão. |
| Configuração | `GET/PUT /api/config` | Marca, tema, módulos e billing do tenant. |
| Feeds | `GET /api/news`, `/api/activity`, `/api/notifications` | Home, atividades e sino. |
| Produtos/serviços | `GET/POST /api/products`, `PUT/DELETE /api/products/:id` | CRUD; `?kind=produto` ou `?kind=servico`. |
| Clientes | `GET/POST /api/customers`, `PUT/DELETE /api/customers/:id` | CRUD de clientes. |
| Vendas | `GET/POST /api/sales`, `DELETE /api/sales/:id` | Registro e histórico de vendas. |
| Agendas | `GET/POST /api/calendar/calendars`, `PUT/DELETE /api/calendar/calendars/:id` | Agendas do usuário/tenant. |
| Eventos | `GET/POST /api/calendar/events`, `PUT/DELETE /api/calendar/events/:id` | Compromissos do calendário. |
| Dashboard | `GET /api/dashboard`, CRUD `/api/dashboard/tasks` | Estatísticas e tarefas. |
| Relatórios | `GET /api/reports` | Receita, custos, lucro e rankings calculados. |
| Despesas | `POST /api/expenses`, `DELETE /api/expenses/:id` | Gastos mensais que alimentam relatórios. |
| Suporte | CRUD `/api/support/tickets` | Chamados do tenant. |
| Equipe | `GET /api/team`, `POST /api/team/users`, `DELETE /api/team/users/:id` | Logins da conta; exige admin do tenant. |
| Contas admin | CRUD `/api/admin/accounts`, usuários e `/credit` | Provisionamento e manutenção de tenants. |
| Financeiro admin | `GET /api/admin/analytics`, CRUD `/api/admin/platform-expenses` | Receita, inadimplência, custos e lucro da plataforma. |

Os contratos TypeScript de resposta e entrada ficam em [`src/types/`](src/types/). Antes de documentar um payload específico, confira o schema Zod e o repositório da rota correspondente.

## Regras de segurança

- A aplicação conecta como `whitelabel_app`, nunca como o dono do banco.
- O tenant vem do JWT assinado, não de `req.body` ou query string.
- Consultas usam parâmetros PostgreSQL; não concatene entrada do usuário em SQL.
- `withTenant()` mantém o tenant no escopo da transação com `SET LOCAL`.
- A role da aplicação não deve ler `password_hash`; a verificação ocorre em `app.verify_credentials`.
- A autorização é relida no banco por requisição para permitir revogação imediata.
- O PostgreSQL complementa Zod com RLS, constraints, enums e limites de recurso.
- O rate-limit de login é em memória e vale por instância do backend.

## Docker

O [`backend/Dockerfile`](Dockerfile) compila TypeScript e executa `node dist/index.js`. No [`docker-compose.yml`](../docker-compose.yml), o backend depende do PostgreSQL e recebe `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` e demais variáveis pelo ambiente do Compose.

O serviço `seeder` usa temporariamente a URL do superusuário para executar `scripts/bootstrap.js`; isso não deve ser confundido com a conexão normal da API, que usa `whitelabel_app`.

## Testes e diagnóstico

O repositório possui o smoke test manual [`tests/login-smoke.ps1`](../tests/login-smoke.ps1). Ele testa login válido e rejeição de senha inválida contra contas de demonstração; não substitui uma suíte automatizada de unidade ou integração.

Para investigar uma falha:

1. Confira PostgreSQL, migrations e `DATABASE_URL`.
2. Confira `GET /health`.
3. Confira CORS e a URL gravada no frontend.
4. Teste `POST /api/auth/login`.
5. Se o login funcionar mas a tela estiver vazia, inspecione `GET /api/config`, billing, módulos e os logs do repositório/RLS.

## Mudanças que exigem cuidado

| Alteração | Ação necessária |
| --- | --- |
| Rota ou regra sem schema novo | Alterar rota/repositório e rodar build/typecheck. |
| Tipo compartilhado | Alterar `src/types/` e verificar build do backend e frontend. |
| Schema, função, RLS ou índice | Criar migration nova, aplicar como dono, depois recompilar/reiniciar. |
| Variável do backend | Atualizar ambiente e reiniciar; rebuild só se a imagem/configuração de build mudar. |
| URL da API do frontend | Alterar `VITE_API_URL` antes do build do frontend. |

Nunca edite uma migration já aplicada. A ordem do schema é parte do contrato operacional.
