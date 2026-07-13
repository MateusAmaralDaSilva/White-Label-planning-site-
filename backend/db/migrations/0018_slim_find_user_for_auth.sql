-- ============================================================================
-- 0018_slim_find_user_for_auth.sql — Enxuga a função de login
-- ----------------------------------------------------------------------------
-- `app.find_user_for_auth` devolvia também `paid_until`/`plan` (herança de quando
-- o login embutia a assinatura no JWT). Isso deixou de ser usado: a assinatura
-- agora é relida por requisição em `getCurrentUser` (middleware `loadCurrentUser`).
-- Aqui a função volta a devolver só o necessário para autenticar — e some o JOIN
-- interno a `app.tenants`, que existia apenas para aquelas duas colunas.
--
-- O retorno muda de forma, então é DROP + CREATE (a 0007 já registrou que
-- CREATE OR REPLACE falha ao alterar o retorno). Segue `SECURITY DEFINER` e
-- `search_path` fixo — é o único ponto autorizado a ler o `password_hash`, e o
-- único que enxerga usuários fora de um contexto de tenant (o login precede o
-- tenant). Idempotente. Rode como o DONO do banco.
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
  is_tenant_admin    boolean
)
language sql
stable
security definer
set search_path = app, pg_catalog
as $$
  select u.id, u.tenant_id, u.email, u.name, u.password_hash,
         u.is_platform_admin, u.is_tenant_admin
  from app.users u
  where u.email = p_email;
$$;

comment on function app.find_user_for_auth(citext) is
  'Busca de usuário para login. Único ponto que expõe o password_hash. Devolve id, tenant e papéis.';

grant execute on function app.find_user_for_auth(citext) to whitelabel_app;
