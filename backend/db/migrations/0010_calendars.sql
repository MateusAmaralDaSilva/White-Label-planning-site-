-- ============================================================================
-- 0010_calendars.sql — Múltiplas agendas por conta (compartilhadas ou privadas)
-- ----------------------------------------------------------------------------
-- Hoje cada conta (tenant) tem um único calendário. Esta migration introduz
-- AGENDAS nomeadas: qualquer usuário da conta cria/edita/apaga agendas, e cada
-- agenda é COMPARTILHADA (toda a empresa vê) ou PRIVADA (só o dono vê). Cada
-- agendamento passa a pertencer a UMA agenda.
--
-- Isolamento em duas camadas:
--   • RLS por tenant (como todas as tabelas): uma conta nunca vê a outra.
--   • Visibilidade por usuário DENTRO do tenant (privada só do dono) é imposta na
--     aplicação, via WHERE com o id do usuário do JWT: uma agenda é visível/
--     gerenciável quando `is_private = false OR owner_user_id = <usuário>`.
--
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

-- ── Tabela de agendas ─────────────────────────────────────────────────────────
create table if not exists app.calendars (
  id             text        primary key default gen_random_uuid()::text,
  tenant_id      text        not null references app.tenants (id) on delete cascade,
  name           text        not null,
  -- Cor de identificação da agenda (mesmo formato hex das demais cores).
  color          text        not null check (color ~ '^#[0-9A-Fa-f]{3,8}$'),
  -- Privada = só o dono enxerga; compartilhada = toda a conta enxerga/gerencia.
  is_private     boolean     not null default false,
  -- Dono da agenda (obrigatório quando privada; nas compartilhadas guarda quem criou).
  owner_user_id  text        references app.users (id) on delete cascade,
  created_at     timestamptz not null default now()
);

create index if not exists calendars_tenant_idx on app.calendars (tenant_id);

-- RLS por tenant (a visibilidade privada é filtrada na aplicação).
alter table app.calendars enable row level security;
drop policy if exists tenant_isolation on app.calendars;
create policy tenant_isolation on app.calendars
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

-- A role da aplicação precisa de DML na tabela nova (0002 concedeu só nas que
-- existiam então).
grant select, insert, update, delete on app.calendars to whitelabel_app;

-- ── Agenda padrão "Geral" por tenant + vínculo dos eventos existentes ─────────
-- Todo tenant recebe uma agenda "Geral" compartilhada (id determinístico para o
-- backfill). Os agendamentos que já existiam passam a pertencer a ela.
insert into app.calendars (id, tenant_id, name, color, is_private, owner_user_id)
select 'cal-geral-' || t.id, t.id, 'Geral', '#4F78FF', false, null
from app.tenants t
on conflict (id) do nothing;

alter table app.calendar_events
  add column if not exists calendar_id text;

update app.calendar_events e
   set calendar_id = 'cal-geral-' || e.tenant_id
 where calendar_id is null;

-- FK + NOT NULL depois do backfill (idempotente via checagem do catálogo).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_events_calendar_fk'
  ) then
    alter table app.calendar_events
      add constraint calendar_events_calendar_fk
      foreign key (calendar_id) references app.calendars (id) on delete cascade;
  end if;
end
$$;

alter table app.calendar_events alter column calendar_id set not null;

create index if not exists calendar_events_calendar_idx
  on app.calendar_events (calendar_id);
