-- ============================================================================
-- 0013_platform_billing.sql — Financeiro da plataforma (receita, lucro, custos)
-- ----------------------------------------------------------------------------
-- Dá ao ADMINISTRADOR DE PLATAFORMA o que hoje falta para enxergar o próprio
-- negócio (não o do cliente): quanto entra por mês, quanto gasta, o lucro e a
-- inadimplência. Mantém o modelo de segurança de 0006 (menor privilégio + RLS +
-- funções `SECURITY DEFINER` estreitas, cada uma revalidando o papel do ator).
--
-- Duas capacidades novas:
--
--   1. LEDGER DE COBRANÇAS (`app.billing_events`). Toda vez que o admin credita
--      meses a uma conta (criar conta ou renovar), fica registrado UM evento com
--      o VALOR COBRADO daquele momento (snapshot). Igual ao snapshot de preço/custo
--      das vendas: se o preço do plano mudar depois, os meses passados NÃO são
--      reescritos. A receita mês a mês é a soma desses eventos por mês.
--
--   2. CUSTOS DA PLATAFORMA (`app.platform_expenses`). Gastos mensais do dono da
--      plataforma (servidor, ferramentas, etc.), espelhando os `app.expenses` que
--      o cliente já tem nos Relatórios. Lucro do mês = receita − custos.
--
-- ----------------------------------------------------------------------------
-- SEGURANÇA (leia antes de mexer)
-- ----------------------------------------------------------------------------
-- Estas tabelas são GLOBAIS da plataforma (não pertencem a nenhum tenant), então
-- o RLS por tenant de 0002 não se aplica a elas. Em vez de um WHERE tenant, o
-- acesso é feito SÓ por funções `SECURITY DEFINER` que revalidam
-- `app.is_platform_admin(actor)` — o mesmo padrão das funções admin_* de 0006.
-- Ligamos RLS SEM policy nas duas tabelas: assim, mesmo que a role da aplicação
-- receba um SELECT por engano, o banco não devolve nada por acesso direto; só as
-- funções (que rodam como o dono, fora do RLS) leem/escrevem. A role recebe só
-- EXECUTE nas funções — nunca DML direto nem posse das funções.
--
-- Rode como o DONO do banco (as SECURITY DEFINER e os grants dependem disso).
-- ============================================================================

set client_encoding to 'UTF8';

-- ── Ledger de cobranças ───────────────────────────────────────────────────────
-- `amount` é o valor cobrado naquele momento (snapshot), em BRL. `months`/`plan`
-- são informativos. `charged_at` é a data da cobrança (base da agregação por mês).
create table if not exists app.billing_events (
  id          bigint         generated always as identity primary key,
  tenant_id   text           not null references app.tenants (id) on delete cascade,
  plan        text,
  months      integer        not null check (months > 0),
  amount      numeric(12, 2) not null check (amount >= 0),
  charged_at  timestamptz    not null default now(),
  created_at  timestamptz    not null default now()
);
create index if not exists billing_events_charged_idx on app.billing_events (charged_at);
create index if not exists billing_events_tenant_idx   on app.billing_events (tenant_id);

-- ── Custos mensais da plataforma ──────────────────────────────────────────────
-- `ref_month` guarda o 1º dia do mês de competência (igual a app.expenses).
create table if not exists app.platform_expenses (
  id          bigint         generated always as identity primary key,
  ref_month   date           not null,
  label       text           not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  created_at  timestamptz    not null default now()
);
create index if not exists platform_expenses_month_idx on app.platform_expenses (ref_month);

-- RLS ligado SEM policy: bloqueia qualquer acesso direto da role da aplicação.
-- Todo acesso passa pelas funções SECURITY DEFINER abaixo (rodam como o dono).
alter table app.billing_events    enable row level security;
alter table app.platform_expenses enable row level security;

-- ============================================================================
-- app.admin_record_billing_event — registra UMA cobrança (snapshot do valor)
-- ----------------------------------------------------------------------------
-- Chamada pelo backend logo após creditar meses (criar conta ou renovar). O
-- `p_amount` chega pronto do backend (preço do plano naquele momento), então o
-- histórico não muda se o preço for reajustado depois.
-- ============================================================================
create or replace function app.admin_record_billing_event(
  p_actor_id   text,
  p_tenant_id  text,
  p_plan       text,
  p_months     integer,
  p_amount     numeric,
  p_charged_at timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
declare
  v_id bigint;
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  if p_months is null or p_months <= 0 then
    raise exception 'meses deve ser um inteiro positivo' using errcode = 'check_violation';
  end if;

  insert into app.billing_events (tenant_id, plan, months, amount, charged_at)
  values (p_tenant_id, p_plan, p_months, coalesce(p_amount, 0), coalesce(p_charged_at, now()))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function app.admin_record_billing_event is
  'Registra uma cobrança (snapshot do valor) no ledger. Exige admin de plataforma.';

-- ============================================================================
-- app.admin_revenue_by_month — receita agregada por mês (todas as contas)
-- ----------------------------------------------------------------------------
-- `ym` no formato 'YYYY-MM'; `revenue` soma dos valores cobrados no mês; `events`
-- quantas cobranças houve. Base do gráfico de receita/lucro do painel financeiro.
-- ============================================================================
create or replace function app.admin_revenue_by_month(p_actor_id text)
returns table (ym text, revenue numeric, events bigint)
language plpgsql
stable
security definer
set search_path = app, pg_catalog
as $$
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  return query
    select to_char(b.charged_at, 'YYYY-MM') as ym,
           sum(b.amount)::numeric           as revenue,
           count(*)                         as events
    from app.billing_events b
    group by 1
    order by 1;
end;
$$;

comment on function app.admin_revenue_by_month is
  'Receita da plataforma agregada por mês (soma dos eventos de cobrança). Exige admin de plataforma.';

-- ============================================================================
-- app.admin_revenue_by_tenant — receita total por conta (ranking "top contas")
-- ============================================================================
create or replace function app.admin_revenue_by_tenant(p_actor_id text)
returns table (tenant_id text, brand_name text, total numeric, events bigint)
language plpgsql
stable
security definer
set search_path = app, pg_catalog
as $$
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  return query
    select t.id, t.brand_name, coalesce(sum(b.amount), 0)::numeric as total, count(b.id) as events
    from app.tenants t
    left join app.billing_events b on b.tenant_id = t.id
    where t.id <> 'platform'
    group by t.id, t.brand_name
    having coalesce(sum(b.amount), 0) > 0
    order by total desc;
end;
$$;

comment on function app.admin_revenue_by_tenant is
  'Receita total acumulada por conta (para o ranking de melhores contas). Exige admin de plataforma.';

-- ============================================================================
-- app.admin_platform_expenses — lista os custos mensais da plataforma
-- ============================================================================
create or replace function app.admin_platform_expenses(p_actor_id text)
returns table (id bigint, ref_month date, label text, amount numeric)
language plpgsql
stable
security definer
set search_path = app, pg_catalog
as $$
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  return query
    select e.id, e.ref_month, e.label, e.amount
    from app.platform_expenses e
    order by e.ref_month desc, e.id desc;
end;
$$;

comment on function app.admin_platform_expenses is
  'Lista os custos mensais da plataforma. Exige admin de plataforma.';

-- ============================================================================
-- app.admin_add_platform_expense / app.admin_delete_platform_expense
-- ============================================================================
create or replace function app.admin_add_platform_expense(
  p_actor_id  text,
  p_ref_month date,
  p_label     text,
  p_amount    numeric
)
returns bigint
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
declare
  v_id bigint;
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'valor inválido' using errcode = 'check_violation';
  end if;

  insert into app.platform_expenses (ref_month, label, amount)
  values (date_trunc('month', p_ref_month)::date, p_label, p_amount)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function app.admin_add_platform_expense is
  'Cadastra um custo mensal da plataforma. Exige admin de plataforma.';

create or replace function app.admin_delete_platform_expense(
  p_actor_id text,
  p_id       bigint
)
returns bigint
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
declare
  v_id bigint;
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  delete from app.platform_expenses where id = p_id returning id into v_id;
  return v_id; -- null se não existia (o backend traduz para 404)
end;
$$;

comment on function app.admin_delete_platform_expense is
  'Remove um custo mensal da plataforma. Exige admin de plataforma.';

-- ── Grants: só a role da aplicação EXECUTA (nunca DML direto nas tabelas) ──────
grant execute on function app.admin_record_billing_event(text, text, text, integer, numeric, timestamptz) to whitelabel_app;
grant execute on function app.admin_revenue_by_month(text)                                                 to whitelabel_app;
grant execute on function app.admin_revenue_by_tenant(text)                                                to whitelabel_app;
grant execute on function app.admin_platform_expenses(text)                                                to whitelabel_app;
grant execute on function app.admin_add_platform_expense(text, date, text, numeric)                        to whitelabel_app;
grant execute on function app.admin_delete_platform_expense(text, bigint)                                  to whitelabel_app;

-- ============================================================================
-- BACKFILL — histórico inicial aproximado a partir das contas já existentes
-- ----------------------------------------------------------------------------
-- As cobranças passadas nunca foram registradas (o ledger nasce agora). Para o
-- gráfico não começar vazio, semeamos UM evento por conta existente, na data de
-- criação da conta, com o valor placeholder do plano contratado. É uma
-- APROXIMAÇÃO (renovações antigas não são recriadas) — daqui pra frente todo
-- crédito real entra pelo backend. Só roda se o ledger estiver vazio (idempotente
-- em reaplicações).
--
-- Preços placeholder (espelham frontend/src/config/plans.ts). Ficam aqui só para
-- o backfill; a fonte viva dos preços é o backend (admin.repo.ts → PLAN_PRICE).
-- ============================================================================
insert into app.billing_events (tenant_id, plan, months, amount, charged_at)
select t.id,
       t.plan,
       case t.plan when 'mensal' then 1 when 'semestral' then 6 when 'anual' then 12 else 1 end,
       case t.plan when 'mensal' then 149 when 'semestral' then 799 when 'anual' then 1490 else 0 end,
       t.created_at
from app.tenants t
where t.id <> 'platform'
  and t.plan is not null
  and not exists (select 1 from app.billing_events);
