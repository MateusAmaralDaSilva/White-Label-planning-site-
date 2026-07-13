-- ============================================================================
-- 0008_brand_logo.sql — Logo por conta (personalização) + editar conta no admin
-- ----------------------------------------------------------------------------
-- Acrescenta uma LOGO opcional a cada tenant, além de nome/sigla/slogan/tema, e
-- permite ao administrador de plataforma DEFINIR e ALTERAR a marca de uma conta.
--
-- Armazenamento: a logo é guardada como DATA URI (ex.: 'data:image/png;base64,…')
-- numa coluna TEXT. Sem storage de arquivos/CDN nesta fase, a imagem (pequena)
-- viaja no JSON e é validada/limitada de tamanho no backend (admin.repo.ts). O
-- frontend renderiza via <img src=dataUri>, que NÃO executa scripts (seguro até
-- para SVG). NULL = sem logo (cai no marcador de texto/sigla, como hoje).
--
-- Recriamos admin_create_account e admin_list_accounts (DROP + CREATE): mudar os
-- parâmetros/colunas de retorno de uma função exige recriá-la — CREATE OR REPLACE
-- não altera assinatura. Ao dropar, o GRANT se perde, então reconcedemos EXECUTE.
--
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

-- Coluna aditiva e anulável: não quebra dados existentes.
alter table app.tenants
  add column if not exists brand_logo text;

-- ── admin_create_account: agora aceita a logo (p_brand_logo) ──────────────────
drop function if exists
  app.admin_create_account(text, text, text, text, text, text, citext, text, text, text, timestamptz);

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
  p_paid_until    timestamptz
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
    (id, brand_name, brand_mark, brand_tagline, theme_id, brand_logo, plan, paid_until)
  values
    (p_tenant_id, p_brand_name, p_brand_mark, p_brand_tagline, p_theme_id, p_brand_logo,
     p_plan, p_paid_until);

  insert into app.modules (tenant_id, module_id, enabled, sort_order) values
    (p_tenant_id, 'home',      true,  0),
    (p_tenant_id, 'dashboard', true,  1),
    (p_tenant_id, 'products',  true,  2),
    (p_tenant_id, 'calendar',  true,  3),
    (p_tenant_id, 'customers', false, 4),
    (p_tenant_id, 'reports',   false, 5),
    (p_tenant_id, 'support',   false, 6),
    (p_tenant_id, 'activity',  true,  7);

  insert into app.users (tenant_id, email, name, password_hash)
  values (p_tenant_id, p_user_email, p_user_name, p_password_hash)
  returning id into v_user_id;

  return query select p_tenant_id, v_user_id;
end;
$$;

comment on function app.admin_create_account is
  'Cria um tenant novo (com logo opcional) + módulos padrão + primeiro login. Exige admin de plataforma.';

-- ── admin_update_account: altera a marca de um tenant existente ───────────────
create or replace function app.admin_update_account(
  p_actor_id      text,
  p_tenant_id     text,
  p_brand_name    text,
  p_brand_mark    text,
  p_brand_tagline text,
  p_theme_id      text,
  p_brand_logo    text
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
         brand_logo    = p_brand_logo
   where id = p_tenant_id;

  if not found then
    raise exception 'tenant % não encontrado', p_tenant_id using errcode = 'no_data_found';
  end if;
end;
$$;

comment on function app.admin_update_account is
  'Atualiza a marca (nome/sigla/slogan/tema/logo) de um tenant. Exige admin de plataforma.';

-- ── admin_list_accounts: devolve também a marca completa (para exibir/editar) ──
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
           t.plan, t.paid_until,
           (select count(*) from app.users u where u.tenant_id = t.id) as user_count,
           t.created_at
    from app.tenants t
    where t.id <> 'platform'
    order by t.created_at desc;
end;
$$;

comment on function app.admin_list_accounts is
  'Lista todas as contas com marca completa, status de assinatura e nº de logins. Exige admin de plataforma.';

-- ── Grants (recriados perdem o grant de 0002/0006) ────────────────────────────
grant execute on function
  app.admin_create_account(text, text, text, text, text, text, text, citext, text, text, text, timestamptz)
  to whitelabel_app;
grant execute on function
  app.admin_update_account(text, text, text, text, text, text, text)
  to whitelabel_app;
grant execute on function app.admin_list_accounts(text) to whitelabel_app;
