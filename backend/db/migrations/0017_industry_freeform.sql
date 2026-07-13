-- ============================================================================
-- 0017_industry_freeform.sql — Ramo vira texto livre (sugestões vindas dos dados)
-- ----------------------------------------------------------------------------
-- A 0016 introduziu `tenants.industry` como um id de LISTA FIXA (enum no app),
-- o que obrigava a manter a lista sincronizada em dois lugares (frontend + backend).
-- Passamos a tratar o ramo como TEXTO LIVRE: o valor guardado é o próprio rótulo,
-- e o /admin sugere no campo os ramos JÁ USADOS por outras contas (derivados dos
-- dados — `select distinct industry`). Assim não há lista fixa em código para
-- sincronizar; digitar um ramo novo passa a sugeri-lo nas próximas contas.
--
-- Não há mudança de SCHEMA (a coluna já é `text`): esta migração só NORMALIZA os
-- valores demo que a 0016 gravou como id ('varejo'/'saude') para o rótulo de
-- exibição, agora que o valor é o texto mostrado. Idempotente. Rode como o DONO.
--
-- Trade-off assumido: texto livre permite grafias duplicadas ("Varejo" vs
-- "varejo"). Mitigado por mostrar os ramos existentes no campo (reuso fácil).
-- ============================================================================

set client_encoding to 'UTF8';

update app.tenants set industry = 'Varejo e Comércio' where id = 'acme'    and industry in ('varejo');
update app.tenants set industry = 'Saúde'             where id = 'clinica' and industry in ('saude');
