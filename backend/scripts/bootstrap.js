import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrapUsers() {
  console.log('⏳ Iniciando Bootstrap de Usuários e Dados de Demonstração...');

  const adminPassword = process.env.ADMIN_TEMP_PASSWORD;
  if (!adminPassword) {
    console.error('❌ ERRO CRÍTICO: Variável ADMIN_TEMP_PASSWORD não definida no .env');
    console.error('👉 O bootstrap foi abortado para não criar um admin com senha exposta.');
    process.exit(1);
  }

  try {
    // -------------------------------------------------------------------------
    // 1. BOOTSTRAP DO TENANT DE ADMINISTRAÇÃO ('platform')
    // -------------------------------------------------------------------------
    await pool.query(`
      INSERT INTO app.tenants (id, brand_name, brand_mark, theme_id, plan, paid_until)
      VALUES (
        'platform', 'Administração', 'AD',
        'dark', null,
        '2999-12-31 00:00:00+00'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Módulo obrigatório para o admin conseguir logar e ver o painel
    await pool.query(`
      INSERT INTO app.modules (tenant_id, module_id, enabled, sort_order)
      VALUES ('platform', 'home', true, 0)
      ON CONFLICT (tenant_id, module_id) DO NOTHING;
    `);

    const adminHash = await bcrypt.hash(adminPassword, 10);
    const adminRes = await pool.query(`
      INSERT INTO app.users (id, tenant_id, email, name, password_hash, is_platform_admin)
      VALUES ('u-admin', 'platform', 'silvaamaralmateus@gmail.com', 'Administrador', $1, true)
      ON CONFLICT (id) DO NOTHING;
    `, [adminHash]);

    if (adminRes.rowCount > 0) console.log('✅ Administrador Mestre criado (Tenant: platform)');


    // -------------------------------------------------------------------------
    // 2. BOOTSTRAP DOS TENANTS E USUÁRIOS DE TESTE
    // -------------------------------------------------------------------------
    const testPasswordHash = await bcrypt.hash('senha123', 10);

    // Tenant 'teste'
    await pool.query(`
      INSERT INTO app.tenants (id, brand_name, brand_mark, theme_id, plan, paid_until)
      VALUES ('teste', 'Whitelabel', 'WL', 'light', 'anual', now() + interval '1 year')
      ON CONFLICT (id) DO NOTHING;
    `);

    const testeRes = await pool.query(`
      INSERT INTO app.users (id, tenant_id, email, name, password_hash, is_platform_admin)
      VALUES ('u-1', 'teste', 'admin@teste.com', 'Admin teste', $1, false)
      ON CONFLICT (id) DO NOTHING;
    `, [testPasswordHash]);
    if (testeRes.rowCount > 0) console.log('✅ Usuário de teste criado (admin@teste.com)');

    // Tenant 'clinica'
    await pool.query(`
      INSERT INTO app.tenants (id, brand_name, brand_mark, theme_id, plan, paid_until)
      VALUES ('clinica', 'Clínica Saúde', 'CS', 'dark', 'anual', now() + interval '1 year')
      ON CONFLICT (id) DO NOTHING;
    `);

    // O dashboard padrão fica centralizado na função SQL da migration 0021,
    // para que contas criadas pelo admin e contas de demonstração usem a mesma
    // fonte de verdade sem duplicar cards/tarefas neste script.
    for (const tenantId of ['teste', 'clinica']) {
      await pool.query('select app.ensure_default_dashboard($1)', [tenantId]);
    }

    const clinicaRes = await pool.query(`
      INSERT INTO app.users (id, tenant_id, email, name, password_hash, is_platform_admin)
      VALUES ('u-2', 'clinica', 'maria@clinica.com', 'Maria Clínica', $1, false)
      ON CONFLICT (id) DO NOTHING;
    `, [testPasswordHash]);
    if (clinicaRes.rowCount > 0) console.log('✅ Usuário de teste criado (maria@clinica.com)');


    // -------------------------------------------------------------------------
    // 3. INSERÇÃO DOS DADOS DE DEMONSTRAÇÃO (Mocks / Seed)
    // -------------------------------------------------------------------------
    console.log('⏳ Inserindo dados de demonstração (Dashboard, Módulos, etc)...');

    await pool.query(`
      -- ── Módulos por tenant ──────────────────────────────────────────────────────
      INSERT INTO app.modules (tenant_id, module_id, enabled, sort_order) VALUES
        ('teste', 'home', true, 0), ('teste', 'dashboard', true, 1), ('teste', 'products', true, 2),
        ('teste', 'calendar', true, 3), ('teste', 'customers', false, 4), ('teste', 'reports', false, 5),
        ('teste', 'support', false, 6), ('teste', 'activity', true, 7),
        ('clinica', 'home', true, 0), ('clinica', 'dashboard', true, 1), ('clinica', 'calendar', true, 2),
        ('clinica', 'customers', true, 3), ('clinica', 'support', true, 4), ('clinica', 'products', false, 5),
        ('clinica', 'reports', false, 6), ('clinica', 'activity', true, 7)
      ON CONFLICT (tenant_id, module_id) DO NOTHING;

      -- ── Notícias ─────────────────────────────────────────────────────────────
      -- (0015_temporal_timestamps.sql removeu date_label: a data de exibição
      -- agora vem de created_at.)
      INSERT INTO app.news (id, tenant_id, title, body, category) VALUES
        ('n-004', 'teste', 'Novo módulo de Relatórios disponível', 'Agora é possível ativar o módulo de Relatórios...', 'novidade'),
        ('n-003', 'teste', 'Temas claro e escuro', 'Escolha entre os temas claro e escuro pelo seletor...', 'atualizacao'),
        ('n-002', 'teste', 'Manutenção programada', 'No dia 05/07, das 02h às 04h, a plataforma poderá ficar...', 'manutencao'),
        ('n-001', 'teste', 'Bem-vindo à plataforma', 'Sua conta está pronta. Explore as ferramentas disponíveis...', 'aviso')
      ON CONFLICT (id) DO NOTHING;

      -- ── Atividades ──────────────────────────────────────────────────────────────
      -- (0015_temporal_timestamps.sql trocou date_label/time_label/sort_order
      -- por occurred_at; o rótulo relativo é calculado na leitura.)
      INSERT INTO app.activity_events (id, tenant_id, type, title, customer, amount, occurred_at) VALUES
        ('a-014', 'teste', 'sale', 'Tênis Runner Pro × 1', 'Ana Paula S.', 349.90, now() - interval '0 hour'),
        ('a-013', 'teste', 'payment', 'Pagamento #1042 recebido', 'Ana Paula S.', 349.90, now() - interval '1 hour'),
        ('a-012', 'teste', 'appointment', 'Corte agendado — 16h', 'Beatriz N.', null, now() - interval '2 hour'),
        ('a-011', 'teste', 'customer', 'Novo cliente cadastrado', 'Beatriz N.', null, now() - interval '3 hour'),
        ('a-010', 'teste', 'support', 'Chamado #082 aberto', 'Carlos M.', null, now() - interval '4 hour'),
        ('a-009', 'teste', 'payment', 'Pagamento #1039 recebido', 'Fernanda L.', 149.70, now() - interval '5 hour'),
        ('a-008', 'teste', 'sale', 'Camiseta Básica × 3', 'Fernanda L.', 149.70, now() - interval '6 hour'),
        ('a-007', 'teste', 'sale', 'Jaqueta Jeans × 1', 'Roberto A.', 259.00, now() - interval '7 hour')
      ON CONFLICT (id) DO NOTHING;

      -- ── Notificações ────────────────────────────────────────────────────────────
      -- (0015_temporal_timestamps.sql trocou time_label/sort_order por occurred_at.)
      INSERT INTO app.notifications (id, tenant_id, title, description, tone, icon_key, occurred_at) VALUES
        ('nt-005', 'teste', 'Nova venda', 'Ana Paula S. comprou Tênis Runner Pro', 'accent', 'sale', now() - interval '5 minutes'),
        ('nt-004', 'teste', 'Novo chamado', 'Carlos M. abriu o chamado #082', 'danger', 'support', now() - interval '1 hour'),
        ('nt-003', 'teste', 'Agendamento', 'Corte às 16h com Beatriz N.', 'info', 'appointment', now() - interval '2 hour')
      ON CONFLICT (id) DO NOTHING;

      -- ── Produtos ─────────────────────────────────────────────────────────────
      INSERT INTO app.products (tenant_id, id, name, category, price, stock) VALUES
        ('teste', 1, 'Camiseta Básica P', 'Vestuário', 79.90, 32),
        ('teste', 2, 'Calça Jeans Slim', 'Vestuário', 189.90, 14),
        ('teste', 3, 'Tênis Esportivo', 'Calçados', 299.90, 0)
      ON CONFLICT (tenant_id, id) DO NOTHING;

      -- ── Clientes ─────────────────────────────────────────────────────────────
      INSERT INTO app.customers (tenant_id, id, name, email, phone, orders, spent, accent) VALUES
        ('teste', 1, 'Ana Paula Souza', 'ana@email.com', '(11) 99999-0001', 8, 1240.00, '#4F78FF'),
        ('teste', 2, 'Carlos Mendes', 'carlos@email.com', '(21) 99999-0002', 3, 450.00, '#A78BFA')
      ON CONFLICT (tenant_id, id) DO NOTHING;

      -- ── Calendário ───────────────────────────────────────────────────────────
      -- (0010_calendars.sql exige calendar_id; a agenda "Geral" só é criada
      -- automaticamente para tenants que já existiam naquela migração, então
      -- tenants criados depois — como este seed — precisam da própria agenda.)
      INSERT INTO app.calendars (id, tenant_id, name, color, is_private) VALUES
        ('cal-geral-teste', 'teste', 'Geral', '#4F78FF', false)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO app.calendar_events (id, tenant_id, calendar_id, year, month, day, label, color) VALUES
        ('ev-1', 'teste', 'cal-geral-teste', 2026, 6, 3, 'Reunião de equipe', '#4F78FF'),
        ('ev-2', 'teste', 'cal-geral-teste', 2026, 6, 8, 'Corte — Ana Paula', '#A78BFA')
      ON CONFLICT (id) DO NOTHING;

    `);

    console.log('✅ Dados de demonstração inseridos com sucesso!');
    console.log('🚀 Bootstrap finalizado!');

  } catch (err) {
    console.error('❌ Erro durante o bootstrap:', err);
  } finally {
    await pool.end();
  }
}

bootstrapUsers();
