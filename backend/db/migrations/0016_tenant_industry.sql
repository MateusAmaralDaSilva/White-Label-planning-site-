-- ============================================================================
-- 0016_tenant_industry.sql — Ramo (setor) de cada conta
-- ----------------------------------------------------------------------------
-- Adiciona `tenants.industry`: o RAMO de atividade da empresa (varejo, saúde,
-- alimentação…). Objetivo: o admin de plataforma ver quais ramos mais usam o
-- produto (distribuição no painel financeiro).
--
-- Introduzido como valor padronizado (id de lista fixa). NOTA: a 0017 depois
-- relaxou isso para TEXTO LIVRE (sugestões vindas dos dados), então a lista fixa
-- e a validação por enum não valem mais — ver 0017. Nullable: contas sem ramo
-- ficam como "Não informado".
--
-- As funções `admin_*` (SECURITY DEFINER, cross-tenant) são recriadas para
-- conhecer o campo novo. Aditivo e idempotente. Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

alter table app.tenants add column if not exists industry text;

-- Backfill leve das contas demo (se existirem), para o painel já mostrar algo.
update app.tenants set industry = 'varejo' where id = 'acme'    and industry is null;
update app.tenants set industry = 'saude'  where id = 'clinica' and industry is null;

-- ── admin_create_account: agora também grava o ramo ───────────────────────────
drop function if exists app.admin_create_account(
  text, text, text, text, text, text, text, citext, text, text, text, timestamptz, integer);

create function app.admin_create_account(
  p_actor_id      text,
  p_tenant_id     text,
  p_brand_name    text,
  p_brand_mark    text,
  p_brand_tagline text,
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
    (id, brand_name, brand_mark, brand_tagline, theme_id, brand_logo, plan, paid_until,
     max_users, industry)
  values
    (p_tenant_id, p_brand_name, p_brand_mark, p_brand_tagline, p_theme_id, p_brand_logo,
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

  insert into app.users (tenant_id, email, name, password_hash, is_tenant_admin)
  values (p_tenant_id, p_user_email, p_user_name, p_password_hash, true)
  returning id into v_user_id;

  return query select p_tenant_id, v_user_id;
end;
$$;

comment on function app.admin_create_account is
  'Cria tenant + módulos padrão + primeiro login (admin do tenant), com limite de usuários e ramo. Exige admin de plataforma.';

-- ── admin_update_account: agora também ajusta o ramo ──────────────────────────
drop function if exists app.admin_update_account(text, text, text, text, text, text, text, integer);

create function app.admin_update_account(
  p_actor_id      text,
  p_tenant_id     text,
  p_brand_name    text,
  p_brand_mark    text,
  p_brand_tagline text,
  p_theme_id      text,
  p_brand_logo    text,
  p_max_users     integer,
  p_industry      text
)
returns void
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  update app.tenants
     set brand_name    = p_brand_name,
         brand_mark    = p_brand_mark,
         brand_tagline = p_brand_tagline,
         theme_id      = p_theme_id,
         brand_logo    = p_brand_logo,
         max_users     = p_max_users,
         industry      = p_industry
   where id = p_tenant_id;

  if not found then
    raise exception 'tenant % não encontrado', p_tenant_id using errcode = 'no_data_found';
  end if;
end;
$$;

comment on function app.admin_update_account is
  'Atualiza marca (nome/sigla/slogan/tema/logo), limite de usuários e ramo de um tenant. Exige admin de plataforma.';

-- ── admin_list_accounts: devolve também o ramo ────────────────────────────────
drop function if exists app.admin_list_accounts(text);

create function app.admin_list_accounts(p_actor_id text)
returns table (
  tenant_id     text,
  brand_name    text,
  brand_mark    text,
  brand_tagline text,
  theme_id      text,
  brand_logo    text,
  plan          text,
  paid_until    timestamptz,
  max_users     integer,
  industry      text,
  user_count    bigint,
  created_at    timestamptz
)
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
    select t.id, t.brand_name, t.brand_mark, t.brand_tagline, t.theme_id, t.brand_logo,
           t.plan, t.paid_until, t.max_users, t.industry,
           (select count(*) from app.users u where u.tenant_id = t.id) as user_count,
           t.created_at
    from app.tenants t
    where t.id <> 'platform'
    order by t.created_at desc;
end;
$$;

comment on function app.admin_list_accounts is
  'Lista contas com marca, assinatura, limite de usuários, ramo e nº de logins. Exige admin de plataforma.';

-- ── Grants (recriados perdem o grant anterior) ────────────────────────────────
grant execute on function
  app.admin_create_account(text, text, text, text, text, text, text, citext, text, text, text, timestamptz, integer, text)
  to whitelabel_app;
grant execute on function
  app.admin_update_account(text, text, text, text, text, text, text, integer, text)
  to whitelabel_app;
grant execute on function app.admin_list_accounts(text) to whitelabel_app;
