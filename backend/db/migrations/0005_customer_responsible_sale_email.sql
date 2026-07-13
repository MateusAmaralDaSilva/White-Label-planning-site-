-- ============================================================================
-- 0005_customer_responsible_sale_email.sql
-- ----------------------------------------------------------------------------
-- Campos opcionais novos (aditivos, anuláveis — não quebram dados existentes):
--   • customers.responsible — nome do responsável/contato (texto livre);
--   • sales.buyer_email     — e-mail associado à venda, para análises posteriores.
--
-- A separação de "Produtos" e "Serviços" em duas abas NÃO precisa de mudança de
-- schema: a coluna app.products.kind (produto/servico) já existe (0004).
--
-- Rode como o DONO do banco. As colunas herdam a RLS/policy já existentes das
-- tabelas; nenhum grant novo é necessário.
-- ============================================================================

set client_encoding to 'UTF8';

alter table app.customers add column if not exists responsible text;

-- citext: e-mail comparado sem diferenciar maiúsculas/minúsculas (como users.email).
alter table app.sales add column if not exists buyer_email citext;
