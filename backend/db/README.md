# Banco de dados — Plataforma Whitelabel

Este diretório contém o código do PostgreSQL usado pela plataforma: migrations, documentação de segurança e artefatos do diagrama ER. A API não usa mocks em memória; seus repositórios acessam o schema `app` através do PostgreSQL.

Documentação relacionada:

- [Backend README](../README.md): processo da API, rotas e ambiente.
- [DEPLOY.md](../../DEPLOY.md): Docker e operação de produção.
- [ER whitelabel.png](ER%20whitelabel.png): diagrama visual atual disponível no repositório.

## Modelo de segurança

O modelo tem quatro camadas:

1. **JWT define o tenant.** O `tenantId` é obtido do token assinado; o cliente não escolhe o tenant por corpo ou query string.
2. **Transação com contexto.** `backend/src/db/tenant-context.ts` abre a transação e executa `set_config('app.current_tenant', ..., true)`, equivalente a `SET LOCAL`.
3. **RLS isola linhas.** As tabelas de negócio filtram `tenant_id` com `app.current_tenant()`.
4. **Role de menor privilégio.** A API conecta como `whitelabel_app`, com `NOBYPASSRLS` e sem DDL. O dono do banco aplica migrations e executa tarefas administrativas.

As consultas dos repositórios são parametrizadas. As funções `SECURITY DEFINER` estreitas são usadas para autenticação e operações do administrador de plataforma que precisam atravessar tenants.

### Autenticação de senha

A migration `0019_verify_credentials.sql` introduziu `app.verify_credentials(email, senha)`. A comparação acontece dentro do banco e devolve apenas o usuário público; o hash não deve sair do PostgreSQL e a role da aplicação não deve selecionar `password_hash` diretamente.

## Migrations atuais

O conjunto atual é o conteúdo de `backend/db/migrations/*.sql` na raiz dessa pasta. A pasta `old migrations/` é histórica e não deve ser incluída automaticamente.

| Arquivo | Responsabilidade |
| --- | --- |
| `0000_migrationtest.sql` | Arquivo vazio de teste/histórico; não altera o schema. |
| `0001_schema.sql` | Cria schema `app`, extensões, enums, tabelas, índices, triggers e funções base. |
| `0002_security.sql` | Cria a role `whitelabel_app`, grants, RLS, funções de contexto e limites de recurso. |
| `0004_sales_expenses.sql` | Adiciona tipo/custo de produto, vendas e despesas. |
| `0005_customer_responsible_sale_email.sql` | Adiciona responsável opcional de cliente e e-mail opcional da venda. |
| `0006_billing_admin.sql` | Adiciona billing por tenant, admin de plataforma e funções administrativas iniciais. |
| `0007_fix_find_user_for_auth.sql` | Corrige a função de autenticação criada na migration anterior. |
| `0008_brand_logo.sql` | Adiciona logo da conta e atualiza funções administrativas de conta. |
| `0009_admin_list_users.sql` | Adiciona listagem de logins de uma conta no painel admin. |
| `0010_calendars.sql` | Adiciona múltiplas agendas, eventos e visibilidade de agendas privadas. |
| `0011_tenant_admin_seats.sql` | Adiciona admin do tenant e limite de logins por conta. |
| `0012_admin_set_tenant_admin.sql` | Permite ao admin de plataforma promover/rebaixar admin do tenant. |
| `0013_platform_billing.sql` | Adiciona ledger de cobranças, despesas da plataforma e analytics financeiro. |
| `0014_perf_indexes.sql` | Adiciona índice para a FK de dono da agenda. |
| `0015_temporal_timestamps.sql` | Troca rótulos temporais estáticos por timestamps reais e índices de tempo. |
| `0016_tenant_industry.sql` | Adiciona ramo/setor ao tenant e às funções administrativas. |
| `0017_industry_freeform.sql` | Torna o ramo texto livre e normaliza os dados existentes. |
| `0018_slim_find_user_for_auth.sql` | Remove dados de billing desnecessários do retorno antigo de autenticação. |
| `0019_verify_credentials.sql` | Move a verificação de senha para o banco e remove a leitura do hash pela role da aplicação. |
| `0020_drop_brand_tagline.sql` | Remove `brand_tagline` de tenants e das funções de criação/edição de contas. |
| `0021_default_dashboard.sql` | Cria o dashboard padrão de novos tenants, corrige tenants sem dados e centraliza os cards/tarefas iniciais em `app.ensure_default_dashboard`. |
| `0022_tenant_contact_identity.sql` | Adiciona telefone e CNPJ da empresa em `app.tenants` e atualiza as funções administrativas. |

### Sobre o antigo `0003_seed.sql`

`0003_seed.sql` não está mais na pasta atual. Dados de demonstração e contas de teste agora são inseridos por [`backend/scripts/bootstrap.js`](../scripts/bootstrap.js), executado pelo serviço `seeder` no Docker Compose. Não recrie ou aplique um `0003` histórico sem verificar o estado real do banco.

## Dashboard padrão de uma conta

A criação de uma conta chama `app.admin_create_account`, que habilita o módulo `dashboard` e chama `app.ensure_default_dashboard`. A função é idempotente: se o tenant já possui cards ou tarefas, não substitui os dados existentes.

O padrão inicial contém quatro cards em `app.dashboard_stats` e três tarefas em `app.dashboard_tasks`. A migration `0021` também percorre os tenants existentes, exceto o tenant técnico `platform`, e preenche o dashboard somente quando as tabelas estão vazias.

Para mudar o padrão para novas contas, crie uma migration posterior e altere `app.ensure_default_dashboard`. Para personalizar um único cliente, altere apenas as linhas daquele `tenant_id` por uma operação administrativa controlada ou implemente uma tela/endpoint administrativo específico. Não edite uma migration aplicada e não coloque uma necessidade individual dentro do padrão global.

## Aplicação manual

A criação do banco e a aplicação de migrations devem ocorrer como dono do PostgreSQL. A aplicação depois deve usar `whitelabel_app`.

Exemplo a partir da pasta `backend/` em ambiente Unix:

```bash
createdb whitelabel

for file in db/migrations/*.sql; do
  echo "Aplicando $file"
  psql -U postgres -d whitelabel -f "$file" || exit 1
done
```

No PowerShell:

```powershell
createdb whitelabel

Get-ChildItem .\db\migrations\*.sql | Sort-Object Name | ForEach-Object {
  Write-Host "Aplicando $($_.Name)..."
  & psql -U postgres -d whitelabel -f $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Falha em $($_.Name)" }
}
```

Depois:

1. Troque a senha placeholder da role `whitelabel_app` por um segredo forte.
2. Configure `DATABASE_URL` do backend com essa role, não com `postgres`.
3. Configure os demais valores do backend e inicie a API.
4. Se dados de demonstração forem necessários, execute o bootstrap com `ADMIN_TEMP_PASSWORD` definido e uma conexão temporária com privilégios suficientes.

Não coloque senhas, hashes, JWT secrets ou URLs com credenciais neste README ou no Git.

## Docker Compose

O fluxo de [docker-compose.yml](../../docker-compose.yml) é:

```text
db → migrator → seeder
             ↘ backend → frontend/nginx
```

- `db` executa PostgreSQL e mantém o volume `pgdata`.
- `migrator` cria o banco `whitelabel` se necessário e aplica todos os `*.sql` montados em `/migrations` em ordem lexical.
- `seeder` executa `backend/scripts/bootstrap.js` com a conexão temporária do superusuário e `ADMIN_TEMP_PASSWORD`.
- `backend` conecta com `whitelabel_app` e expõe a API na porta `4000` dentro da rede Docker.
- `frontend` serve a SPA pelo nginx e encaminha `/api/` para o backend.

O migrator atual reaplica todos os arquivos da pasta em cada execução. Use esse fluxo principalmente para um banco novo; em um volume existente, confira quais migrations já foram aplicadas antes de executar uma migration nova manualmente. Nunca use a role da aplicação para aplicar DDL.

## Principais entidades

O schema `app` concentra:

- `tenants`, `users` e `modules`: identidade, logins, branding, billing e configuração de módulos.
- `products`, `customers`, `sales` e `expenses`: operação comercial.
- `calendars` e `calendar_events`: agendas e compromissos.
- `dashboard_stats`, `dashboard_tasks`, `activity_events`, `notifications`, `news` e `support_tickets`: painel, feeds e suporte.
- `billing_events` e `platform_expenses`: financeiro do administrador de plataforma.

O contrato público usado pelo frontend não é duplicado no banco: os tipos da API ficam em `backend/src/types/` e são importados pelo frontend via alias `@contracts`.

## Regras para mudanças

- Migrations aplicadas são histórico imutável. Para qualquer alteração, crie o próximo arquivo numerado.
- Aplique a migration antes de publicar o backend que depende dela.
- Atualize o repositório e os tipos compartilhados quando mudar tabela, função ou retorno.
- Verifique RLS, grants, constraints, índices e funções `SECURITY DEFINER` em mudanças de schema.
- Não conceda à role `whitelabel_app` privilégios de dono, `BYPASSRLS` ou DDL.
- Após mudar `backend/src/types/`, faça build do backend e do frontend.

## Diagnóstico

| Sintoma | Primeiras verificações |
| --- | --- |
| API não inicia | `DATABASE_URL`, PostgreSQL acessível e migrations `0001`/`0002` aplicadas. |
| Login retorna erro 500 | `0019_verify_credentials.sql`, função `app.verify_credentials` e permissões da role da aplicação. |
| Tenant não vê dados | JWT, `tenant-context.ts`, `app.current_tenant` e políticas RLS. |
| Logo ou conta não salva | Limite de body de `/api/admin`, migration `0008`, função administrativa e payload validado. |
| Assinatura bloqueia o painel | `paid_until`, `getCurrentUser`, `GET /api/config` e middleware de subscription. |
| Migration não encontrada | Confirme que o arquivo está em `backend/db/migrations/` e não apenas em `old migrations/`. |

## Artefatos ER

`ER whitelabel.png` é uma visualização do modelo e `ER whitelabel.pgerd` é o arquivo-fonte do diagrama. O SQL das migrations continua sendo a fonte de verdade; atualize o diagrama quando o schema mudar, mas não use a imagem para aplicar alterações.
