-- ============================================================================
-- 0001_schema.sql — Esquema do banco whitelabel (PostgreSQL)
-- ----------------------------------------------------------------------------
-- Materializa no banco o modelo que hoje vive em `src/types/index.ts` e nos
-- mocks de `src/data/*.ts`. Cada tabela de negócio é escopada por tenant
-- (coluna `tenant_id`) — o mesmo isolamento que `data/store.ts` faz em memória
-- ("WHERE tenant_id = $1"), só que agora imposto pelo próprio banco via RLS
-- (ver 0002_security.sql).
--
-- Convenções de contrato preservadas do backend:
--   • valores monetários como NUMERIC (o frontend formata com formatBRL);
--   • ícones como CHAVE textual (`icon_key`), nunca componentes React;
--   • tons semânticos idênticos a components/ui/tones.ts.
--
-- Rode como o DONO do banco (não como a role da aplicação): as funções
-- SECURITY DEFINER e as políticas de RLS dependem disso. Ver db/README.md.
-- ============================================================================

-- Arquivo UTF-8: força a interpretação correta mesmo se o console usar outro
-- encoding (Windows costuma usar WIN1252), evitando acentos duplo-codificados.
set client_encoding to 'UTF8';

-- Tudo vive em um schema dedicado `app`, e não no `public`. Isso permite negar
-- a criação de objetos por qualquer role no `public` (0002) e dá um namespace
-- limpo e auditável para o produto.
create schema if not exists app;

-- gen_random_uuid() para PKs textuais de novos registros.
create extension if not exists pgcrypto;
-- citext: e-mail comparado sem diferenciar maiúsculas/minúsculas, como o
-- backend faz hoje com email.toLowerCase() — mas sem depender do app lembrar.
create extension if not exists citext;

-- ── Tipos enumerados ────────────────────────────────────────────────────────
-- Espelham as uniões de string dos tipos do backend. Validar no banco é defesa
-- em profundidade: mesmo que uma escrita escape do zod, um valor fora do
-- domínio é rejeitado pelo PostgreSQL.

create type app.tone as enum
  ('accent', 'success', 'danger', 'warning', 'info', 'neutral');

create type app.news_category as enum
  ('novidade', 'atualizacao', 'aviso', 'manutencao');

create type app.activity_type as enum
  ('sale', 'appointment', 'customer', 'payment', 'support', 'product');

create type app.trend as enum ('up', 'down');

create type app.icon_key as enum
  ('sale', 'orders', 'payment', 'revenue', 'ticket', 'trend', 'customer',
   'new-customer', 'support', 'appointment', 'news', 'product', 'chart');

-- ── Gatilho de updated_at ─────────────────────────────────────────────────────
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
-- search_path fixo evita sequestro de resolução de nomes por objetos plantados
-- em outro schema (boa prática para QUALQUER função no PostgreSQL).
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- Tenants, marca, tema e módulos
-- ============================================================================

-- Um registro por tenant. Substitui o objeto TENANTS de data/tenants.ts.
create table app.tenants (
  id             text primary key,
  brand_name     text        not null,
  brand_mark     text        not null,
  brand_tagline  text        not null,
  theme_id       text        not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger tenants_touch
  before update on app.tenants
  for each row execute function app.touch_updated_at();

-- Estado de cada módulo por tenant (enabled/order). O frontend faz merge com o
-- próprio registry, então guardamos só a forma reduzida. `sort_order` porque
-- `order` é palavra reservada em SQL.
create table app.modules (
  tenant_id   text    not null references app.tenants (id) on delete cascade,
  module_id   text    not null,
  enabled     boolean not null default true,
  sort_order  integer not null check (sort_order >= 0),
  primary key (tenant_id, module_id)
);

-- ============================================================================
-- Usuários (autenticação)
-- ============================================================================
-- Substitui o mapa USERS de data/users.ts. O hash da senha nunca sai daqui a
-- não ser pela função de autenticação (ver find_user_for_auth abaixo); as rotas
-- devolvem só o "usuário público" (sem hash), como o backend já faz.
create table app.users (
  id             text        primary key default gen_random_uuid()::text,
  tenant_id      text        not null references app.tenants (id) on delete cascade,
  email          citext      not null unique,
  name           text        not null,
  password_hash  text        not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index users_tenant_idx on app.users (tenant_id);

create trigger users_touch
  before update on app.users
  for each row execute function app.touch_updated_at();

-- ============================================================================
-- Conteúdo por tenant
-- ============================================================================
-- NOTA sobre campos temporais: os mocks do backend guardam rótulos de exibição
-- ("Hoje", "há 5 min", "2h atrás", "30 jun 2026"). Para manter o contrato da
-- API byte a byte, eles são preservados como TEXT (`*_label`) e a ordenação é
-- garantida por `sort_order`. Numa evolução, viram `timestamptz` e o frontend
-- passa a formatar tempo relativo. Está isolado aqui de propósito.

-- Feed de notícias (Home). Espelha config/news.ts.
create table app.news (
  id          text              primary key default gen_random_uuid()::text,
  tenant_id   text              not null references app.tenants (id) on delete cascade,
  title       text              not null,
  body        text              not null,
  date_label  text              not null,
  category    app.news_category not null,
  pinned      boolean           not null default false,
  sort_order  integer           not null default 0,
  created_at  timestamptz       not null default now()
);

create index news_tenant_idx on app.news (tenant_id, pinned desc, sort_order);

-- Log de atividades (tela Atividades + mini-feed do Dashboard).
create table app.activity_events (
  id          text              primary key default gen_random_uuid()::text,
  tenant_id   text              not null references app.tenants (id) on delete cascade,
  type        app.activity_type not null,
  title       text              not null,
  customer    text,
  amount      numeric(12, 2) check (amount is null or amount >= 0),
  date_label  text              not null,
  time_label  text              not null,
  sort_order  integer           not null default 0
);

create index activity_tenant_idx on app.activity_events (tenant_id, sort_order);

-- Notificações do sino da topbar.
create table app.notifications (
  id           text        primary key default gen_random_uuid()::text,
  tenant_id    text        not null references app.tenants (id) on delete cascade,
  title        text        not null,
  description  text        not null,
  time_label   text        not null,
  tone         app.tone    not null,
  icon_key     app.icon_key not null,
  sort_order   integer     not null default 0
);

create index notifications_tenant_idx on app.notifications (tenant_id, sort_order);

-- ============================================================================
-- Dados de negócio (modules/*)
-- ============================================================================

-- Produtos. O `id` numérico é por tenant (contrato da API: id como número),
-- por isso a PK é composta (tenant_id, id).
create table app.products (
  tenant_id  text           not null references app.tenants (id) on delete cascade,
  id         integer        not null,
  name       text           not null,
  category   text           not null,
  price      numeric(12, 2) not null check (price >= 0),
  stock      integer        not null check (stock >= 0),
  primary key (tenant_id, id)
);

-- Clientes.
create table app.customers (
  tenant_id  text           not null references app.tenants (id) on delete cascade,
  id         integer        not null,
  name       text           not null,
  email      citext         not null,
  phone      text           not null,
  orders     integer        not null check (orders >= 0),
  spent      numeric(12, 2) not null check (spent >= 0),
  -- Cor de destaque em hex (#RGB ou #RRGGBB). Restringir o formato impede que
  -- texto arbitrário chegue a um atributo de estilo no frontend.
  accent     text           not null check (accent ~ '^#[0-9A-Fa-f]{3,8}$'),
  primary key (tenant_id, id)
);

-- Eventos do calendário. Mês 0-based como o Date do JavaScript.
create table app.calendar_events (
  id          text        primary key default gen_random_uuid()::text,
  tenant_id   text        not null references app.tenants (id) on delete cascade,
  year        integer     not null check (year between 1970 and 9999),
  month       integer     not null check (month between 0 and 11),
  day         integer     not null check (day between 1 and 31),
  label       text        not null,
  color       text        not null check (color ~ '^#[0-9A-Fa-f]{3,8}$')
);

create index calendar_tenant_idx on app.calendar_events (tenant_id, year, month);

-- Chamados de suporte. O `id` é textual e já formatado ("#082").
create table app.support_tickets (
  id          text        primary key,
  tenant_id   text        not null references app.tenants (id) on delete cascade,
  subject     text        not null,
  customer    text        not null,
  status      text        not null,
  tone        app.tone    not null,
  time_label  text        not null,
  sort_order  integer     not null default 0
);

create index support_tenant_idx on app.support_tickets (tenant_id, sort_order);

-- ── Relatórios (objeto composto: kpis[], revenue[], categories[]) ─────────────
create table app.report_kpis (
  id          bigint generated always as identity primary key,
  tenant_id   text         not null references app.tenants (id) on delete cascade,
  label       text         not null,
  value       text         not null,
  delta       text         not null,
  trend       app.trend    not null,
  tone        app.tone     not null,
  icon_key    app.icon_key not null,
  sort_order  integer      not null default 0
);
create index report_kpis_tenant_idx on app.report_kpis (tenant_id, sort_order);

create table app.revenue_points (
  id          bigint generated always as identity primary key,
  tenant_id   text           not null references app.tenants (id) on delete cascade,
  month       text           not null,
  value       numeric(14, 2) not null check (value >= 0),
  sort_order  integer        not null default 0
);
create index revenue_points_tenant_idx on app.revenue_points (tenant_id, sort_order);

create table app.category_shares (
  id          bigint generated always as identity primary key,
  tenant_id   text           not null references app.tenants (id) on delete cascade,
  name        text           not null,
  pct         integer        not null check (pct between 0 and 100),
  value       numeric(14, 2) not null check (value >= 0),
  sort_order  integer        not null default 0
);
create index category_shares_tenant_idx on app.category_shares (tenant_id, sort_order);

-- ── Dashboard (stats[] + tasks[]) ─────────────────────────────────────────────
create table app.dashboard_stats (
  id          bigint generated always as identity primary key,
  tenant_id   text         not null references app.tenants (id) on delete cascade,
  label       text         not null,
  value       text         not null,
  delta       text         not null,
  tone        app.tone     not null,
  icon_key    app.icon_key not null,
  sort_order  integer      not null default 0
);
create index dashboard_stats_tenant_idx on app.dashboard_stats (tenant_id, sort_order);

create table app.dashboard_tasks (
  id          bigint generated always as identity primary key,
  tenant_id   text        not null references app.tenants (id) on delete cascade,
  label       text        not null,
  done        boolean     not null default false,
  sort_order  integer     not null default 0
);
create index dashboard_tasks_tenant_idx on app.dashboard_tasks (tenant_id, sort_order);

-- ============================================================================
-- Contexto de tenant (base do RLS)
-- ============================================================================
-- A aplicação declara "quem sou eu" por transação com
--   SET LOCAL app.current_tenant = '<tenantId do JWT>'
-- e as políticas de RLS (0002) filtram por este valor. Como o tenant vem SEMPRE
-- do token assinado — nunca de um parâmetro escolhido pelo cliente — o front não
-- consegue ler dados de outro tenant nem "trocar" de tenant.
create or replace function app.current_tenant()
returns text
language sql
stable
set search_path = pg_catalog
as $$
  -- `true` = missing_ok: retorna NULL se o contexto não foi setado.
  -- NULL faz toda comparação `tenant_id = NULL` ser falsa → nega por padrão.
  select nullif(current_setting('app.current_tenant', true), '');
$$;

-- ============================================================================
-- Autenticação: busca de usuário anterior ao contexto de tenant
-- ============================================================================
-- O login acontece ANTES de sabermos o tenant (ele vem do próprio usuário).
-- Como o RLS na tabela `users` esconderia todas as linhas sem um tenant setado,
-- expomos UMA função estreita, SECURITY DEFINER, que faz só a busca por e-mail
-- para autenticação. Ela roda com os privilégios do dono (que não está sujeito
-- ao RLS) e devolve exatamente os campos necessários — incluindo o hash — e
-- nada além disso. É o único caminho para o hash sair da tabela.
create or replace function app.find_user_for_auth(p_email citext)
returns table (
  id             text,
  tenant_id      text,
  email          citext,
  name           text,
  password_hash  text
)
language sql
stable
security definer
set search_path = app, pg_catalog
as $$
  select id, tenant_id, email, name, password_hash
  from app.users
  where email = p_email;
$$;

comment on function app.find_user_for_auth(citext) is
  'Busca de usuário para login (pré-contexto de tenant). Único ponto que expõe o password_hash.';
