-- ============================================================================
-- 0015_temporal_timestamps.sql — Tempo real no lugar de rótulos estáticos
-- ----------------------------------------------------------------------------
-- Até aqui, `activity_events`, `notifications` e `support_tickets` guardavam o
-- tempo como TEXTO de exibição ("há 5 min", "2h atrás") e ordenavam por
-- `sort_order`. Isso CONGELA o tempo (o "há 5 min" nunca mais muda) e bloqueia
-- ordenação/paginação/analytics por tempo real.
--
-- Esta migração troca esses rótulos por um `occurred_at timestamptz` real. O
-- backend passa a ORDENAR por ele e a CALCULAR o rótulo relativo na leitura
-- (lib/relative-time.ts), então o rótulo deixa de congelar e o contrato da API
-- (campos `time`/`date` como string) NÃO muda. `news` já tinha `created_at`, então
-- só perde o `date_label` (a data passa a vir de `created_at`).
--
-- Backfill: como os rótulos não são parseáveis de volta, aproximamos o instante
-- a partir do `sort_order` (que já era a ordem — menor = mais recente), de modo a
-- PRESERVAR a ordem das linhas existentes. Idempotente (`if [not] exists`).
-- Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

-- ── activity_events ─────────────────────────────────────────────────────────
alter table app.activity_events add column if not exists occurred_at timestamptz;
-- Preserva a ordem: sort_order 0 (mais recente) → agora; cada passo, 1h antes.
update app.activity_events
   set occurred_at = now() - sort_order * interval '1 hour'
 where occurred_at is null;
alter table app.activity_events alter column occurred_at set not null;
alter table app.activity_events alter column occurred_at set default now();
alter table app.activity_events drop column if exists date_label;
alter table app.activity_events drop column if exists time_label;
-- Dropar sort_order remove junto o índice antigo (activity_tenant_idx).
alter table app.activity_events drop column if exists sort_order;
create index if not exists activity_tenant_time_idx
  on app.activity_events (tenant_id, occurred_at desc);

-- ── notifications ───────────────────────────────────────────────────────────
alter table app.notifications add column if not exists occurred_at timestamptz;
update app.notifications
   set occurred_at = now() - sort_order * interval '1 hour'
 where occurred_at is null;
alter table app.notifications alter column occurred_at set not null;
alter table app.notifications alter column occurred_at set default now();
alter table app.notifications drop column if exists time_label;
alter table app.notifications drop column if exists sort_order;
create index if not exists notifications_tenant_time_idx
  on app.notifications (tenant_id, occurred_at desc);

-- ── support_tickets ─────────────────────────────────────────────────────────
alter table app.support_tickets add column if not exists occurred_at timestamptz;
update app.support_tickets
   set occurred_at = now() - sort_order * interval '1 hour'
 where occurred_at is null;
alter table app.support_tickets alter column occurred_at set not null;
alter table app.support_tickets alter column occurred_at set default now();
alter table app.support_tickets drop column if exists time_label;
alter table app.support_tickets drop column if exists sort_order;
create index if not exists support_tenant_time_idx
  on app.support_tickets (tenant_id, occurred_at desc);

-- ── news ────────────────────────────────────────────────────────────────────
-- Já tem `created_at`; a data de exibição passa a ser derivada dele. Mantém a
-- ordenação editorial (pinned desc, sort_order).
alter table app.news drop column if exists date_label;
