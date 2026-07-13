-- ============================================================================
-- 0019_verify_credentials.sql — Verificação de senha DENTRO do banco
-- ----------------------------------------------------------------------------
-- PROBLEMA: `app.find_user_for_auth` (SECURITY DEFINER, NÃO escopada por tenant —
-- o login precede o contexto de tenant) DEVOLVIA o `password_hash` para o Node
-- comparar com bcrypt. Quem obtivesse a role da aplicação (ou um SQLi no contexto
-- dela) podia puxar o hash de QUALQUER usuário por essa função — material valioso
-- para quebra offline / credential stuffing.
--
-- CORREÇÃO (defesa em profundidade): a comparação passa a ocorrer no banco.
--   1) `app.verify_credentials(email, senha)` — SECURITY DEFINER — compara com
--      `crypt()` do pgcrypto e devolve o usuário PÚBLICO (sem hash) só quando bate.
--      O hash nunca mais sai do banco. Roda um `crypt()` mesmo em e-mail inexistente
--      (contra um salt descartável) para não vazar existência por TEMPO (timing) —
--      a mesma proteção que antes ficava no Node.
--   2) `find_user_for_auth` (que devolvia o hash) é REMOVIDA.
--   3) A role da app perde o SELECT da COLUNA `password_hash` (mantém as demais):
--      nem função, nem SELECT direto, nem SQLi no contexto da app lê o hash.
--
-- O hashing na criação de usuário CONTINUA no Node (bcryptjs custo 12); o formato
-- $2 é compatível com `crypt()`, então nenhum hash precisa ser reprocessado.
-- pgcrypto vive no schema `public` (0001) — por isso `crypt`/`gen_salt` são
-- qualificados (o `search_path` da função fica restrito, sem `public`).
--
-- Rode como o DONO do banco. Idempotente.
-- ============================================================================

set client_encoding to 'UTF8';

-- (2) Remove a função que expunha o hash.
drop function if exists app.find_user_for_auth(citext);

-- (1) Verificação no banco. 0 linhas em e-mail inexistente OU senha errada; 1 linha
--     (usuário público, sem hash) quando a senha confere.
create or replace function app.verify_credentials(p_email citext, p_password text)
returns table (
  id                 text,
  tenant_id          text,
  email              citext,
  name               text,
  is_platform_admin  boolean,
  is_tenant_admin    boolean
)
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
declare
  -- `citext` vive no schema public; o search_path da função é restrito (app,
  -- pg_catalog), então o tipo precisa ser qualificado aqui no corpo.
  v_id text; v_tenant text; v_email public.citext; v_name text;
  v_hash text; v_pa boolean; v_ta boolean;
begin
  select u.id, u.tenant_id, u.email, u.name, u.password_hash, u.is_platform_admin, u.is_tenant_admin
    into v_id, v_tenant, v_email, v_name, v_hash, v_pa, v_ta
    from app.users u
   where u.email = p_email;

  if v_hash is null then
    -- E-mail inexistente: gasta um crypt equivalente e sai — o tempo de resposta
    -- não denuncia se o e-mail existe (proteção de timing que ficava no Node).
    perform public.crypt(p_password, public.gen_salt('bf', 12));
    return;
  end if;

  if public.crypt(p_password, v_hash) = v_hash then
    id := v_id; tenant_id := v_tenant; email := v_email; name := v_name;
    is_platform_admin := v_pa; is_tenant_admin := v_ta;
    return next;
  end if;
end;
$$;

comment on function app.verify_credentials(citext, text) is
  'Login: compara a senha com crypt() DENTRO do banco e devolve o usuário público (sem hash). Timing-safe.';

grant execute on function app.verify_credentials(citext, text) to whitelabel_app;

-- (3) A role da app não lê mais a coluna `password_hash` (só as demais). INSERT/
--     UPDATE/DELETE seguem inalterados — escrever o hash na criação é ok; LER é que
--     era o risco. (Todos os SELECTs diretos do app em app.users usam só estas
--     colunas; a leitura para login vai pela função SECURITY DEFINER acima.)
revoke select on app.users from whitelabel_app;
grant select (id, tenant_id, email, name, created_at, updated_at, is_platform_admin, is_tenant_admin)
  on app.users to whitelabel_app;
