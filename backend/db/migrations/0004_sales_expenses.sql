-- ============================================================================
-- 0004_sales_expenses.sql — Vendas, custo/serviço nos produtos e gastos mensais
-- ----------------------------------------------------------------------------
-- Transforma os relatórios de estáticos em CALCULADOS a partir de dados reais:
--   • produtos/serviços ganham `cost` (custo) → lucro unitário = price - cost;
--   • `sales` registra vendas com data real e snapshot de preço/custo;
--   • `expenses` registra gastos mensais.
-- Com isso, reports.repo passa a agregar receita, CMV, lucro/prejuízo e gastos.
--
-- Rode como o DONO do banco (as tabelas novas precisam de RLS/policy/grants).
-- ============================================================================

set client_encoding to 'UTF8';

-- Tipo de item: produto físico (tem estoque) ou serviço.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_kind') then
    create type app.product_kind as enum ('produto', 'servico');
  end if;
end $$;

-- Custo e tipo nos produtos. Custo default 0 (a margem inicial fica = preço até
-- o usuário informar o custo). idempotente com IF NOT EXISTS.
alter table app.products
  add column if not exists cost numeric(12, 2) not null default 0 check (cost >= 0);
alter table app.products
  add column if not exists kind app.product_kind not null default 'produto';

-- ── Vendas ──────────────────────────────────────────────────────────────────
-- Snapshot de preço/custo NO MOMENTO da venda: o histórico não muda se o produto
-- for reprecificado ou removido depois. `product_id` é só uma referência fraca
-- (sem FK) — se o produto sumir, a venda continua íntegra pelo snapshot.
create table if not exists app.sales (
  id          bigint generated always as identity primary key,
  tenant_id   text           not null references app.tenants (id) on delete cascade,
  product_id  integer,
  description text           not null,
  category    text           not null,
  quantity    integer        not null check (quantity > 0),
  unit_price  numeric(12, 2) not null check (unit_price >= 0),
  unit_cost   numeric(12, 2) not null check (unit_cost >= 0),
  sold_at     date           not null,
  created_at  timestamptz    not null default now()
);
create index if not exists sales_tenant_idx on app.sales (tenant_id, sold_at);

-- ── Gastos mensais ────────────────────────────────────────────────────────────
-- `ref_month` guarda o 1º dia do mês de competência (facilita agregação por mês).
create table if not exists app.expenses (
  id          bigint         generated always as identity primary key,
  tenant_id   text           not null references app.tenants (id) on delete cascade,
  ref_month   date           not null,
  label       text           not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  created_at  timestamptz    not null default now()
);
create index if not exists expenses_tenant_idx on app.expenses (tenant_id, ref_month);

-- ── Segurança: RLS + policy + grants (tabelas novas não herdam o de 0002) ─────
alter table app.sales    enable row level security;
alter table app.expenses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='app' and tablename='sales' and policyname='tenant_isolation') then
    create policy tenant_isolation on app.sales
      using (tenant_id = app.current_tenant()) with check (tenant_id = app.current_tenant());
  end if;
  if not exists (select 1 from pg_policies where schemaname='app' and tablename='expenses' and policyname='tenant_isolation') then
    create policy tenant_isolation on app.expenses
      using (tenant_id = app.current_tenant()) with check (tenant_id = app.current_tenant());
  end if;
end $$;

grant select, insert, update, delete on app.sales, app.expenses to whitelabel_app;
-- Cobre as sequences das colunas identity criadas acima.
grant usage, select on all sequences in schema app to whitelabel_app;
