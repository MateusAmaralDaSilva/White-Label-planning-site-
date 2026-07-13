# Guia de subida — Plataforma Whitelabel

Como colocar o sistema no ar, focado **no que o código exige** (não em provedor
específico: vale local, VPS, container, PaaS…). São **três peças**:

```
┌─────────────┐   HTTP (VITE_API_URL)   ┌──────────────┐   pg (DATABASE_URL)   ┌────────────┐
│  Frontend   │ ──────────────────────► │  Backend API │ ────────────────────► │ PostgreSQL │
│ (estático)  │ ◄────── CORS ────────── │  (Node/Express)                      │  (RLS)     │
└─────────────┘                         └──────────────┘                       └────────────┘
```

- **PostgreSQL** — dados, com isolamento por tenant via RLS. Duas roles: o **dono**
  (aplica as migrations) e a **`whitelabel_app`** (a API conecta com esta).
- **Backend** (`backend/`) — API Express, **só JSON** (não serve arquivos estáticos).
- **Frontend** (`frontend/`) — SPA React que **compila para arquivos estáticos**
  (`dist/`), servidos por qualquer host estático. Fala com a API por HTTP.

> Ordem de subida: **banco → backend → frontend**. O backend não sobe sem banco
> (falha rápido); o frontend precisa saber a URL da API **no momento do build**.

---

## 0. Pré-requisitos

- **Node LTS** (18+ recomendado; 20+ ideal). Não há `engines` fixado.
- **PostgreSQL 14+** (usa `pgcrypto` e `citext`, criadas pelas migrations).
- **Monorepo lado a lado:** mantenha `backend/` e `frontend/` **na mesma árvore**.
  O frontend importa os tipos da API via alias `@contracts` → `../backend/src/types`
  (ver `frontend/tsconfig.json`). **O build do frontend precisa da pasta
  `backend/src/types` presente** — não dá para buildar o front a partir de uma
  cópia isolada da pasta `frontend/`. (Em runtime não há dependência: são só tipos,
  apagados no build.)

---

## 1. Banco de dados

### 1.1. Criar o banco e aplicar as migrations

Rode as migrations **como o DONO do banco** (superusuário, ex.: `postgres`) — elas
criam extensões, roles, funções `SECURITY DEFINER` e políticas de RLS. **Nunca**
aplique como `whitelabel_app`.

```bash
createdb whitelabel

# aplique 0001 → 0019 EM ORDEM (0003_seed é opcional — dados de demonstração)
psql -U postgres -d whitelabel -f db/migrations/0001_schema.sql
psql -U postgres -d whitelabel -f db/migrations/0002_security.sql      # cria a role whitelabel_app + RLS
psql -U postgres -d whitelabel -f db/migrations/0003_seed.sql          # OPCIONAL (demo)
# … 0004 até 0018 …
psql -U postgres -d whitelabel -f db/migrations/0019_verify_credentials.sql
```

A lista completa e ordenada está em **`backend/db/README.md`** (seção "Como
aplicar"). No **Windows**, se `psql` não estiver no PATH, chame pelo caminho
completo, ex.: `& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres …`.

> **Aplicar em banco já existente:** rode só as migrations novas (ex.: a `0019`).
> Elas são idempotentes o suficiente (`if exists`, `create or replace`, grants
> re-aplicáveis).

### 1.2. Definir a senha da role da aplicação

A `0002` cria a role `whitelabel_app` com uma **senha placeholder**. Troque-a e use
a mesma no `DATABASE_URL` do backend:

```sql
-- como o dono do banco
alter role whitelabel_app with password 'UMA-SENHA-FORTE-AQUI';
```

A `whitelabel_app` é de **menor privilégio** (`NOSUPERUSER`, `NOBYPASSRLS`, sem DDL).
É isso que garante que o RLS sempre se aplique — por isso a API **tem que** conectar
com ela, e não com o dono.

### 1.3. Trocar a senha do admin de plataforma (se usou o seed)

O seed cria um admin de plataforma com senha **placeholder**. Antes de qualquer uso
real, troque (ver `backend/db/README.md` → "Troque a senha do admin"):

```sql
update app.users
   set password_hash = crypt('SUA-SENHA-FORTE', gen_salt('bf', 12))
 where email = 'silvaamaralmateus@gmail.com';
```

---

## 2. Backend (API)

### 2.1. Variáveis de ambiente (`backend/.env`)

Copie o exemplo e ajuste: `cp backend/.env.example backend/.env`.

| Variável          | Obrigatória         | O que é / cuidado                                                                                                                                                                                                                                 |
| ------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | **Sim**        | `postgres://whitelabel_app:SENHA@host:5432/whitelabel`. **Role da app, não o dono.** Sem ela a API **não sobe** (falha rápido).                                                                                                   |
| `JWT_SECRET`     | **Sim (prod)** | Segredo forte e aleatório. Com`NODE_ENV=production` **e** `JWT_SECRET` ausente, a API aborta. ⚠️ Ela **não** detecta se você deixou o *valor placeholder* — troque de verdade (quem tiver o segredo forja token de admin). |
| `NODE_ENV`       | Recomendado          | Defina`production` no deploy — habilita o fail-fast do `JWT_SECRET` e o modo de produção do Express.                                                                                                                                        |
| `CORS_ORIGINS`   | **Sim (prod)** | Lista separada por vírgula das origens do**frontend** (esquema+host+porta exatos, ex.: `https://app.seudominio.com`). Origem fora da lista é bloqueada.                                                                                  |
| `PORT`           | Não                 | Porta HTTP (padrão`4000`).                                                                                                                                                                                                                      |
| `JWT_EXPIRES_IN` | Não                 | Validade do token (padrão`7d`).                                                                                                                                                                                                                 |
| `TRUST_PROXY`    | Atrás de proxy      | Se a API fica atrás de proxy/load balancer, defina (ex.:`1`) para o **rate-limit do login** ler o IP real (`X-Forwarded-For`). Vazio = conexão direta.                                                                                 |
| `DB_POOL_MAX`    | Não                 | Máx. de conexões do pool**por instância** (padrão `10`). Reduza se rodar muitas instâncias (N × max no Postgres).                                                                                                                    |

### 2.2. Build e execução

```bash
cd backend
npm ci
npm run build       # tsc → dist/
npm start           # node dist/index.js  (lê o .env; precisa do DATABASE_URL)
```

- Em dev: `npm run dev` (reload automático).
- **Health check:** `GET /health` → `{ "status": "ok" }` (use no load balancer).

---

## 3. Frontend (SPA)

### 3.1. A URL da API é fixada **no build** (atenção!)

O Vite embute `import.meta.env.VITE_API_URL` **no momento do `build`**. Ou seja:
defina `VITE_API_URL` **antes** de buildar; se a URL da API mudar, **rebuild**. Não
adianta setar em runtime.

```bash
# frontend/.env  (ou variável de ambiente do CI)
VITE_API_URL=https://api.seudominio.com
```

### 3.2. Build

```bash
cd frontend
npm ci
npm run build       # tsc && vite build → dist/   (precisa de ../backend/src/types — ver §0)
```

### 3.3. Servir o `dist/`

O `dist/` é estático — sirva por qualquer host de arquivos (nginx, um CDN, etc.).
**Dois pontos obrigatórios:**

1. **Fallback de SPA:** o roteamento é client-side (React Router). Qualquer rota
   desconhecida (ex.: `/admin`, `/equipe`) deve devolver o **`index.html`** (senão dá
   404 ao recarregar numa rota interna). No nginx: `try_files $uri /index.html;`.
2. A origem onde o frontend é servido tem que estar em `CORS_ORIGINS` no backend.

Para testar o build localmente: `npm run preview` (serve o `dist/` em `:4173`).

---

## 4. Checklist de segurança antes de produção

- [ ] `DATABASE_URL` usa **`whitelabel_app`** (não o dono do banco).
- [ ] Senha da role `whitelabel_app` trocada (§1.2) e igual no `DATABASE_URL`.
- [ ] `JWT_SECRET` = valor forte/aleatório (não o placeholder) + `NODE_ENV=production`.
- [ ] Senha do admin de plataforma trocada (§1.3) — se usou o seed.
- [ ] `CORS_ORIGINS` lista só as origens reais do frontend.
- [ ] `TRUST_PROXY` definido se houver proxy/LB na frente.
- [ ] Migration **`0019`** aplicada (senão o login quebra — é ela que cria
  `verify_credentials`, que substituiu a antiga função de auth).
- [ ] HTTPS ponta a ponta (o JWT viaja como Bearer; a senha vai no corpo do login).

---

## 5. Subindo e validando (resumo)

1. **Banco** no ar → migrations 0001–0019 aplicadas → senhas trocadas.
2. **Backend**: `.env` pronto → `npm run build` → `npm start`. Confira `GET /health`.
3. **Frontend**: `VITE_API_URL` apontando para a API → `npm run build` → servir `dist/`
   com fallback de SPA.
4. **Teste de ponta a ponta:** abra o frontend, faça login (usuário real ou, se
   usou o seed, `admin@acme.com` / `senha123`). Login OK = token → `GET /api/config`
   → painel carrega. Se o login falhar, cheque nesta ordem: `CORS_ORIGINS`
   (erro de origem no console do browser), `DATABASE_URL`/migration 0019 (erro 500
   no `/api/auth/login`), `VITE_API_URL` (o front chamando a URL errada).

---

## 6. Detalhes específicos deste código (o que costuma pegar)

- **`VITE_API_URL` é build-time**, não runtime — a causa nº 1 de "funciona local, quebra
  no deploy". Rebuild ao mudar a URL da API.
- **Frontend depende de `backend/src/types` no build** (alias `@contracts`). Buildar o
  front sem a pasta do backend ao lado falha no `tsc`.
- **Migrations rodam como o dono; a API conecta como `whitelabel_app`.** Misturar os
  dois quebra o RLS (o dono tem BYPASS implícito em algumas operações) ou nega
  permissões à API.
- **A ordem das migrations importa** e é sequencial (0001→0019). Aplique todas; em
  banco existente, só as novas.
- **`whitelabel_app` não lê a coluna `password_hash`** (desde a 0019) — o login é
  verificado dentro do banco por `app.verify_credentials`. Se você criar scripts que
  leem `app.users` com essa role, não selecione `password_hash` (vai dar permissão
  negada — de propósito).
- **Rate-limit do login é em memória, por instância.** Com várias instâncias, cada uma
  tem seu balde (aceitável; para um limite global, trocar por Redis no futuro).
- **Fuso**: rótulos de tempo relativo ("há 5 min") são calculados em **BRT fixo**
  (`backend/src/lib/relative-time.ts`), independente do fuso do servidor.
- **Corpo de request**: 2 MB só em `/api/admin` (logo em base64); 256 KB no resto.
  Se a logo de uma conta não subir, é o limite — está no `index.ts`.

---


## 8. Mudanças1 no código (o ciclo editar → subir)

### 8.1. Sua conta de admin de plataforma (trocar e-mail/senha, promover)

Diferente das contas de cliente, **o admin geral não tem tela para editar a si
mesmo** — ele é uma linha em `app.users` com `is_platform_admin = true`. Essas
operações são **SQL, como o DONO do banco** (a role `whitelabel_app` nem enxerga
usuários fora de um contexto de tenant).

**Trocar o seu e-mail de admin:**

```sql
-- como o DONO do banco (ex.: -U postgres), NÃO como whitelabel_app
update app.users
   set email = 'novo-email@dominio.com'
 where email = 'silvaamaralmateus@gmail.com';   -- e-mail atual
-- (ou: where is_platform_admin = true — cuidado se houver mais de um admin)
```

Cuidados:

- **`email` é `citext` + `unique`:** case-insensitive e não pode colidir com outro
  usuário — se já existir alguém com esse e-mail, o UPDATE falha (unique violation).
- **Sua sessão não quebra:** o token usa o **id** (`sub`), não o e-mail, e o
  `loadCurrentUser` relê por id a cada request. A troca vale no **próximo login**,
  que aí usa o **novo e-mail**. A **senha não muda**.
- **Se um dia re-rodar o seed (`0003`)**, ele referencia o e-mail antigo — em produção
  normalmente não se re-roda o seed; se for o caso, ajuste-o para manter coerência.

**Operações vizinhas** (mesmas regras — SQL como dono; detalhes em `backend/db/README.md`):

```sql
-- trocar a SENHA do admin (hash gerado no banco, formato bcrypt)
update app.users set password_hash = crypt('SUA-SENHA-FORTE', gen_salt('bf', 12))
 where email = 'novo-email@dominio.com';
-- promover / revogar um admin de plataforma
update app.users set is_platform_admin = true  where email = 'fulano@empresa.com';
update app.users set is_platform_admin = false where email = 'fulano@empresa.com';
```

### 8.2. Onde mora cada coisa

| Quero mexer em…                        | Arquivo(s)                                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Endpoint de dados do tenant             | `backend/src/routes/data/<domínio>.routes.ts`                                                                |
| Endpoint do admin de plataforma         | `backend/src/routes/admin/…`                                                                                 |
| Regra de negócio / acesso ao banco     | `backend/src/db/repositories/<x>.repo.ts` (**único** lugar que fala com o banco; validação zod aqui) |
| Schema do banco                         | `backend/db/migrations/` (**só via migration nova** — ver 8.3)                                        |
| Formato dos dados da API (tipos)        | `backend/src/types/<domínio>.ts` → chega ao front via `@contracts`                                        |
| Uma tela de negócio                    | `frontend/src/modules/<x>/` (casca `index.tsx` + seções)                                                  |
| Login / admin / equipe                  | `frontend/src/pages/login                                                                                       |
| Campo de formulário / andaime          | `frontend/src/components/ui/FormFields`, `hooks/useResourceForm`                                            |
| Novo**módulo** ou **tema** | ver`frontend/ARCHITECTURE.md` §7 (registry / `config/themes/`)                                             |

### 8.3. O que cada mudança exige (matriz)

| Mudei…                                                         | Preciso                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Só lógica/rota/repo do**backend** (sem tocar no schema) | `cd backend && npm run build` → reiniciar a API                                               |
| **Schema** do banco (tabela, coluna, função, RLS…)     | **Nova migration** aplicada como dono (8.3) **+** rebuild do backend se o repo mudou |
| Um**tipo de contrato** (`backend/src/types/*`)          | Rebuild do**backend E do frontend** (o front consome via `@contracts`)                   |
| Só o**frontend** (tela, estilo, novo módulo/tema)       | `cd frontend && npm run build` → republicar o `dist/`                                       |
| **`VITE_API_URL`** (URL da API)                         | Rebuild do**frontend** (é build-time)                                                     |
| **`CORS_ORIGINS`** / outras env do backend              | Editar o`.env` → **reiniciar** a API (não precisa rebuild)                             |

### 8.4. Regras de ouro

- **Nunca edite uma migration já aplicada.** Migrations são um histórico imutável.
  Para mudar o schema, crie a **próxima** (`db/migrations/00NN_descricao.sql`),
  aplique-a como **dono** do banco e acrescente-a na lista do `backend/db/README.md`.
  (Editar uma antiga faz o seu banco divergir de qualquer outro que já a aplicou.)
- **Tipo de contrato define-se UMA vez** no backend (`src/types/`) — o front nunca
  redefine; importa de `@contracts`. Mudou o backend, os dois lados enxergam.
- **`VITE_API_URL` é build-time** — mudou a URL da API, **rebuild** do front.
- **Sempre `npm run build` antes de subir** (ele roda o `tsc`): erro de tipo é pego
  no build, não em produção.
- **Migration nova em produção:** aplique-a **antes** de subir o backend novo que
  depende dela (senão a API nova bate num schema antigo). Ex.: foi o caso da `0019`.

---

Para o "porquê" de cada peça, veja `backend/README.md`, `backend/db/README.md`,
`backend/GUIA.md` e `frontend/ARCHITECTURE.md` / `frontend/GUIA.md`.
