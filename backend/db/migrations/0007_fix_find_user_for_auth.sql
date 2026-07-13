-- ============================================================================
-- 0007_fix_find_user_for_auth.sql — Corrige a função de login
-- ----------------------------------------------------------------------------
-- A 0006 tentou atualizar `app.find_user_for_auth` com CREATE OR REPLACE, mas o
-- PostgreSQL NÃO permite alterar as colunas de um `RETURNS TABLE` de uma função
-- já existente sem um DROP antes ("cannot change return type of existing
-- function"). Como o psql não roda com ON_ERROR_STOP, aquele passo falhou em
-- silêncio e a função ficou na versão antiga (sem `is_platform_admin`) — por isso
-- o login não trazia o selo de admin e o admin caía na tela de usuário comum.
--
-- Aqui fazemos o certo: DROP + CREATE com a nova assinatura e re-GRANT do EXECUTE
-- para a role da aplicação (o grant se perde ao dropar a função). Também corrige
-- os acentos do tenant de administração usando escapes Unicode (independe do
-- encoding do console do psql no Windows).
--
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

drop function if exists app.find_user_for_auth(citext);

create function app.find_user_for_auth(p_email citext)
returns table (
  id                 text,
  tenant_id          text,
  email              citext,
  name               text,
  password_hash      text,
  is_platform_admin  boolean,
  paid_until         timestamptz,
  plan               text
)
language sql
stable
security definer
set search_path = app, pg_catalog
as $$
  select u.id, u.tenant_id, u.email, u.name, u.password_hash,
         u.is_platform_admin, t.paid_until, t.plan
  from app.users u
  join app.tenants t on t.id = u.tenant_id
  where u.email = p_email;
$$;

comment on function app.find_user_for_auth(citext) is
  'Busca de usuário para login (pré-contexto de tenant). Único ponto que expõe o password_hash. Devolve também o papel e a assinatura do tenant.';

-- O grant se perde ao dropar a função; concede de novo à role da aplicação.
grant execute on function app.find_user_for_auth(citext) to whitelabel_app;

-- Corrige os acentos do tenant técnico de administração. \00E7 = ç, \00E3 = ã.
update app.tenants
   set brand_name    = U&'Administra\00E7\00E3o',
       brand_tagline = U&'Console de administra\00E7\00E3o da plataforma'
 where id = 'platform';
