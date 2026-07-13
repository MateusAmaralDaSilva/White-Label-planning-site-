# Banco de dados (PostgreSQL)

Camada de persistência da plataforma whitelabel. Materializa no banco o modelo
que hoje vive em `src/types/index.ts` e nos mocks de `src/data/*.ts`, com o
isolamento por tenant deixando de ser uma convenção do código e passando a ser
**imposto pelo próprio banco**.

> As migrations são só o **código** do banco. Nada aqui cria/roda um servidor —
> aplique quando quiser (seção "Como aplicar").

## Arquivos

| Arquivo | O que faz |
| ------- | --------- |
| `migrations/0001_schema.sql` | Schema `app`, tipos enum, tabelas, índices, gatilhos, funções (`current_tenant`, `find_user_for_auth`). |
| `migrations/0002_security.sql` | Role `whitelabel_app` (menor privilégio), grants, **RLS** por tenant, limites de recurso. |
| `migrations/0003_seed.sql` | Dados de demonstração idênticos aos mocks (opcional). |
| `migrations/0004_sales_expenses.sql` | Custo/tipo (`produto`/`servico`) nos produtos, tabelas `sales` e `expenses` (com RLS/grants) — base dos relatórios calculados. |
| `migrations/0005_customer_responsible_sale_email.sql` | Colunas opcionais `customers.responsible` e `sales.buyer_email`. |
| `migrations/0006_billing_admin.sql` | Assinatura por tenant (`tenants.paid_until`/`plan`), administrador de plataforma (`users.is_platform_admin`), funções `SECURITY DEFINER` `admin_*` e seed do admin. |
| `migrations/0007_fix_find_user_for_auth.sql` | Recria `find_user_for_auth` (a 0006 falhava ao alterar o retorno via CREATE OR REPLACE) e corrige os acentos do tenant `platform`. Necessária para bancos que aplicaram a 0006 antes desta correção. |
| `migrations/0008_brand_logo.sql` | Logo por conta (`tenants.brand_logo`, data URI), função `admin_update_account` (editar marca) e `admin_create_account`/`admin_list_accounts` recriadas com a logo. |
| `migrations/0009_admin_list_users.sql` | Função `admin_list_users` para o painel listar os logins de cada conta. |
| `migrations/0010_calendars.sql` | Múltiplas agendas por conta (`app.calendars`, compartilhadas ou privadas) + `calendar_events.calendar_id`; visibilidade privada por usuário. |
| `migrations/0011_tenant_admin_seats.sql` | Admin do tenant (`users.is_tenant_admin`) para gerenciar os logins da conta + limite de usuários (`tenants.max_users`). Recria `find_user_for_auth`/`admin_*`. |
| `migrations/0012_admin_set_tenant_admin.sql` | Função `admin_set_tenant_admin` (o admin de plataforma promove/rebaixa o admin de cada conta) e `admin_list_users` passa a devolver `is_tenant_admin`. |
| `migrations/0013_platform_billing.sql` | Financeiro da plataforma: ledger de cobranças (`app.billing_events`, valor snapshot) + custos mensais (`app.platform_expenses`) e funções `SECURITY DEFINER` (`admin_record_billing_event`, `admin_revenue_by_month`/`_by_tenant`, `admin_*_platform_expense`). Base do painel financeiro do admin (receita, lucro, inadimplência). |
| `migrations/0014_perf_indexes.sql` | Índice na FK `calendars.owner_user_id` (evita seq scan ao apagar usuário / filtrar agenda privada). |
| `migrations/0015_temporal_timestamps.sql` | Tempo real (`occurred_at timestamptz`) no lugar dos rótulos estáticos (`*_label`) em `activity_events`/`notifications`/`support_tickets`; `news` passa a derivar a data de `created_at`. Ordenação por tempo (índices `*_tenant_time_idx`) e rótulos calculados na leitura (backend), sem congelar. |
| `migrations/0016_tenant_industry.sql` | Ramo (setor) por conta (`tenants.industry`). Funções `admin_*` (create/update/list) recriadas para conhecê-lo. Base da distribuição "quais ramos mais usam" no painel financeiro. |
| `migrations/0017_industry_freeform.sql` | Ramo vira **texto livre** (sem lista fixa a sincronizar): o /admin sugere os ramos já usados por outras contas (`distinct`). Sem mudança de schema — só normaliza os valores demo da 0016. |
| `migrations/0018_slim_find_user_for_auth.sql` | Enxuga `find_user_for_auth`: sai `paid_until`/`plan` do retorno (e o JOIN a `tenants`), que não são mais usados no login — a assinatura é relida por requisição em `getCurrentUser`. |
| `migrations/0019_verify_credentials.sql` | **Verificação de senha no banco.** Troca `find_user_for_auth` (que devolvia o `password_hash`) por `app.verify_credentials(email, senha)`, que compara com `crypt()` e devolve o usuário **sem** hash (timing-safe). Remove a função antiga e tira o `SELECT` da coluna `password_hash` da role da app. |

## Modelo de segurança

O pedido central: **impedir ataques ao banco, principalmente vindos do frontend.**
O front nunca fala com o banco — fala com a API — então "chamadas do frontend"
significa: nenhuma entrada que chega pela API pode injetar SQL nem cruzar a
fronteira entre tenants. Defesa em camadas:

1. **Isolamento por tenant via RLS.** Toda tabela de negócio tem `tenant_id` e
   uma política `USING (tenant_id = app.current_tenant())`. A aplicação declara
   o tenant por transação com `SET LOCAL app.current_tenant = <tenantId do JWT>`
   (ver `src/db/tenant-context.ts`). Uma query que esqueça o `WHERE tenant_id`
   **não vaza** outro tenant — o banco recusa as linhas fora do contexto. E o
   tenant vem sempre do **JWT assinado**, nunca de um campo escolhido pelo
   cliente.

2. **Role da aplicação sem privilégios.** A API conecta como `whitelabel_app`:
   `NOSUPERUSER`, `NOBYPASSRLS`, sem DDL, só `SELECT/INSERT/UPDATE/DELETE` no
   schema `app`. Mesmo uma injeção bem-sucedida esbarra no que a role não pode
   fazer (sem `DROP`, sem ler o `public`, sem criar objetos). `NOBYPASSRLS` é o
   que garante que o RLS **sempre** se aplique a ela.

3. **Consultas 100% parametrizadas.** `withTenant` e os repositórios só aceitam
   query com placeholders (`$1, $2, ...`); nenhuma entrada do usuário é
   concatenada em texto SQL. Até o `tenantId` do `SET` vai como parâmetro.

4. **Validação no banco (defesa em profundidade).** Tipos `enum` para tons,
   categorias e `icon_key`; `CHECK` para valores monetários não-negativos e para
   cores em formato hex. Mesmo que algo escape do `zod` na borda da API, o banco
   rejeita.

5. **Limites de recurso.** `statement_timeout` e
   `idle_in_transaction_session_timeout` na role cortam consultas caras e
   transações penduradas (mitiga DoS). O pool (`src/db/pool.ts`) limita conexões.

### Por que não `FORCE ROW LEVEL SECURITY`?

A role da aplicação não é dona das tabelas e não tem `BYPASSRLS`, então o RLS já
se aplica a ela em runtime. Deixamos o RLS sem `FORCE` para que a função
`SECURITY DEFINER` de autenticação (`verify_credentials`, que roda como o dono)
consiga achar o usuário por e-mail **antes** de existir um contexto de tenant —
o login precede a descoberta do tenant. Em produção a API nunca conecta como o
dono.

## Como aplicar

Rode as migrations como o **dono do banco** (não como `whitelabel_app`):

```bash
createdb whitelabel

psql -d whitelabel -f db/migrations/0001_schema.sql
psql -d whitelabel -f db/migrations/0002_security.sql
psql -d whitelabel -f db/migrations/0003_seed.sql   # opcional (dados de demo)
psql -d whitelabel -f db/migrations/0004_sales_expenses.sql
psql -d whitelabel -f db/migrations/0005_customer_responsible_sale_email.sql
psql -d whitelabel -f db/migrations/0006_billing_admin.sql
psql -d whitelabel -f db/migrations/0007_fix_find_user_for_auth.sql
psql -d whitelabel -f db/migrations/0008_brand_logo.sql
psql -d whitelabel -f db/migrations/0009_admin_list_users.sql
psql -d whitelabel -f db/migrations/0010_calendars.sql
psql -d whitelabel -f db/migrations/0011_tenant_admin_seats.sql
psql -d whitelabel -f db/migrations/0012_admin_set_tenant_admin.sql
psql -d whitelabel -f db/migrations/0013_platform_billing.sql
psql -d whitelabel -f db/migrations/0014_perf_indexes.sql
psql -d whitelabel -f db/migrations/0015_temporal_timestamps.sql
psql -d whitelabel -f db/migrations/0016_tenant_industry.sql
psql -d whitelabel -f db/migrations/0017_industry_freeform.sql
psql -d whitelabel -f db/migrations/0018_slim_find_user_for_auth.sql
psql -d whitelabel -f db/migrations/0019_verify_credentials.sql
```

Depois, no `0002`, troque a senha placeholder da role por um segredo forte e
aponte `DATABASE_URL` (no `.env`) para a role `whitelabel_app`.

Credenciais de teste do seed (iguais às de `src/data/users.ts`):

```
admin@acme.com     / senha123   (tenant: acme)
maria@clinica.com  / senha123   (tenant: clinica)
```

## Integração com a API (concluída)

A API não usa mais mocks — os antigos `src/data/*.ts` foram removidos e todas as
rotas leem do PostgreSQL. As peças:

- `src/db/pool.ts` — pool `pg` conectando como `whitelabel_app`.
- `src/db/tenant-context.ts` — `withTenant(tenantId, fn)`: abre a transação, seta
  `app.current_tenant` e entrega uma função de query parametrizada.
- `src/db/repositories/users.repo.ts` — autenticação (via `verify_credentials`, que
  compara a senha no banco e nunca devolve o hash).
- `src/db/repositories/*.repo.ts` — um repositório por domínio (tenants, news,
  activity, notifications, products, customers, calendar, reports, dashboard,
  support), com as mesmas assinaturas que as rotas já consumiam.

Nas rotas de dados, o `tenantId` vem de `req.auth!.tenantId` (o JWT) — é ele que
alimenta o `withTenant`, fechando o ciclo: token → contexto → RLS. A API exige
`DATABASE_URL` no boot (falha rápida se ausente).

### Como subir (local)

```bash
# 1. criar o banco e aplicar as migrations (como dono do banco)
createdb whitelabel
psql -d whitelabel -f db/migrations/0001_schema.sql
psql -d whitelabel -f db/migrations/0002_security.sql
psql -d whitelabel -f db/migrations/0003_seed.sql   # opcional (dados de demo)
psql -d whitelabel -f db/migrations/0004_sales_expenses.sql
psql -d whitelabel -f db/migrations/0005_customer_responsible_sale_email.sql
psql -d whitelabel -f db/migrations/0006_billing_admin.sql
psql -d whitelabel -f db/migrations/0007_fix_find_user_for_auth.sql
psql -d whitelabel -f db/migrations/0008_brand_logo.sql
psql -d whitelabel -f db/migrations/0009_admin_list_users.sql
psql -d whitelabel -f db/migrations/0010_calendars.sql
psql -d whitelabel -f db/migrations/0011_tenant_admin_seats.sql
psql -d whitelabel -f db/migrations/0012_admin_set_tenant_admin.sql
psql -d whitelabel -f db/migrations/0013_platform_billing.sql
psql -d whitelabel -f db/migrations/0014_perf_indexes.sql
psql -d whitelabel -f db/migrations/0015_temporal_timestamps.sql
psql -d whitelabel -f db/migrations/0016_tenant_industry.sql
psql -d whitelabel -f db/migrations/0017_industry_freeform.sql
psql -d whitelabel -f db/migrations/0018_slim_find_user_for_auth.sql
psql -d whitelabel -f db/migrations/0019_verify_credentials.sql

# 2. apontar DATABASE_URL (no .env) para a role whitelabel_app e subir a API
npm install
npm run dev
```

## Assinatura por tenant e administrador de plataforma (0006)

Duas capacidades adicionadas em `0006_billing_admin.sql`, mantendo o modelo de
segurança (menor privilégio + RLS + funções `SECURITY DEFINER` estreitas):

### Assinatura ("pago esse mês")

- Cada tenant tem `paid_until timestamptz`. O acesso é **derivado**: enquanto
  `paid_until >= now()` a conta está ativa; ao passar do prazo ela **expira
  sozinha** — sem job/cron. Creditar 6 ou 12 meses só estende a data (soma sobre
  o saldo restante).
- A API bloqueia o acesso aos dados com **HTTP 402** quando a assinatura expira
  (`middleware/subscription.ts`), exceto para o administrador de plataforma. O
  `GET /api/config` fica de fora do bloqueio de propósito, para o frontend ler o
  `billing` e mostrar a tela de renovação. O sino injeta um aviso automático
  quando faltam ≤7 dias (`repositories/notifications.repo.ts`).

### Administrador de plataforma

- Usuário com `is_platform_admin = true`. Como não há pagamento automático, ele
  **provisiona contas manualmente**: cria tenant + primeiro login, adiciona
  logins a um tenant existente e credita meses (rotas `/api/admin/*`, atrás de
  `requireAdmin`).
- **Dupla proteção**: o backend exige o flag `isPlatformAdmin` (assinado no JWT
  pelo servidor a partir do banco, logo não forjável) **e** cada função
  `app.admin_*` revalida `is_platform_admin(actor_id)` antes de qualquer escrita
  (SQLSTATE 42501 se não for admin). O hash da senha é gerado no backend
  (bcrypt custo 12); o banco nunca vê a senha em claro.

### ⚠️ Troque a senha do admin (placeholder do seed)

O seed cria o admin `silvaamaralmateus@gmail.com` (tenant técnico `platform`) com
uma senha **placeholder** que DEVE ser trocada antes de qualquer uso real:

```sql
-- rode como o DONO do banco
-- IMPORTANTE: qualifique com `public.` — o pgcrypto vive no schema `public`
-- (0001), mas o search_path da role da app e das funções não o inclui, então
-- `crypt`/`gen_salt` sem qualificar dão "função não existe".
update app.users
   set password_hash = public.crypt('SUA-SENHA-FORTE', public.gen_salt('bf', 12))
 where email = 'silvaamaralmateus@gmail.com';
```

Também funciona pela role `whitelabel_app` (ela mantém `UPDATE` em `app.users`; o
0019 revogou só o `SELECT` da coluna `password_hash`). Nesse caso, ative o
contexto de tenant antes — a role tem `NOBYPASSRLS`, então o RLS esconde a linha
sem ele:

```sql
begin;
set local app.current_tenant = 'platform';  -- tenant do usuário alvo
update app.users
   set password_hash = public.crypt('SUA-SENHA-FORTE', public.gen_salt('bf', 12))
 where email = 'silvaamaralmateus@gmail.com';
commit;
```

Para promover outro usuário a admin (ou revogar):

```sql
update app.users set is_platform_admin = true  where email = 'fulano@empresa.com';
update app.users set is_platform_admin = false where email = 'fulano@empresa.com';
```

## Dívidas técnicas / TODO (escala, segurança e custo)

Revisão do banco com foco em escalabilidade, segurança e baixo custo. Os itens
concretos e de baixo risco já foram aplicados; o restante fica registrado aqui
como próximo passo — nenhum é bloqueante hoje.

### ✅ Feitos

- **Filtro de período indexável (relatórios).** `reports.repo.ts` filtrava por
  `to_char(sold_at,'YYYY-MM') between ...`, o que envolvia a coluna numa função e
  impedia o índice `sales_tenant_idx (tenant_id, sold_at)` de podar o período —
  cada relatório varria todas as vendas do tenant. Agora usa bounds de data reais
  (`sold_at >= $lo AND sold_at < $hi`), com range scan no índice. Mesmo tratamento
  em `expenses.ref_month`.
- **Dinheiro somado em `NUMERIC` (relatórios).** As agregações não são mais
  convertidas para `float8` dentro do SQL; a soma é exata em `numeric` e a
  conversão para número acontece uma única vez na borda (helper `money()`,
  arredondado a centavos).
- **Índice na FK `calendars.owner_user_id`** (`0014_perf_indexes.sql`) — evita
  sequential scan ao apagar um usuário (cascade) e ao filtrar agenda privada.
- **[Escala] Tempo real no lugar de rótulos estáticos** (`0015_temporal_timestamps.sql`).
  `activity_events`, `notifications` e `support_tickets` guardavam o tempo como texto
  de exibição ("há 5 min") ordenado por `sort_order` — o que **congelava** o tempo e
  bloqueava ordenação/analytics por tempo real. Agora têm `occurred_at timestamptz`
  (com índice `*_tenant_time_idx`), ordenam por ele e o backend **calcula o rótulo na
  leitura** (`src/lib/relative-time.ts`), então não congela mais. `news` passou a
  derivar a data de `created_at`. O **contrato da API não mudou** (segue mandando
  string em `time`/`date`); só a origem virou um instante real. Fuso fixado em BRT no
  formatador (independe do fuso do servidor).
- **[Infra/custo] Pronto para pooler / escala horizontal.** O contexto de tenant
  usa `SET LOCAL` (transaction-scoped), então o design já é compatível com
  **PgBouncer em modo transaction** — dá para colocá-lo na frente sem reescrever
  nada. O tamanho do pool por instância virou ajustável por ambiente
  (`DB_POOL_MAX`, ver `src/db/pool.ts` e `.env.example`) para controlar N
  instâncias × max no Postgres. Só falta a etapa **operacional** (subir o
  PgBouncer) quando escalar — não há mais nada a mudar no código.
- **[Segurança] Hash de senha nunca sai do banco (`0019_verify_credentials.sql`).**
  Antes, `find_user_for_auth` (SECURITY DEFINER, não escopável por tenant — o login
  precede o tenant) DEVOLVIA o `password_hash` para o Node comparar; quem tivesse a
  role da app (ou um SQLi) podia puxar o hash de **qualquer** usuário. Agora a
  comparação acontece **no banco**: `app.verify_credentials(email, senha)` usa
  `crypt()` e devolve só o usuário público (sem hash), rodando um `crypt()` mesmo em
  e-mail inexistente para não vazar existência por tempo (timing-safe). A função
  antiga foi removida e a role da app perdeu o `SELECT` da coluna `password_hash` —
  então nem função, nem SELECT direto, nem SQLi no contexto da app lê o hash. O
  hashing na criação segue no Node (bcryptjs custo 12; formato `$2` compatível com
  `crypt()`, sem reprocessar). O rate-limit por IP (2026-07-12) continua como camada
  adicional contra brute force.

### ⏳ Pendentes

- **[Custo/tamanho] PKs `text` com UUID vs `uuid` nativo.** Chaves como
  `gen_random_uuid()::text` ocupam ~37 bytes contra 16 do tipo `uuid`, deixando
  índices e FKs maiores. Foi escolha consciente (o contrato da API devolve
  string). Reavaliar só se o volume crescer muito; exige migração de tipo +
  ajuste do serializador.
