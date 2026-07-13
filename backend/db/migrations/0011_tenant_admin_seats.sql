-- ============================================================================
-- 0011_tenant_admin_seats.sql — Admin do tenant + limite de usuários (assentos)
-- ----------------------------------------------------------------------------
-- Dois recursos ligados:
--
--   1. ADMINISTRADOR DO TENANT. O dono da empresa que recebe o whitelabel pode
--      gerenciar os LOGINS da própria conta (criar/excluir), sem depender do
--      administrador de plataforma. Marca-se com `users.is_tenant_admin`. O
--      primeiro login criado ao provisionar a conta já vem como admin do tenant.
--
--   2. LIMITE DE USUÁRIOS (assentos). O dono do whitelabel define, por conta,
--      quantos logins ela pode ter (`tenants.max_users`; NULL = ilimitado). O
--      admin do tenant não consegue ultrapassar esse número.
--
-- A gestão de usuários DENTRO do tenant NÃO usa SECURITY DEFINER: acontece no
-- contexto de tenant (RLS), com o app inserindo/apagando em app.users escopado.
-- Só as funções de PLATAFORMA (admin_*), que atravessam tenants, seguem
-- SECURITY DEFINER — e são recriadas aqui para conhecer os novos campos.
--
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

-- Colunas novas (aditivas). max_users NULL = ilimitado.
alter table app.tenants add column if not exists max_users integer
  check (max_users is null or max_users > 0);
alter table app.users   add column if not exists is_tenant_admin boolean not null default false;

-- ── find_user_for_auth: devolve também is_tenant_admin ────────────────────────
drop function if exists app.find_user_for_auth(citext);

create function app.find_user_for_auth(p_email citext)
returns table (
  id                 text,
  tenant_id          text,
  email              citext,
  name               text,
  password_hash      text,
  is_platform_admin  boolean,
  is_tenant_admin    boolean,
  paid_until         timestamptz,
  plan               text
)
language sql
stable
security definer
set search_path = app, pg_catalog
as $$
  select u.id, u.tenant_id, u.email, u.name, u.password_hash,
         u.is_platform_admin, u.is_tenant_admin, t.paid_until, t.plan
  from app.users u
  join app.tenants t on t.id = u.tenant_id
  where u.email = p_email;
$$;

comment on function app.find_user_for_auth(citext) is
  'Busca de usuário para login. Único ponto que expõe o password_hash. Devolve papéis e assinatura.';

grant execute on function app.find_user_for_auth(citext) to whitelabel_app;

-- ── admin_create_account: define max_users e o 1º login como admin do tenant ──
drop function if exists
  app.admin_create_account(text, text, text, text, text, text, text, citext, text, text, text, timestamptz);

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
  p_max_users     integer
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
    (id, brand_name, brand_mark, brand_tagline, theme_id, brand_logo, plan, paid_until, max_users)
  values
    (p_tenant_id, p_brand_name, p_brand_mark, p_brand_tagline, p_theme_id, p_brand_logo,
     p_plan, p_paid_until, p_max_users);

  insert into app.modules (tenant_id, module_id, enabled, sort_order) values
    (p_tenant_id, 'home',      true,  0),
    (p_tenant_id, 'dashboard', true,  1),
    (p_tenant_id, 'products',  true,  2),
    (p_tenant_id, 'calendar',  true,  3),
    (p_tenant_id, 'customers', false, 4),
    (p_tenant_id, 'reports',   false, 5),
    (p_tenant_id, 'support',   false, 6),
    (p_tenant_id, 'activity',  true,  7);

  -- O primeiro login é o dono/admin do tenant.
  insert into app.users (tenant_id, email, name, password_hash, is_tenant_admin)
  values (p_tenant_id, p_user_email, p_user_name, p_password_hash, true)
  returning id into v_user_id;

  return query select p_tenant_id, v_user_id;
end;
$$;

comment on function app.admin_create_account is
  'Cria tenant + módulos padrão + primeiro login (admin do tenant), definindo o limite de usuários. Exige admin de plataforma.';

-- ── admin_update_account: agora também ajusta max_users ───────────────────────
drop function if exists app.admin_update_account(text, text, text, text, text, text, text);

create function app.admin_update_account(
  p_actor_id      text,
  p_tenant_id     text,
  p_brand_name    text,
  p_brand_mark    text,
  p_brand_tagline text,
  p_theme_id      text,
  p_brand_logo    text,
  p_max_users     integer
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
         max_users     = p_max_users
   where id = p_tenant_id;

  if not found then
    raise exception 'tenant % não encontrado', p_tenant_id using errcode = 'no_data_found';
  end if;
end;
$$;

comment on function app.admin_update_account is
  'Atualiza marca (nome/sigla/slogan/tema/logo) e o limite de usuários de um tenant. Exige admin de plataforma.';

-- ── admin_list_accounts: devolve também max_users ─────────────────────────────
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
           t.plan, t.paid_until, t.max_users,
           (select count(*) from app.users u where u.tenant_id = t.id) as user_count,
           t.created_at
    from app.tenants t
    where t.id <> 'platform'
    order by t.created_at desc;
end;
$$;

comment on function app.admin_list_accounts is
  'Lista contas com marca, assinatura, limite de usuários e nº de logins. Exige admin de plataforma.';

-- ── Grants (recriados perdem o grant anterior) ────────────────────────────────
grant execute on function
  app.admin_create_account(text, text, text, text, text, text, text, citext, text, text, text, timestamptz, integer)
  to whitelabel_app;
grant execute on function
  app.admin_update_account(text, text, text, text, text, text, text, integer)
  to whitelabel_app;
grant execute on function app.admin_list_accounts(text) to whitelabel_app;

-- O admin de cada conta demo já existente vira admin do tenant (o 1º usuário).
update app.users u
   set is_tenant_admin = true
 where u.tenant_id <> 'platform'
   and u.id = (
     select u2.id from app.users u2
      where u2.tenant_id = u.tenant_id
      order by u2.created_at, u2.id
      limit 1
   );
