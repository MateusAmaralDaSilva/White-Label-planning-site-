# Frontend — Plataforma Whitelabel

SPA React responsável pela interface da plataforma. Ela autentica o usuário na API, carrega a configuração do tenant, exibe os módulos habilitados e consome os contratos TypeScript definidos no backend.

```text
Browser → React Router → stores/hooks → lib/api.ts → Express API
```

Documentação relacionada:

- [ARCHITECTURE.md](ARCHITECTURE.md): referência técnica detalhada.
- [GUIA.md](GUIA.md): explicação didática para quem está começando.
- [Backend README](../backend/README.md): API, autenticação e banco.
- [DEPLOY.md](../DEPLOY.md): build e publicação.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Build/dev server | Vite 5 |
| UI | React 18 + TypeScript |
| Rotas | React Router 6 |
| Estado | Zustand + persistência seletiva |
| Estilo | Tailwind CSS + CSS variables semânticas |
| Drag and drop | `@dnd-kit` |
| Ícones | `lucide-react` |

## Executar localmente

Pré-requisitos: Node.js/npm e a API disponível. O frontend depende dos tipos em `../backend/src/types`, portanto a pasta `backend` precisa existir ao lado durante o build.

```bash
cd frontend
npm ci
```

Crie `frontend/.env` a partir de [`.env.example`](.env.example) e configure:

```dotenv
VITE_API_URL=http://localhost:4000
```

Comandos disponíveis:

```bash
npm run dev       # Vite em desenvolvimento
npm run build     # tsc + vite build → dist/
npm run preview   # serve o build localmente
```

`VITE_API_URL` é embutida no bundle durante o build. Alterá-la depois que `dist/` foi criado não muda a aplicação; é necessário executar o build novamente.

O cliente HTTP usa `http://localhost:4000` como fallback quando a variável não está definida. Em desenvolvimento, confira também CORS e o health check do backend em `GET /health`.

## Fluxo de inicialização

1. [`src/main.tsx`](src/main.tsx) aplica o tema persistido antes do primeiro paint, cria o React root e monta `BrowserRouter`.
2. [`src/App.tsx`](src/App.tsx) define `/login`, as guardas de autenticação e as rotas administrativas.
3. As rotas de negócio são geradas a partir de [`src/modules/registry.ts`](src/modules/registry.ts).
4. [`MainLayout.tsx`](src/layouts/MainLayout.tsx) chama `useBootstrap`.
5. [`useBootstrap.ts`](src/hooks/useBootstrap.ts) faz `GET /api/config` e aplica marca, tema, módulos e billing nos stores.
6. A tela é renderizada somente depois do bootstrap; assinatura inativa mostra `Paywall`, exceto para o administrador de plataforma.

## Rotas da aplicação

| Rota | Acesso | Origem |
| --- | --- | --- |
| `/login` | Público | `src/pages/login/` |
| `/`, `/dashboard`, `/produtos`, `/servicos`, `/vendas`, `/agendamentos`, `/clientes`, `/relatorios`, `/suporte`, `/atividades` | Usuário autenticado; podem ser desativadas por tenant | `src/modules/` + `registry.ts` |
| `/equipe` | Admin do tenant | `src/pages/team/` |
| `/admin` | Admin de plataforma | `src/pages/admin/` |

Se um módulo estiver desativado, a rota continua conhecida pelo router, mas apresenta a tela de módulo desativado. Sidebar, Home, ModuleManager e rotas usam o mesmo registry/store; não crie listas paralelas.

## Como o usuário utiliza a interface

### Login

`LoginForm` chama `POST /api/auth/login`. O `authStore` persiste o token e o usuário; `lib/api.ts` anexa o Bearer token em cada requisição autenticada. Um HTTP 401 limpa a sessão e retorna o usuário ao login.

### Módulos

O usuário abre **Configurar módulos**, liga/desliga recursos não obrigatórios e arrasta para reordenar. A alteração é otimista e é salva no backend por `PUT /api/config`; a configuração de disponibilidade não deve ser tratada como localStorage.

### Temas e marca

Os componentes usam tokens semânticos como `bg-surface`, `text-ink` e `bg-accent`. Os valores vêm do tema ativo em `src/config/themes/`. A marca e o tema do tenant chegam pelo bootstrap. A escolha manual de tema e a marca do tenant têm stores e regras de persistência diferentes.

### Áreas de negócio

| Pasta | Função |
| --- | --- |
| `modules/home` | Ferramentas ativas e notícias. |
| `modules/dashboard` | KPIs, tarefas e atividade recente. |
| `modules/products` e `modules/services` | Catálogo de produtos/serviços; usam a mesma API e distinguem `kind`. |
| `modules/sales` | Registro de vendas e histórico. |
| `modules/calendar` | Agendas, eventos e filtros. |
| `modules/customers` | Cadastro e histórico de clientes. |
| `modules/reports` | Receita, custos, lucro, clientes e rankings. |
| `modules/support` | Chamados de suporte. |
| `modules/activity` | Log de eventos do negócio. |
| `pages/team` | Gestão de logins da conta. |
| `pages/admin` | Contas, branding, usuários, créditos e financeiro da plataforma. |

### Dashboard padrão e alterações por cliente

Uma conta nova começa com o módulo Dashboard habilitado e recebe cards e tarefas iniciais pelo backend, na função `app.ensure_default_dashboard` criada pela migration `backend/db/migrations/0021_default_dashboard.sql`. O frontend apenas renderiza os dados recebidos por `GET /api/dashboard`.

O cliente pode personalizar as tarefas pela própria tela do Dashboard: criar, editar, concluir e excluir tarefas. Os cards e a composição visual são diferentes responsabilidades:

- valores e ordem dos cards: `app.dashboard_stats` no backend;
- tarefas: `app.dashboard_tasks` no backend;
- layout e componentes: `src/modules/dashboard/`;
- padrão de novas contas: `app.ensure_default_dashboard` em uma migration nova.

Se apenas um cliente precisar de um dashboard diferente, altere somente os dados daquele tenant por uma operação administrativa ou crie uma UI/API administrativa específica. Não altere o padrão global para atender uma conta individual e nunca edite uma migration já aplicada.

## Estrutura de `src/`

```text
src/
├── main.tsx                 # entrada, initTheme e BrowserRouter
├── App.tsx                  # rotas e guardas
├── index.css                # estilos globais e tokens CSS
├── config/                  # marca, planos, notícias, atividades, notificações
│   └── themes/              # contrato, temas e registry
├── lib/                     # api.ts, formatadores, ícones, cores e helpers
├── hooks/                   # useApi, useBootstrap, forms e interação
├── store/                   # auth, brand, theme, modules e notificações
├── types/                   # tipos exclusivos do frontend
├── components/
│   ├── ui/                  # primitives do design system
│   └── charts/              # gráficos de tenant e admin
├── layouts/                 # MainLayout e shell autenticado
├── modules/                 # registry + uma pasta por funcionalidade
└── pages/                   # login, equipe e administração
```

### Onde procurar uma mudança

| Quero mudar... | Arquivo/pasta inicial |
| --- | --- |
| Tela de negócio | `src/modules/<dominio>/` |
| Login, equipe ou admin | `src/pages/<area>/` |
| Botão, input, modal ou form genérico | `src/components/ui/` |
| Menu, shell ou paywall | `src/components/`, `src/layouts/` |
| Estado global | `src/store/` |
| Bootstrap do tenant | `src/hooks/useBootstrap.ts` |
| Chamada HTTP ou tratamento de 401 | `src/lib/api.ts` |
| Módulo, rota, ordem ou ícone | `src/modules/registry.ts` |
| Tema e tokens | `src/config/themes/`, `src/store/themeStore.ts`, `src/index.css` |
| Contrato da API | `../backend/src/types/`; importar via `@contracts` |

## Integração com a API

O único cliente HTTP é [`src/lib/api.ts`](src/lib/api.ts). Os hooks `useApi` são usados para leituras; formulários normalmente usam `api.post`, `api.put` e `api.del` com `useResourceForm`.

| Interface | Endpoint principal |
| --- | --- |
| Login | `POST /api/auth/login` |
| Bootstrap | `GET /api/config` |
| Home/sino/atividade | `GET /api/news`, `/api/notifications`, `/api/activity` |
| Produtos/serviços | `/api/products` |
| Vendas | `/api/sales` |
| Calendário | `/api/calendar/calendars`, `/api/calendar/events` |
| Clientes | `/api/customers` |
| Relatórios/despesas | `/api/reports`, `/api/expenses` |
| Dashboard | `/api/dashboard` |
| Suporte | `/api/support/tickets` |
| Equipe | `/api/team` e `/api/team/users` |
| Admin | `/api/admin/accounts`, `/api/admin/analytics`, `/api/admin/platform-expenses` |

Não redefina no frontend interfaces que já existem em `backend/src/types/`. O alias `@contracts` aponta para `backend/src/types/index.ts`; por isso o build do frontend precisa do backend ao lado.

## Docker e produção

O [`frontend/Dockerfile`](Dockerfile) faz build em duas etapas:

1. Copia `backend/src/types` e instala dependências.
2. Injeta o argumento `VITE_API_URL` e executa `npm run build`.
3. Copia `dist/` para nginx.

O [`nginx.conf`](nginx.conf):

- encaminha `/api/` para `backend:4000`;
- encaminha `/health` para o health check do backend;
- usa `try_files $uri /index.html` para permitir refresh em rotas internas;
- permite body maior para uploads, embora a API limite `/api/admin` a 2 MB.

No Docker Compose, a URL pública da API é normalmente relativa e o nginx faz o proxy interno. Em deploy separado, defina `VITE_API_URL` antes do build e inclua a origem do frontend em `CORS_ORIGINS` no backend.

## Limites e armadilhas conhecidas

- Não edite `dist/` nem `node_modules/`; são artefatos.
- `VITE_API_URL` é build-time, não runtime.
- O frontend depende fisicamente de `backend/src/types` durante o TypeScript build.
- A disponibilidade/ordem dos módulos pertence ao tenant no backend; somente preferências de UI são persistidas localmente.
- O frontend não possui script de testes no `package.json`; `npm run build` é a verificação principal de tipos e bundle.
- Mudanças de contrato exigem build do backend e do frontend.
- Ao adicionar um módulo, atualize o registry, crie a pasta do módulo, confirme a rota/API e atualize a documentação correspondente.
