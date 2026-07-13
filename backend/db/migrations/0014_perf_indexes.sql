-- ============================================================================
-- 0014_perf_indexes.sql — Índices de performance (FKs sem índice)
-- ----------------------------------------------------------------------------
-- Ajuste de escalabilidade sem mudança de contrato: cria o índice que faltava na
-- coluna de chave estrangeira `app.calendars.owner_user_id`.
--
-- Por quê: a FK `owner_user_id -> app.users(id)` é `ON DELETE CASCADE`. Sem um
-- índice na coluna que REFERENCIA, apagar um usuário obriga o PostgreSQL a fazer
-- um sequential scan em `app.calendars` para achar as agendas do dono (e o mesmo
-- vale para os filtros de visibilidade privada `owner_user_id = <usuário>`). Com
-- o índice, vira lookup direto. Volume hoje é baixo, mas o índice elimina o risco
-- de scan crescer junto com o número de agendas.
--
-- `if not exists` torna a migration idempotente. Rode como o DONO do banco.
-- ============================================================================

set client_encoding to 'UTF8';

create index if not exists calendars_owner_idx
  on app.calendars (owner_user_id);
