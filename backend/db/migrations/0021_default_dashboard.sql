-- ============================================================================
-- 0021_default_dashboard.sql — Dashboard padrão para novos tenants
-- ----------------------------------------------------------------------------
-- A criação de conta já habilitava o módulo `dashboard`, mas não criava linhas
-- em dashboard_stats/dashboard_tasks. Como o repositório devolve 404 quando as
-- duas coleções estão vazias, a conta nova podia abrir o dashboard sem dados.
--
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

-- Fonte única dos cards e tarefas de onboarding. A função é idempotente:
-- não altera um dashboard que já tenha dados personalizados.
create or replace function app.ensure_default_dashboard(p_tenant_id text)
returns void
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
begin
  if not exists (select 1 from app.tenants where id = p_tenant_id) then
    return;
  end if;

  if not exists (select 1 from app.dashboard_stats where tenant_id = p_tenant_id) then
    insert into app.dashboard_stats
      (tenant_id, label, value, delta, tone, icon_key, sort_order)
    values
      (p_tenant_id, 'Receita total',    'R$ 0,00', '0%', 'success', 'revenue', 0),
      (p_tenant_id, 'Novos clientes',   '0',       '0%', 'accent',  'customer', 1),
      (p_tenant_id, 'Pedidos',           '0',       '0%', 'info',    'orders',   2),
      (p_tenant_id, 'Ticket médio',      'R$ 0,00', '0%', 'warning', 'ticket',   3);
  end if;

  if not exists (select 1 from app.dashboard_tasks where tenant_id = p_tenant_id) then
    insert into app.dashboard_tasks (tenant_id, label, done, sort_order)
    values
      (p_tenant_id, 'Cadastre seu primeiro produto', false, 0),
      (p_tenant_id, 'Registre sua primeira venda',  false, 1),
      (p_tenant_id, 'Adicione seu primeiro cliente', false, 2);
  end if;
end;
$$;

comment on function app.ensure_default_dashboard is
  'Garante cards e tarefas iniciais do dashboard sem substituir dados personalizados.';

-- Atualiza a função de provisionamento de contas. A assinatura é a mesma da
-- 0020; CREATE OR REPLACE preserva o contrato usado pelo backend.
create or replace function app.admin_create_account(
  p_actor_id      text,
  p_tenant_id     text,
  p_brand_name    text,
  p_brand_mark    text,
  p_theme_id      text,
  p_brand_logo    text,
  p_user_email    citext,
  p_user_name     text,
  p_password_hash text,
  p_plan          text,
  p_paid_until    timestamptz,
  p_max_users     integer,
  p_industry      text
)
returns table (tenant_id text, user_id text)
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
declare
  v_user_id text;
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  insert into app.tenants
    (id, brand_name, brand_mark, theme_id, brand_logo, plan, paid_until,
     max_users, industry)
  values
    (p_tenant_id, p_brand_name, p_brand_mark, p_theme_id, p_brand_logo,
     p_plan, p_paid_until, p_max_users, p_industry);

  insert into app.modules (tenant_id, module_id, enabled, sort_order) values
    (p_tenant_id, 'home',      true,  0),
    (p_tenant_id, 'dashboard', true,  1),
    (p_tenant_id, 'products',  true,  2),
    (p_tenant_id, 'calendar',  true,  3),
    (p_tenant_id, 'customers', false, 4),
    (p_tenant_id, 'reports',   false, 5),
    (p_tenant_id, 'support',   false, 6),
    (p_tenant_id, 'activity',  true,  7);

  perform app.ensure_default_dashboard(p_tenant_id);

  insert into app.users (tenant_id, email, name, password_hash, is_tenant_admin)
  values (p_tenant_id, p_user_email, p_user_name, p_password_hash, true)
  returning id into v_user_id;

  return query select p_tenant_id, v_user_id;
end;
$$;

comment on function app.admin_create_account is
  'Cria tenant + módulos padrão + dashboard inicial + primeiro login. Exige admin de plataforma.';

grant execute on function app.admin_create_account(
  text, text, text, text, text, text, citext, text, text, text,
  timestamptz, integer, text
) to whitelabel_app;

-- Repara tenants já existentes que ainda não têm dashboard. A função é
-- idempotente e não substitui dados existentes.
do $$
declare
  t record;
begin
  for t in select id from app.tenants where id <> 'platform' loop
    perform app.ensure_default_dashboard(t.id);
  end loop;
end;
$$;
