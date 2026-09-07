-- ============================================================================
-- 0006_billing_admin.sql — Assinatura por tenant + administrador de plataforma
-- ----------------------------------------------------------------------------
-- Adiciona duas capacidades novas ao produto, mantendo o modelo de segurança de
-- 0001/0002 (menor privilégio + RLS + consultas parametrizadas):
--
--   1. ASSINATURA POR TENANT. Cada conta (tenant) passa a ter uma data
--      `paid_until`. O acesso é DERIVADO dessa data: enquanto `paid_until >= now()`
--      a conta está ativa; ao passar do prazo ela "expira sozinha" — sem job, sem
--      cron. Creditar 6 ou 12 meses só estende `paid_until` (soma sobre o saldo que
--      ainda resta). A API bloqueia o acesso (HTTP 402) quando expira e o front
--      mostra o aviso de renovação.
--
--   2. ADMINISTRADOR DE PLATAFORMA. Um usuário com `is_platform_admin = true`
--      pode PROVISIONAR contas manualmente (não há pagamento automático ainda):
--      criar um tenant novo com o primeiro login, adicionar logins a um tenant
--      existente e creditar meses de assinatura.
--
-- ----------------------------------------------------------------------------
-- MODELO DE SEGURANÇA (leia antes de mexer)
-- ----------------------------------------------------------------------------
-- Provisionar uma conta acontece FORA de qualquer contexto de tenant (o tenant
-- ainda nem existe) e precisa escrever em várias tabelas escopadas por RLS. Por
-- isso as operações de admin vivem em funções `SECURITY DEFINER`, que rodam com
-- os privilégios do DONO do banco (não sujeito ao RLS) — exatamente como a já
-- existente `find_user_for_auth`. Para que essa porta seja estreita e auditável:
--
--   • Cada função de admin recebe `p_actor_id` (o id do usuário autenticado, que
--     vem do JWT assinado no backend) e VERIFICA `app.is_platform_admin(p_actor_id)`
--     ANTES de qualquer escrita. Defesa em profundidade: mesmo que uma rota do
--     backend chame a função por engano sem checar o papel, o banco recusa
--     (SQLSTATE 42501 / insufficient_privilege).
--   • `search_path` fixo (`app, pg_catalog`) em toda função — evita sequestro de
--     resolução de nomes por objetos plantados em outro schema.
--   • Nenhuma entrada é concatenada em texto SQL: tudo entra por parâmetro ($1…).
--   • O hash da senha é calculado no BACKEND (bcryptjs) e chega pronto; o banco
--     nunca vê a senha em texto puro. As funções recebem `p_password_hash`.
--   • `EXECUTE` das funções é concedido só à role da aplicação `whitelabel_app`
--     (que segue NOSUPERUSER / NOBYPASSRLS). A role NÃO é dona das funções, então
--     não pode alterá-las nem contornar as checagens internas.
--
-- Rode como o DONO do banco (as SECURITY DEFINER e os grants dependem disso).
-- ============================================================================

set client_encoding to 'UTF8';

-- ── Colunas novas (aditivas, anuláveis — não quebram dados existentes) ────────

-- Assinatura do tenant. `paid_until` NULL = conta sem acesso (nunca paga).
-- `plan` guarda o último plano contratado (mensal/semestral/anual) só para
-- exibição no painel admin — a regra de acesso depende só de `paid_until`.
alter table app.tenants
  add column if not exists paid_until timestamptz,
  add column if not exists plan       text;

-- Marca o administrador da plataforma. `default false` garante que todo usuário
-- existente e todo novo login comum continue SEM privilégio elevado.
alter table app.users
  add column if not exists is_platform_admin boolean not null default false;

-- Tenants que já existem (ex.: os demo `acme`/`clinica` do seed 0003) ganham uma
-- assinatura ativa de 1 ano — do contrário `paid_until` ficaria NULL e a conta
-- cairia no bloqueio (402) logo após esta migration. Só afeta quem ainda não tem
-- data definida; não sobrescreve assinaturas já configuradas.
update app.tenants
   set paid_until = now() + interval '1 year',
       plan       = coalesce(plan, 'anual')
 where paid_until is null;

-- ============================================================================
-- app.is_platform_admin(user_id) — checagem de papel usada pelas demais funções
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER para conseguir ler `app.users` sem um contexto de tenant
-- (a checagem acontece antes/independente do RLS). Retorna false para id
-- inexistente (nega por padrão).
-- ============================================================================
create or replace function app.is_platform_admin(p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = app, pg_catalog
as $$
  select coalesce((select u.is_platform_admin from app.users u where u.id = p_user_id), false);
$$;

comment on function app.is_platform_admin(text) is
  'Retorna true se o usuário for administrador de plataforma. Base do gate das funções admin_*.';

-- ============================================================================
-- app.find_user_for_auth — agora também devolve o papel e a assinatura do tenant
-- ----------------------------------------------------------------------------
-- Substitui a versão de 0001. O login (routes/auth.ts) usa esses campos extras
-- para: (a) embutir `is_platform_admin` no JWT assinado; (b) conhecer o
-- `paid_until`/`plan` do tenant já no login. Continua sendo o ÚNICO ponto que
-- expõe o `password_hash`.
--
-- DROP antes do CREATE: mudar as colunas de um RETURNS TABLE exige recriar a
-- função (o PostgreSQL recusa CREATE OR REPLACE que altere o tipo de retorno).
-- ============================================================================
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

-- ============================================================================
-- app.admin_create_account — cria tenant + módulos padrão + primeiro login
-- ----------------------------------------------------------------------------
-- Provisiona uma conta inteira numa única transação. Idempotência NÃO é desejada
-- aqui: se o tenant/e-mail já existe, a constraint estoura e a transação aborta
-- (a API traduz para um 409/400 amigável). `p_password_hash` chega pronto do
-- backend (bcrypt).
-- ============================================================================
create or replace function app.admin_create_account(
  p_actor_id      text,
  p_tenant_id     text,
  p_brand_name    text,
  p_brand_mark    text,
  p_brand_tagline text,
  p_theme_id      text,
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
    (id, brand_name, brand_mark, brand_tagline, theme_id, plan, paid_until)
  values
    (p_tenant_id, p_brand_name, p_brand_mark, p_brand_tagline, p_theme_id, p_plan, p_paid_until);

  -- Conjunto de módulos padrão de uma conta nova (espelha o seed do tenant demo).
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
  'Cria um tenant novo com módulos padrão e o primeiro login. Exige que p_actor_id seja admin de plataforma.';

-- ============================================================================
-- app.admin_add_user — adiciona um login a um tenant EXISTENTE
-- ----------------------------------------------------------------------------
-- O schema já suporta vários usuários por tenant (users.tenant_id + RLS). Esta
-- função expõe isso ao admin de forma controlada.
-- ============================================================================
create or replace function app.admin_add_user(
  p_actor_id      text,
  p_tenant_id     text,
  p_user_email    citext,
  p_user_name     text,
  p_password_hash text
)
returns text
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

  if not exists (select 1 from app.tenants t where t.id = p_tenant_id) then
    raise exception 'tenant % não encontrado', p_tenant_id using errcode = 'no_data_found';
  end if;

  insert into app.users (tenant_id, email, name, password_hash)
  values (p_tenant_id, p_user_email, p_user_name, p_password_hash)
  returning id into v_user_id;

  return v_user_id;
end;
$$;

comment on function app.admin_add_user is
  'Adiciona um login a um tenant existente. Exige que p_actor_id seja admin de plataforma.';

-- ============================================================================
-- app.admin_credit_months — credita N meses de assinatura
-- ----------------------------------------------------------------------------
-- Estende `paid_until` somando N meses sobre o MAIOR entre "agora" e o saldo
-- restante — assim, pagar antes de vencer NÃO perde os dias que sobraram, e pagar
-- depois de vencido conta a partir de hoje. Atualiza o `plan` para exibição.
-- ============================================================================
create or replace function app.admin_credit_months(
  p_actor_id  text,
  p_tenant_id text,
  p_months    integer,
  p_plan      text
)
returns timestamptz
language plpgsql
security definer
set search_path = app, pg_catalog
as $$
declare
  v_new timestamptz;
begin
  if not app.is_platform_admin(p_actor_id) then
    raise exception 'usuário % não é administrador de plataforma', p_actor_id
      using errcode = '42501';
  end if;

  if p_months is null or p_months <= 0 then
    raise exception 'meses deve ser um inteiro positivo' using errcode = 'check_violation';
  end if;

  update app.tenants
     set paid_until = greatest(coalesce(paid_until, now()), now())
                        + make_interval(months => p_months),
         plan       = coalesce(p_plan, plan)
   where id = p_tenant_id
   returning paid_until into v_new;

  if v_new is null then
    raise exception 'tenant % não encontrado', p_tenant_id using errcode = 'no_data_found';
  end if;

  return v_new;
end;
$$;

comment on function app.admin_credit_months is
  'Credita N meses de assinatura a um tenant (soma sobre o saldo restante). Exige admin de plataforma.';

-- ============================================================================
-- app.admin_list_accounts — lista todas as contas para o painel admin
-- ----------------------------------------------------------------------------
-- Exclui o próprio tenant de administração ('platform'). SECURITY DEFINER para
-- enxergar todos os tenants (o RLS esconderia todos menos o do contexto).
-- ============================================================================
create or replace function app.admin_list_accounts(p_actor_id text)
returns table (
  tenant_id   text,
  brand_name  text,
  plan        text,
  paid_until  timestamptz,
  user_count  bigint,
  created_at  timestamptz
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
    select t.id, t.brand_name, t.plan, t.paid_until,
           (select count(*) from app.users u where u.tenant_id = t.id) as user_count,
           t.created_at
    from app.tenants t
    where t.id <> 'platform'
    order by t.created_at desc;
end;
$$;

comment on function app.admin_list_accounts is
  'Lista todas as contas (tenants) com status de assinatura e nº de logins. Exige admin de plataforma.';

-- ── Grants: só a role da aplicação executa as funções novas ───────────────────
-- (0002 concedeu EXECUTE só nas funções que existiam então; as novas precisam de
-- grant explícito.) A role continua sem poder ALTERAR as funções — não é dona.
-- find_user_for_auth foi dropada e recriada acima, então o grant de 0002 se
-- perdeu — reconcede o EXECUTE à role da aplicação.
grant execute on function app.find_user_for_auth(citext)                           to whitelabel_app;
grant execute on function app.is_platform_admin(text)                              to whitelabel_app;
grant execute on function app.admin_create_account(text, text, text, text, text, text, citext, text, text, text, timestamptz) to whitelabel_app;
grant execute on function app.admin_add_user(text, text, citext, text, text)       to whitelabel_app;
grant execute on function app.admin_credit_months(text, text, integer, text)       to whitelabel_app;
grant execute on function app.admin_list_accounts(text)                            to whitelabel_app;


