-- ============================================================================
-- 0012_admin_set_tenant_admin.sql — Admin de plataforma define o admin do tenant
-- ----------------------------------------------------------------------------
-- Permite ao administrador de plataforma promover/rebaixar qualquer login de uma
-- conta a administrador do tenant (dono que gerencia a equipe). Também faz a
-- listagem de logins do painel devolver `is_tenant_admin` (para a UI mostrar o
-- selo e o botão certo).
--
-- Ambas as funções são SECURITY DEFINER (atravessam tenants) com o gate
-- `is_platform_admin(actor)`, como as demais admin_*.
--
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

-- ── admin_list_users: devolve is_tenant_admin (em vez de is_platform_admin) ───
drop function if exists app.admin_list_users(text, text);

create function app.admin_list_users(p_actor_id text, p_tenant_id text)
returns table (
  id               text,
  email            citext,
  name             text,
  is_tenant_admin  boolean,
  created_at       timestamptz
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
    select u.id, u.email, u.name, u.is_tenant_admin, u.created_at
    from app.users u
    where u.tenant_id = p_tenant_id
    order by u.created_at;
end;
$$;

comment on function app.admin_list_users is
  'Lista os logins de um tenant (com is_tenant_admin), sem expor o hash. Exige admin de plataforma.';

grant execute on function app.admin_list_users(text, text) to whitelabel_app;

-- ── admin_set_tenant_admin: promove/rebaixa um login a admin do tenant ────────
create or replace function app.admin_set_tenant_admin(
  p_actor_id  text,
  p_tenant_id text,
  p_user_id   text,
  p_is_admin  boolean
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

  update app.users
     set is_tenant_admin = p_is_admin
   where id = p_user_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'usuário % não encontrado na conta %', p_user_id, p_tenant_id
      using errcode = 'no_data_found';
  end if;
end;
$$;

comment on function app.admin_set_tenant_admin is
  'Define se um login é administrador do tenant. Exige admin de plataforma.';

grant execute on function app.admin_set_tenant_admin(text, text, text, boolean) to whitelabel_app;
