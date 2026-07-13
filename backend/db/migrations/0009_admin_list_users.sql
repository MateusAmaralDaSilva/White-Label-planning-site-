-- ============================================================================
-- 0009_admin_list_users.sql — Listar os logins de uma conta (painel admin)
-- ----------------------------------------------------------------------------
-- O painel mostra o NÚMERO de logins de cada conta, mas não quais são. Esta
-- função permite ao administrador de plataforma listar os usuários de um tenant.
--
-- SECURITY DEFINER + gate `is_platform_admin(actor)`: mesma proteção das demais
-- funções admin_*. Roda como o dono (contorna o RLS) para enxergar os usuários
-- de qualquer tenant. NÃO devolve o password_hash — só dados de exibição.
--
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

create or replace function app.admin_list_users(p_actor_id text, p_tenant_id text)
returns table (
  id                 text,
  email              citext,
  name               text,
  is_platform_admin  boolean,
  created_at         timestamptz
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
    select u.id, u.email, u.name, u.is_platform_admin, u.created_at
    from app.users u
    where u.tenant_id = p_tenant_id
    order by u.created_at;
end;
$$;

comment on function app.admin_list_users is
  'Lista os logins (usuários) de um tenant, sem expor o hash de senha. Exige admin de plataforma.';

grant execute on function app.admin_list_users(text, text) to whitelabel_app;
