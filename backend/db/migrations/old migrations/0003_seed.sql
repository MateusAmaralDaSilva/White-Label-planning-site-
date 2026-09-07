-- ============================================================================
-- 0003_seed.sql — Dados de demonstração (opcional)
-- ----------------------------------------------------------------------------
-- Reproduz exatamente os mocks de src/data/*.ts, para o banco começar com o
-- mesmo conteúdo que a API serve hoje em memória. Idempotente: pode rodar de
-- novo sem duplicar (ON CONFLICT DO NOTHING).
--
-- Rode como o DONO do banco (bypassa o RLS para semear vários tenants de uma vez).
-- As senhas usam crypt()/bcrypt do pgcrypto — formato $2a$, compatível com o
-- bcryptjs usado no backend. Credenciais de teste (iguais às de data/users.ts):
--   admin@teste.com     / senha123   (tenant: teste)
--   maria@clinica.com  / senha123   (tenant: clinica)
-- ============================================================================

-- Este arquivo é UTF-8. Garantimos que o psql o interprete como UTF-8 mesmo
-- quando o client_encoding do console for outro (no Windows costuma ser WIN1252),
-- senão os acentos entram duplo-codificados (ex.: "módulo" vira "mÃ³dulo").
set client_encoding to 'UTF8';

-- ── Tenants ───────────────────────────────────────────────────────────────
insert into app.tenants (id, brand_name, brand_mark, brand_tagline, theme_id) values
  ('teste',    'Whitelabel',    'WL', 'Uma plataforma. Infinitas possibilidades.', 'light'),
  ('clinica', 'Clínica Saúde', 'CS', 'Cuidado do começo ao fim.',                 'dark')
on conflict (id) do nothing;

-- ── Módulos por tenant ──────────────────────────────────────────────────────
insert into app.modules (tenant_id, module_id, enabled, sort_order) values
  ('teste', 'home',      true,  0),
  ('teste', 'dashboard', true,  1),
  ('teste', 'products',  true,  2),
  ('teste', 'calendar',  true,  3),
  ('teste', 'customers', false, 4),
  ('teste', 'reports',   false, 5),
  ('teste', 'support',   false, 6),
  ('teste', 'activity',  true,  7),

  ('clinica', 'home',      true,  0),
  ('clinica', 'dashboard', true,  1),
  ('clinica', 'calendar',  true,  2),
  ('clinica', 'customers', true,  3),
  ('clinica', 'support',   true,  4),
  ('clinica', 'products',  false, 5),
  ('clinica', 'reports',   false, 6),
  ('clinica', 'activity',  true,  7)
on conflict (tenant_id, module_id) do nothing;

-- ── Usuários ──────────────────────────────────────────────────────────────
insert into app.users (id, tenant_id, email, name, password_hash) values
  ('u-1', 'teste',    'admin@teste.com',    'Admin teste', '$2a$10$6G65H4GikW4917xqNCXC4eASc2ESvz1dkEY7das470chbsRJNCvtm'),
  ('u-2', 'clinica', 'maria@clinica.com', 'Maria Clínica', '$2a$10$6G65H4GikW4917xqNCXC4eASc2ESvz1dkEY7das470chbsRJNCvtm')
on conflict (id) do nothing;

-- ============================================================================
-- Conteúdo do tenant `teste` (o `clinica` começa sem dados de negócio, como no
-- mock: forTenant() retorna undefined → listas vazias / 404).
-- ============================================================================

-- ── Notícias ─────────────────────────────────────────────────────────────
insert into app.news (id, tenant_id, title, body, date_label, category, pinned, sort_order) values
  ('n-004', 'teste', 'Novo módulo de Relatórios disponível',
   'Agora é possível ativar o módulo de Relatórios em "Configurar módulos" e acompanhar vendas, receita e desempenho em tempo real.',
   '30 jun 2026', 'novidade', true, 0),
  ('n-003', 'teste', 'Temas claro e escuro',
   'Escolha entre os temas claro e escuro pelo seletor no topo da tela. Sua preferência fica salva automaticamente.',
   '28 jun 2026', 'atualizacao', false, 1),
  ('n-002', 'teste', 'Manutenção programada',
   'No dia 05/07, das 02h às 04h, a plataforma poderá ficar indisponível por instabilidades durante uma atualização de infraestrutura.',
   '25 jun 2026', 'manutencao', false, 2),
  ('n-001', 'teste', 'Bem-vindo à plataforma',
   'Sua conta está pronta. Explore as ferramentas disponíveis abaixo e personalize os módulos conforme a necessidade do seu negócio.',
   '20 jun 2026', 'aviso', false, 3)
on conflict (id) do nothing;

-- ── Atividades (mais recente primeiro) ──────────────────────────────────────
insert into app.activity_events (id, tenant_id, type, title, customer, amount, date_label, time_label, sort_order) values
  ('a-014', 'teste', 'sale',        'Tênis Runner Pro × 1',            'Ana Paula S.', 349.90, 'Hoje',        '14:32', 0),
  ('a-013', 'teste', 'payment',     'Pagamento #1042 recebido',        'Ana Paula S.', 349.90, 'Hoje',        '14:33', 1),
  ('a-012', 'teste', 'appointment', 'Corte agendado — 16h',            'Beatriz N.',   null,   'Hoje',        '11:20', 2),
  ('a-011', 'teste', 'customer',    'Novo cliente cadastrado',         'Beatriz N.',   null,   'Hoje',        '11:18', 3),
  ('a-010', 'teste', 'support',     'Chamado #082 aberto',             'Carlos M.',    null,   'Hoje',        '09:05', 4),
  ('a-009', 'teste', 'payment',     'Pagamento #1039 recebido',        'Fernanda L.',  149.70, 'Ontem',       '18:45', 5),
  ('a-008', 'teste', 'sale',        'Camiseta Básica × 3',             'Fernanda L.',  149.70, 'Ontem',       '18:44', 6),
  ('a-007', 'teste', 'sale',        'Jaqueta Jeans × 1',               'Roberto A.',   259.00, 'Ontem',       '16:10', 7),
  ('a-006', 'teste', 'product',     'Preço atualizado — Tênis Runner Pro', null,       null,   'Ontem',       '10:22', 8),
  ('a-005', 'teste', 'appointment', 'Consulta agendada — Dr. Silva',   'Patrícia C.',  null,   '29 jun 2026', '15:00', 9),
  ('a-004', 'teste', 'sale',        'Boné Trucker × 2',                'Carlos M.',    119.80, '29 jun 2026', '13:37', 10),
  ('a-003', 'teste', 'customer',    'Novo cliente cadastrado',         'Roberto A.',   null,   '29 jun 2026', '09:50', 11),
  ('a-002', 'teste', 'support',     'Chamado #080 resolvido',          'Fernanda L.',  null,   '29 jun 2026', '08:30', 12),
  ('a-001', 'teste', 'sale',        'Camiseta Estampada × 1',          'Patrícia C.',  79.90,  '29 jun 2026', '08:12', 13)
on conflict (id) do nothing;

-- ── Notificações ────────────────────────────────────────────────────────────
insert into app.notifications (id, tenant_id, title, description, time_label, tone, icon_key, sort_order) values
  ('nt-005', 'teste', 'Nova venda',                'Ana Paula S. comprou Tênis Runner Pro (R$ 349,90)', 'há 5 min', 'accent',  'sale',         0),
  ('nt-004', 'teste', 'Novo chamado de suporte',   'Carlos M. abriu o chamado #082',                    'há 1h',    'danger',  'support',      1),
  ('nt-003', 'teste', 'Agendamento confirmado',    'Corte às 16h com Beatriz N.',                       'há 2h',    'info',    'appointment',  2),
  ('nt-002', 'teste', 'Novo cliente cadastrado',   'Beatriz N. entrou na sua base de clientes',         'há 3h',    'success', 'new-customer', 3),
  ('nt-001', 'teste', 'Nova notícia publicada',    'Novo módulo de Relatórios disponível',              'há 1d',    'warning', 'news',         4)
on conflict (id) do nothing;

-- ── Produtos ─────────────────────────────────────────────────────────────
insert into app.products (tenant_id, id, name, category, price, stock) values
  ('teste', 1, 'Camiseta Básica P',  'Vestuário',   79.90, 32),
  ('teste', 2, 'Calça Jeans Slim',   'Vestuário',  189.90, 14),
  ('teste', 3, 'Tênis Esportivo',    'Calçados',   299.90, 0),
  ('teste', 4, 'Boné Aba Curva',     'Acessórios',  49.90, 58),
  ('teste', 5, 'Mochila 30L',        'Acessórios', 159.90, 7)
on conflict (tenant_id, id) do nothing;

-- ── Clientes ─────────────────────────────────────────────────────────────
insert into app.customers (tenant_id, id, name, email, phone, orders, spent, accent) values
  ('teste', 1, 'Ana Paula Souza', 'ana@email.com',      '(11) 99999-0001',  8, 1240.00, '#4F78FF'),
  ('teste', 2, 'Carlos Mendes',   'carlos@email.com',   '(21) 99999-0002',  3,  450.00, '#A78BFA'),
  ('teste', 3, 'Fernanda Lima',   'fernanda@email.com', '(31) 99999-0003', 15, 3890.00, '#34D399'),
  ('teste', 4, 'Roberto Alves',   'roberto@email.com',  '(41) 99999-0004',  1,   89.90, '#FBBF24'),
  ('teste', 5, 'Patrícia Costa',  'patricia@email.com', '(51) 99999-0005', 22, 6100.00, '#F87171')
on conflict (tenant_id, id) do nothing;

-- ── Calendário (julho/2026, mês 6 base-0) ───────────────────────────────────
insert into app.calendar_events (id, tenant_id, year, month, day, label, color) values
  ('ev-1', 'teste', 2026, 6, 3,  'Reunião de equipe',   '#4F78FF'),
  ('ev-2', 'teste', 2026, 6, 8,  'Corte — Ana Paula',   '#A78BFA'),
  ('ev-3', 'teste', 2026, 6, 12, 'Entrega pedido #44',  '#34D399'),
  ('ev-4', 'teste', 2026, 6, 15, 'Consulta Dr. Silva',  '#F87171'),
  ('ev-5', 'teste', 2026, 6, 15, 'Almoço cliente',      '#FBBF24'),
  ('ev-6', 'teste', 2026, 6, 20, 'Treinamento',         '#6366F1'),
  ('ev-7', 'teste', 2026, 6, 25, 'Fechamento mensal',   '#EC4899')
on conflict (id) do nothing;

-- ── Suporte ─────────────────────────────────────────────────────────────
insert into app.support_tickets (id, tenant_id, subject, customer, status, tone, time_label, sort_order) values
  ('#082', 'teste', 'Produto não chegou',  'Ana Paula S.', 'Aberto',       'danger',  '2h atrás', 0),
  ('#081', 'teste', 'Troca de tamanho',    'Carlos M.',    'Em andamento', 'warning', '5h atrás', 1),
  ('#080', 'teste', 'Dúvida sobre frete',  'Fernanda L.',  'Resolvido',    'success', '1d atrás', 2),
  ('#079', 'teste', 'Cupom inválido',      'Roberto A.',   'Aberto',       'danger',  '1d atrás', 3),
  ('#078', 'teste', 'Cancelamento',        'Patrícia C.',  'Resolvido',    'success', '2d atrás', 4)
on conflict (id) do nothing;

-- ── Relatórios ───────────────────────────────────────────────────────────
insert into app.report_kpis (tenant_id, label, value, delta, trend, tone, icon_key, sort_order) values
  ('teste', 'Receita (mês)',  'R$ 48.250', '+12,4%', 'up',   'success', 'trend', 0),
  ('teste', 'Ticket Médio',   'R$ 124',    '+5,2%',  'up',   'accent',  'trend', 1),
  ('teste', 'Inadimplência',  '2,1%',      '-0,8%',  'down', 'danger',  'chart', 2)
on conflict do nothing;

insert into app.revenue_points (tenant_id, month, value, sort_order) values
  ('teste', 'Jan', 28000, 0),
  ('teste', 'Fev', 32000, 1),
  ('teste', 'Mar', 29500, 2),
  ('teste', 'Abr', 41000, 3),
  ('teste', 'Mai', 38500, 4),
  ('teste', 'Jun', 48250, 5)
on conflict do nothing;

insert into app.category_shares (tenant_id, name, pct, value, sort_order) values
  ('teste', 'Vestuário',  42, 20265, 0),
  ('teste', 'Calçados',   28, 13510, 1),
  ('teste', 'Acessórios', 19, 9167,  2),
  ('teste', 'Outros',     11, 5308,  3)
on conflict do nothing;

-- ── Dashboard ────────────────────────────────────────────────────────────
insert into app.dashboard_stats (tenant_id, label, value, delta, tone, icon_key, sort_order) values
  ('teste', 'Receita Total',   'R$ 48.250', '+12,4%', 'success', 'revenue',  0),
  ('teste', 'Novos Clientes',  '142',       '+8,1%',  'accent',  'customer', 1),
  ('teste', 'Pedidos',         '389',       '+5,6%',  'info',    'orders',   2),
  ('teste', 'Ticket Médio',    'R$ 124',    '+3,2%',  'warning', 'ticket',   3)
on conflict do nothing;

insert into app.dashboard_tasks (tenant_id, label, done, sort_order) values
  ('teste', 'Aprovar 3 pedidos pendentes',      false, 0),
  ('teste', 'Responder chamado #082',           false, 1),
  ('teste', 'Atualizar estoque — Tênis',        false, 2),
  ('teste', 'Enviar relatório ao financeiro',   true,  3),
  ('teste', 'Revisar preços da coleção',        true,  4)
on conflict do nothing;
