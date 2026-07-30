-- ============================================================================
-- 0002_security.sql — Role da aplicação, RLS e endurecimento
-- ----------------------------------------------------------------------------
-- O coração da proteção contra ataques vindos do frontend. Três camadas:
--
--   1. Menor privilégio: a API conecta como `whitelabel_app`, uma role sem
--      superuser, sem BYPASSRLS e sem DDL. Mesmo uma injeção de SQL bem-sucedida
--      esbarra no que essa role NÃO pode fazer (sem DROP, sem ler outras tabelas,
--      sem criar objetos).
--
--   2. RLS (Row-Level Security): cada linha só é visível/gravável quando
--      `tenant_id = app.current_tenant()`. O isolamento entre clientes deixa de
--      ser uma convenção do código (data/store.ts) e passa a ser imposto pelo
--      banco. Uma query que "esqueça" o WHERE tenant_id não vaza nada.
--
--   3. Limites de recurso: statement_timeout e afins cortam consultas abusivas
--      (defesa contra DoS por query cara).
--
-- Rode como o DONO do banco. Ajuste o nome/senha da role conforme seu ambiente.
-- ============================================================================

-- Arquivo UTF-8: força a interpretação correta mesmo se o console usar outro
-- encoding (Windows costuma usar WIN1252), evitando acentos duplo-codificados.
set client_encoding to 'UTF8';

-- ── Role da aplicação ────────────────────────────────────────────────────────
-- NOSUPERUSER + NOBYPASSRLS são obrigatórios: é o que garante que o RLS SEMPRE
-- se aplique a esta role. Troque a senha por um segredo forte vindo do seu
-- gerenciador de segredos (nunca comite a senha real).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'whitelabel_app') then
    create role whitelabel_app
      login
      password 'Madara1108.'
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit
      nobypassrls;
  end if;
end
$$;

-- Limites de recurso por conexão (defesa contra DoS por consulta cara ou
-- transação pendurada segurando locks). Valores conservadores para uma API web.
alter role whitelabel_app set statement_timeout = '5s';
alter role whitelabel_app set idle_in_transaction_session_timeout = '10s';
-- search_path fixo no schema app + pg_catalog: a role não enxerga o public.
alter role whitelabel_app set search_path = 'app', 'pg_catalog';

-- ── Superfície mínima ────────────────────────────────────────────────────────
-- Ninguém cria objetos no public (reduz a superfície de "trojan" de schema).
revoke create on schema public from public;

-- A role só enxerga/usa o schema app — e nada de DDL nele.
grant usage on schema app to whitelabel_app;

-- Só DML nas tabelas. Sem TRUNCATE, sem DDL. (SELECT/INSERT/UPDATE/DELETE.)
grant select, insert, update, delete on all tables in schema app to whitelabel_app;

-- Sequences das colunas identity (report_kpis, revenue_points, etc.).
grant usage, select on all sequences in schema app to whitelabel_app;

-- Funções expostas à aplicação: current_tenant() e a de autenticação.
grant execute on all functions in schema app to whitelabel_app;

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Habilita RLS e cria a política de isolamento por tenant em todas as tabelas de
-- negócio (as que têm coluna tenant_id). Um laço garante que NENHUMA tabela seja
-- esquecida — esquecer uma seria um vazamento entre tenants.
do $$
declare
  t text;
  tenant_scoped text[] := array[
    'modules', 'users', 'news', 'activity_events', 'notifications',
    'products', 'customers', 'calendar_events', 'support_tickets',
    'report_kpis', 'revenue_points', 'category_shares',
    'dashboard_stats', 'dashboard_tasks'
  ];
begin
  foreach t in array tenant_scoped loop
    execute format('alter table app.%I enable row level security', t);
    -- USING filtra leituras/updates/deletes; WITH CHECK impede inserir/atualizar
    -- uma linha para OUTRO tenant que não o do contexto.
    execute format(
      'create policy tenant_isolation on app.%I '
      'using (tenant_id = app.current_tenant()) '
      'with check (tenant_id = app.current_tenant())',
      t
    );
  end loop;
end
$$;

-- A tabela `tenants` usa `id` (não `tenant_id`) como chave do tenant.
alter table app.tenants enable row level security;
create policy tenant_isolation on app.tenants
  using (id = app.current_tenant())
  with check (id = app.current_tenant());

-- IMPORTANTE: a role da aplicação NÃO é dona das tabelas e não tem BYPASSRLS,
-- então o RLS já se aplica a ela em tempo de execução. Não usamos FORCE ROW
-- LEVEL SECURITY de propósito: assim a função SECURITY DEFINER de autenticação
-- (find_user_for_auth), que roda como o dono, ainda consegue localizar o usuário
-- por e-mail ANTES de haver um contexto de tenant. Em runtime, a API nunca
-- conecta como o dono.


