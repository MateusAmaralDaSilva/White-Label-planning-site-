# Arquitetura — Plataforma Whitelabel

Painel administrativo **whitelabel** e **modular**: cada cliente (tenant) liga/desliga
e reordena funcionalidades ("módulos") por uma barra lateral, e a identidade visual
inteira é trocável por tokens de tema.

> 📚 **Começando agora / aprendendo?** Leia antes o **[GUIA.md](GUIA.md)** — uma
> explicação didática (com analogias) de React, estado, Zustand, rotas e do caminho
> de um clique até a API. Este arquivo é a **referência técnica** detalhada.

---

## 1. Stack

| Camada      | Tecnologia                      | Por quê                                          |
| ----------- | ------------------------------- | ------------------------------------------------- |
| Build / dev | **Vite**                  | Dev server rápido, HMR instantâneo              |
| UI          | **React 18 + TypeScript** | Componentes tipados                               |
| Estilo      | **Tailwind CSS**          | Tokens de design → tema whitelabel trocável     |
| Estado      | **Zustand** (+ persist)   | Store global simples, sem boilerplate             |
| Rotas       | **React Router 6**        | Rotas geradas dinamicamente a partir dos módulos |
| Drag & drop | **@dnd-kit**              | Reordenar módulos no gerenciador                 |
| Ícones     | **lucide-react**          | Ícones SVG consistentes                          |

---

## 2. Os dois conceitos centrais

Tudo no sistema gira em torno de duas ideias. Entenda-as e o resto se explica.

### 2.1. Módulo

Um **módulo** é uma funcionalidade autocontida (Produtos, Agendamentos, Clientes…).
Cada módulo é apenas uma entrada de dados descrevendo a si mesmo:

```ts
interface AppModule {
  id: string          // identificador único
  name: string        // rótulo na sidebar
  description: string
  icon: LucideIcon
  path: string        // rota (ex.: '/produtos')
  component: ComponentType  // o que renderiza
  enabled: boolean    // ligado por padrão?
  order: number       // posição na sidebar
  required?: boolean  // não pode ser desligado (ex.: Dashboard)
}
```

Todos os módulos são declarados em **um único lugar**: `src/modules/registry.ts`.
Esse array é a **fonte de verdade** — a sidebar, as rotas e o gerenciador são
todos derivados dele. Não existe uma lista de rotas separada para manter em sincronia.

### 2.2. Token de design

Nenhuma cor é escrita "na mão" (`#4F78FF`) dentro dos componentes. Elas são
**tokens semânticos**:

```
bg, sidebar, surface        → superfícies
border                      → bordas
accent / accent-hover       → cor da marca
ink / ink-muted / ink-faint → texto (primário → terciário)
success, danger, warning, info → estados semânticos
```

Os componentes usam `bg-surface`, `text-ink-muted`, `bg-accent` etc. Em
`tailwind.config.js` cada token resolve para uma **CSS variable**
(`rgb(var(--color-surface) / <alpha-value>)`) em vez de um hex fixo. O valor de
cada variável é definido pelo **tema ativo** (§2.3). **Trocar a identidade visual
de um cliente = editar os tokens; trocar o tema = trocar o conjunto de valores das
variáveis.** É esse o mecanismo "whitelabel".

### 2.3. Tema

Um **tema** é um conjunto de valores para os tokens (o "claro", o "escuro"…).
Como os componentes só conhecem os tokens semânticos, trocar de tema **não muda
nenhum componente** — só troca os valores das CSS variables no `<html>`.

Todos os temas são declarados em **um único lugar**: `src/config/themes/` (um
arquivo por tema + `registry.ts`) —
a **fonte de verdade dos temas**, exatamente como o registry dos módulos.
Cada tema é uma entrada com id, nome, ícone e os valores dos tokens (canais
RGB `"R G B"`, para as utilidades de opacidade tipo `bg-success/12` seguirem
funcionando). O tema **claro é o padrão**; o **escuro** é uma opção. O
`themeStore` (Zustand + persist) guarda o tema escolhido e o aplica no `<html>`
via `applyTheme()`; `initTheme()` roda antes do React renderizar para não haver
"flash" do tema errado.

---

## 3. Estrutura de pastas

```
src/
├── config/
│   ├── brand.ts          # marca default (usada no login, antes da config do tenant)
│   ├── themes/           # ← temas: tokens.ts (contrato) + um arquivo por tema + registry
│   ├── plans.ts          # planos/preços exibidos (placeholder) + CONTACT_EMAIL + planMailto
│   ├── news.ts           # categoria de notícia → rótulo/ícone (o tipo vem de @contracts)
│   ├── activity.ts       # tipo de atividade → rótulo/ícone
│   └── notifications.ts  # iconKey/tom das notificações do sino
├── lib/
│   ├── api.ts            # ← cliente HTTP: anexa Bearer token, 401→logout, base VITE_API_URL
│   ├── format.ts         # ← formatadores de moeda: formatBRL, compactBRL, formatKpiValue/Delta
│   ├── icons.ts          # resolve a `iconKey` textual da API → ícone do lucide
│   ├── cn.ts             # helper para juntar classes CSS condicionais
│   └── color.ts          # hexTint(): tint (fundo+texto) a partir de cor hex
│
├── hooks/
│   ├── useApi.ts         # ← GET com loading/erro/reload (e cancelamento seguro)
│   ├── useResourceForm.ts # ← andaime de form: { busy, error, run } (try/catch + ApiError)
│   ├── useBootstrap.ts   # ← GET /api/config: aplica marca, tema, módulos e assinatura
│   └── useClickOutside.ts # fecha dropdown ao clicar fora / Escape
│
├── types/
│   └── module.ts         # tipo AppModule (React/lucide). Os CONTRATOS da API vêm de @contracts*
│
├── store/                # estado global (Zustand)
│   ├── appStore.ts       # módulos (merge da config do servidor sobre o registry) + UI
│   ├── authStore.ts      # token + user (persistidos no localStorage)
│   ├── brandStore.ts     # marca do tenant (default → sobrescrita pela API no bootstrap)
│   ├── themeStore.ts     # tema ativo (persistido; escolha manual vence a do tenant)
│   └── notificationStore.ts # notificações lidas + seletores de não-lidas
│
├── components/
│   ├── ui/               # PRIMITIVOS reutilizáveis (o "design system") — barrel em index.ts
│   │   ├── Button, Input, PasswordInput, SearchInput, Field
│   │   ├── FormFields (TextField/NumberField/SelectField), FormActions
│   │   ├── Card, Badge, PageHeader, Modal, StatCard, Brand, Spinner
│   │   ├── Async (renderiza loading/erro/dados de useApi)
│   │   ├── Popover, ListRow, IconChip, StatusDot
│   │   └── tones.ts      # tons semânticos (success/danger/…)
│   ├── charts/           # BarChart/ (index+scale+Legend+Tooltip+types), RankBars — cliente E admin
│   ├── Sidebar.tsx       # navegação (derivada do registry)
│   ├── ModuleManager.tsx # painel lateral de liga/desliga + drag&drop
│   ├── ThemeSwitcher.tsx # seletor de tema (derivado do registry de temas)
│   ├── NotificationsMenu.tsx # sino + painel de notificações (topbar)
│   ├── UserMenu.tsx      # avatar + menu do usuário (topbar)
│   └── Paywall.tsx       # tela cheia quando a assinatura está inativa/expirada
│
├── layouts/
│   └── MainLayout.tsx    # bootstrap do tenant + paywall + sidebar/topbar/conteúdo
│
├── modules/              # UM DIRETÓRIO POR FUNCIONALIDADE — cada módulo é uma PASTA:
│   ├── registry.ts       # ← fonte de verdade de todos os módulos
│   └── <módulo>/         #   index.tsx (casca) + seções/linhas/cards + forms + utils.ts
│                         #   ex.: reports/ = index + KpiRow + RevenueChart + CustomersSection + …
│
├── pages/                # telas fora do fluxo de módulos, também em PASTAS (casca + partes):
│   ├── login/            # público: index (casca) + LoginForm + BrandingPanel + About/Plans
│   ├── admin/            # /admin: casca (abas) + AccountsPanel + forms + analytics/
│   └── team/             # /equipe: index + AddMemberForm + DeleteMember
│
├── App.tsx               # roteamento + guardas (autenticação / admin / admin-do-tenant)
└── main.tsx              # ponto de entrada (initTheme + React + Router)

# * @contracts → alias (frontend/tsconfig.json) para backend/src/types: os contratos
#   da API são definidos UMA vez no backend e importados aqui (sem redefinir interfaces).
```

**Regra mental:** `ui/` = peças genéricas (não sabem o que é "Produto"),
`modules/` = telas específicas do negócio (compõem as peças de `ui/`), `pages/` =
telas fora do fluxo de módulos (login e áreas administrativas). Cada módulo/página
é uma **pasta**: o `index.tsx` é só a **casca** (layout + `useApi` + wiring) e cada
seção/card/form mora no seu arquivo (alvo: < ~100 linhas). Produtos e Serviços
compartilham o mesmo componente `Catalog` (variando só por `kind`).

---

## 4. Como os dados fluem

```
   modules/registry.ts              Backend — GET /api/config
   (componentes, ícones,            (enabled/order por tenant:
    defaults do código)              a FONTE DE VERDADE da config)
            └───────────────┬───────────────────┘
                            ▼
                     store/appStore
             applyServerConfig(): faz o merge
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                     ▼
     Sidebar          ModuleManager          App.tsx
    (só ativos)     (todos + toggle)     (gera as rotas)
```

1. `registry.ts` declara os módulos com seus **componentes, ícones e defaults** do
   código.
2. No bootstrap (`useBootstrap` → `GET /api/config`), o `applyServerConfig()` faz o
   **merge**: cada módulo recebe `enabled`/`order` do **tenant** (fonte de verdade),
   `required` fica sempre ligado, e módulo novo no código (ainda sem config no
   servidor) mantém o default do registry.
3. Ligar/desligar/reordenar atualiza o store de forma **otimista** e **persiste no
   backend** (`PUT /api/config`), _não_ no localStorage. Só a preferência de UI
   (sidebar recolhida) é guardada localmente.
4. Sidebar, ModuleManager e roteamento **leem** o store. Ninguém duplica a lista.

O seletor `useEnabledModules()` entrega os módulos ligados já ordenados — usado
pela Sidebar e pelo roteamento.

---

## 5. Estado global (Zustand)

### `appStore.ts`

- `modules` — estado atual dos módulos (registry + config do tenant)
- `applyServerConfig(configs)` — no bootstrap, faz o *merge* da config do backend
  (enabled/order) sobre o registry (componentes/ícones/defaults)
- `toggleModule(id)` — liga/desliga (ignora `required`) e persiste no backend
- `reorderModules(ids)` — reordena (drag & drop) e persiste no backend
- `sidebarCollapsed`, `moduleManagerOpen` — estado de UI
- **Persistência:** a disponibilidade/ordem dos módulos é do **backend, por tenant**
  (`PUT /api/config`, otimista/*fire-and-forget*). No localStorage guarda-se apenas a
  preferência de UI (`sidebarCollapsed`); a config do tenant é reaplicada a cada
  carregamento.

### `authStore.ts`

- `isAuthenticated`, `token`, `user`, `userEmail`
- `login()` faz `POST /api/auth/login` e guarda o JWT (persistido); `logout()`
  limpa a sessão. O token é anexado a cada request por `lib/api.ts` (ver §8.3.C).

---

## 6. Autenticação e rotas (`App.tsx`)

```
/login                             → Login (público)
/ (RequireAuth)                    → MainLayout (bootstrap do tenant + paywall)
   ├── /  /dashboard  /produtos  /servicos  /vendas  /agendamentos
   │  /clientes  /relatorios  /suporte  /atividades
   │                    (uma rota por módulo, gerada do registry)
   ├── /admin   (RequireAdmin)        → painel do dono da plataforma
   ├── /equipe  (RequireTenantAdmin)  → gestão dos logins da conta
   └── *                              → redireciona para /
```

A **Home** (`modules/home`) é a landing após o login: lista as ferramentas ativas
(derivadas do registry) como cards clicáveis e mostra o feed de notícias vindo de
`config/news.ts`. É `required` (não pode ser desligada).

- `<RequireAuth>` redireciona para `/login` se não autenticado.
- Dentro do layout, o `MainLayout` roda o **bootstrap** e, se a assinatura estiver
  inativa (e o usuário não for admin de plataforma), mostra o **Paywall** no lugar
  do painel (ver §8.4).
- As rotas dos módulos são geradas em loop sobre `moduleRegistry`.
- Se um módulo está **desligado**, a rota existe mas mostra uma tela "Módulo
  desativado" em vez do componente — o acesso direto pela URL fica bloqueado.
- `/admin` exige `isPlatformAdmin`; `/equipe` exige `isTenantAdmin`
  (`RequireAdmin`/`RequireTenantAdmin`). **Importante:** essas guardas são apenas
  de **UX** — a autorização real é imposta pelo backend (o frontend nunca é a
  fonte de segurança).

---

## 7. Como adicionar um módulo novo

Este é o teste da arquitetura. Para adicionar, por exemplo, "Financeiro":

1. Crie a pasta `src/modules/financeiro/` com um `index.tsx` (a **casca**: compõe
   `PageHeader`, `Card`, `Button`… de `@/components/ui`). Se a tela crescer, quebre
   em seções/cards/forms irmãos (`index.tsx` só orquestra — alvo < ~100 linhas).
   Formulários usam os campos prontos (`TextField`/`NumberField`/`SelectField`) e o
   hook `useResourceForm` (`{ busy, error, run }`); tipos de dados vêm de `@contracts`.
2. Adicione uma entrada em `src/modules/registry.ts` (com `React.lazy`):
   ```ts
   {
     id: 'financeiro',
     name: 'Financeiro',
     description: 'Contas a pagar e receber',
     icon: Wallet,
     path: '/financeiro',
     component: FinanceiroModule,
     enabled: false,
     order: 6,
   }
   ```

**Pronto.** Sidebar, rota e gerenciador se atualizam sozinhos. Nenhum outro arquivo
precisa mudar.

### Como adicionar um tema novo

Mesma filosofia. Para um tema "Sépia": crie `src/config/themes/sepia.ts` exportando
o tema (o TypeScript força preencher todas as chaves de token) e registre-o no array
de `src/config/themes/registry.ts`:

```ts
// src/config/themes/sepia.ts
import { Coffee } from 'lucide-react'
import type { Theme } from './tokens'
export const sepia: Theme = {
  id: 'sepia',
  name: 'Sépia',
  icon: Coffee,
  tokens: { bg: '245 240 230', surface: '255 251 244', ink: '60 48 36', accent: '166 124 82' /* …demais */ },
}

// src/config/themes/registry.ts  → uma linha:
export const themeRegistry: Theme[] = [light, dark, sepia]
```

**Pronto.** O seletor de tema (`ThemeSwitcher`) e o `/admin` listam o novo tema
automaticamente e nenhum componente precisa mudar — todos leem os tokens semânticos.

---

## 8. Customização por tenant

### 8.1 O que é customizável hoje

| O quê                          | Arquivo                     | O que editar                                          |
| ------------------------------- | --------------------------- | ----------------------------------------------------- |
| Nome, sigla, tagline            | `src/config/brand.ts`     | `name`, `mark`, `tagline`                       |
| Paleta de cores                 | `src/config/themes/`      | valores dos tokens de cada tema (um arquivo por tema) |
| Módulos disponíveis e padrão | `src/modules/registry.ts` | `enabled`, `order`, quais entradas existem        |

Esses três arquivos são os únicos que você precisa mudar para re-skin completo de um tenant.

### 8.2 De config global a config por tenant

Originalmente a config era **global** (uma instância, uma configuração para
todos). Hoje o isolamento por tenant está **implementado** via API (estratégia
**C** abaixo): marca, tema, módulos e assinatura vêm do backend por tenant. As
estratégias A e B ficam registradas como alternativas mais simples para cenários
sem backend.

### 8.3 Estratégias de isolamento por tenant

#### A) Build por tenant (simples, sem backend)

Variáveis de ambiente no build. Cada tenant tem um `.env` próprio e você gera
um bundle dedicado:

```ts
// src/config/brand.ts
export const brand = {
  name: import.meta.env.VITE_BRAND_NAME ?? 'Whitelabel',
  mark: import.meta.env.VITE_BRAND_MARK ?? 'WL',
  tagline: import.meta.env.VITE_BRAND_TAGLINE ?? '…',
}
```

```bash
# .env.cliente-a
VITE_BRAND_NAME=Clínica Saúde
VITE_BRAND_MARK=CS
```

Adequado para poucos clientes com identidades visuais muito distintas.

#### B) Tenant por subdomínio/domínio (sem backend pesado)

Um JSON estático por tenant servido da mesma origem:

```
/tenants/cliente-a.json  →  { brand, themeId, modules: ["dashboard","products"] }
```

O `main.tsx` lê `window.location.hostname`, busca o JSON e aplica antes de
renderizar. Escala para dezenas de clientes sem builds separados.

#### C) Tenant via API (arquitetura completa) — **implementado**

Esta é a estratégia em uso. O backend (`../backend`) retorna a configuração do
tenant após o login e serve os dados de cada tela. A fiação:

| Ponto de integração                   | Arquivo                                                       | Como funciona hoje                                                                                        |
| --------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cliente HTTP                            | `lib/api.ts`                                                | anexa o Bearer token; 401 encerra a sessão; base em`VITE_API_URL`                                      |
| Busca de dados                          | `hooks/useApi.ts` + `components/ui/Async.tsx`             | `useApi<T>(path)` → loading/erro/dados; `<Async>` centraliza os estados                              |
| Autenticação real                     | `store/authStore.ts`                                        | `login()` → `POST /api/auth/login`, guarda o JWT (persistido)                                        |
| Bootstrap do tenant                     | `hooks/useBootstrap.ts`                                     | `GET /api/config` no `MainLayout`; aplica marca, tema e módulos                                      |
| Marca                                   | `store/brandStore.ts`                                       | default estático (login) sobrescrito pela config do tenant                                               |
| Módulos                                | `store/appStore.ts` → `applyServerConfig()`              | enabled/order do tenant sobre o registry                                                                  |
| Tema                                    | `store/themeStore.ts` → `applyTenantTheme()`             | tema padrão do tenant; escolha manual do usuário vence                                                  |
| Ícones                                 | `lib/icons.ts`                                              | resolve a`iconKey` textual da API → ícone do lucide                                                   |
| Notícias / Atividades / Notificações | `modules/home`, `modules/activity`, `NotificationsMenu` | `useApi` em `GET /api/news` \| `/activity` \| `/notifications`                                    |
| Dados de cada tela                      | `modules/*/index.tsx`                                       | `useApi` nos respectivos endpoints                                                                      |
| Assinatura / bloqueio                   | `MainLayout` + `components/Paywall.tsx`                   | `billing` do `/api/config`: Paywall quando inativa (admin isento) + banner ≤7 dias                   |
| Painel do dono                          | `pages/admin/` (+ `analytics/`) + `components/charts`   | `/api/admin/*`: provisiona contas, credita meses, ramo; financeiro (receita/lucro/inadimplência/ramos) |
| Equipe da conta                         | `pages/team/`                                               | `/api/team*`: admin do tenant cria/remove logins, respeitando o limite                                  |

Duas convenções de contrato: a API envia **`iconKey` textual** (não componentes
React — resolvida em `lib/icons.ts`) e **valores monetários como número** (o
frontend formata com `formatBRL`). Ver `../backend/README.md` para a lista de
endpoints. Rodar: subir o backend (`cd ../backend && npm run dev`) e o frontend
(`npm run dev`); ajustar `VITE_API_URL` no `.env` se a porta mudar.

### 8.4 Papéis, telas administrativas e assinatura

**Papéis** (vêm do JWT, em `authStore.user`):

- `isPlatformAdmin` — dono da plataforma; habilita `/admin`.
- `isTenantAdmin` — dono da conta (tenant); habilita `/equipe`.

**Assinatura:** o `GET /api/config` traz `billing` (`paidUntil`/`active`/`daysLeft`).
O `MainLayout` mostra o **Paywall** (`components/Paywall.tsx`) no lugar do painel
quando a assinatura está inativa (o admin de plataforma é isento) e um **banner**
discreto quando faltam ≤7 dias. O backend também bloqueia os dados com **HTTP 402** —
o frontend apenas espelha esse estado.

**`/admin` (`pages/admin/`)** — só para o dono da plataforma, com duas abas:

- **Contas:** provisiona conta (tenant + 1º login), edita marca/logo/tema/limite de
  usuários/**ramo**, credita meses e gerencia os logins. O campo _Ramo_ é texto com
  sugestões (`<datalist>`) vindas dos ramos já usados por outras contas — sem lista
  fixa em código.
- **Financeiro (`AdminAnalytics`):** KPIs (MRR, receita/lucro do mês, inadimplência),
  gráfico receita×lucro, top contas, distribuição por plano e "quais ramos mais
  usam", reusando `components/charts` (`BarChart`/`RankBars`).

**`/equipe` (`pages/team/`)** — o admin do tenant cria/remove os logins da própria
conta, respeitando o limite de usuários.

> O mesmo padrão de **`<datalist>`** (sugestões derivadas dos dados) é usado no
> campo _Categoria_ de Produtos/Serviços, para manter categorias/ramos consistentes
> sem engessar uma lista.

---

## 9. Comandos úteis

```bash
npm install     # instalar dependências
npm run dev     # dev server em http://localhost:5173
npm run build   # build de produção (roda tsc + vite build)
npm run preview # visualizar o build
```

---

## 10. Decisões de design (o "porquê")

- **Registry único** em vez de rotas + menu separados → impossível ficarem
  dessincronizados; adicionar módulo é uma edição só.
- **Tokens de tema** em vez de cores hardcoded → a troca de skin (o coração do
  "whitelabel") é trivial e centralizada.
- **Raio de borda como token** (`borderRadius` no `tailwind.config.js`) → a
  estética 100% retangular ("profissional") é uma edição só: todo o raio é `0`,
  inclusive `full`. Única exceção é o `Spinner`, que usa `rounded-[50%]` (valor
  explícito, fora do token) porque um anel quadrado girando pareceria quebrado.
- **Primitivos em `ui/`** → cada tela compõe peças prontas; um módulo novo não
  reescreve botão/card/input. As listas usam `ListRow`/`IconChip`/`StatusDot` e
  os menus da topbar compartilham `Popover` + o hook `useClickOutside`.
- **Dropdowns da topbar autossuficientes** (ThemeSwitcher, NotificationsMenu,
  UserMenu) → cada um é dono do próprio gatilho, estado e painel; o `MainLayout`
  só os posiciona. O `useClickOutside` (mousedown fora + Escape) fica num ponto só.
- **Seletores derivados no store** (`useEnabledModules`/`useOrderedModules` com
  `useShallow`, `useUnreadCount`) → a regra vive junto do estado, com referência
  estável para não re-renderizar consumidores à toa.
- **Zustand com persist** em vez de Context/Redux → estado global com pouquíssimo
  código e persistência de graça.

---

## 11. Pontos de melhoria (TODO por princípio)

Revisão do frontend com foco em **eficiência, segurança, escalabilidade e
corretude/legibilidade** (os mesmos princípios da revisão do backend e do banco).
Cada item é marcado com o princípio que endereça. Nenhum é bloqueante.

### O que está bom (manter)

- **[Escalabilidade] Modularização por registry** — sidebar, rotas e gerenciador
  derivam de `modules/registry.ts`; adicionar módulo é uma edição só.
- **[Legibilidade/Duplicação] `<Async>` centraliza loading/erro** — cada tela só
  descreve o sucesso; primitivos em `components/ui` evitam reescrever botão/card/input.
- **[Eficiência] Estado global enxuto** — `appStore` faz *merge* otimista da config
  do servidor; seletores com `useShallow` evitam re-render à toa.
- **[Segurança] Sem superfície de XSS** — nenhum `dangerouslySetInnerHTML`/`eval`;
  o React escapa todo texto; a logo é `data URI` num `<img>` (SVG não executa script).
- **[Segurança] Guardas de rota são só UX** — a autorização real é imposta pelo
  backend; o frontend nunca é a fonte de segurança (isto é o comportamento correto).

### ✅ Feitos

- **[Escalabilidade/Eficiência] Code-splitting por módulo.** O `registry.ts` usa
  `React.lazy(() => import('./x'))` por módulo, e as páginas `Admin`/`Team` também
  são `lazy` (`App.tsx`); um `<Suspense>` no `MainLayout` mostra um loader enquanto
  o chunk carrega. Resultado: cada tela vira um *chunk* próprio (ex.: `Admin` ~28KB
  saiu do bundle inicial), baixado só quando aberta. Login e o layout ficam no
  bundle inicial de propósito. O **`ModuleManager`** (que traz o `@dnd-kit`) também
  é `lazy` e só monta quando o painel "Configurar módulos" abre — tirou ~16 KB gzip
  do bundle inicial (que caiu de ~87 para ~71 KB gzip).
- **[Corretude/Duplicação] Tipos compartilhados front↔back (`@contracts`).** As
  interfaces de contrato da API são definidas UMA vez no backend (`backend/src/types/`,
  por domínio) e importadas aqui pelo alias `@contracts` — nenhum módulo redefine
  `Product`/`Customer`/… Só `import type` (apagado no build). Tipos de UI/estado
  (props de componente, Zustand) seguem locais, de propósito.
- **[Duplicação/Legibilidade] Kit de formulário + `useResourceForm`.** `components/ui/ FormFields` (`TextField`/`NumberField`/`SelectField`) reduz um campo de ~8 para ~2
  linhas; `hooks/useResourceForm` (`{ busy, error, run }`) encapsula o try/catch +
  tradução de `ApiError` que se repetia em todo form. Aplicado em todos os forms.
- **[Legibilidade/Escalabilidade] Modularização de `modules/` e `pages/`.** Cada tela
  virou uma pasta: `index.tsx` = casca (layout + `useApi` + wiring) e cada seção/card/
  form no seu arquivo (alvo < ~100 linhas). Ver §3 e §7.
- **[Corretude] Error boundary.** `components/ErrorBoundary.tsx` (class component)
  envolve o `<Outlet>` no `MainLayout`: um erro de render numa rota — ou falha ao
  carregar um chunk lazy — mostra uma tela amigável ("Algo deu errado") em vez de uma
  página em branco, preservando sidebar/topbar. `key={pathname}` reinicia o boundary
  ao navegar, então o erro de uma tela não prende as outras.

### ⏳ Pendentes (trade-off a decidir)

- **[Segurança] Token JWT no `localStorage`.** É o trade-off padrão de SPA: se algum
  dia surgir um XSS, o token poderia ser roubado. A alternativa endurecida é cookie
  `httpOnly` (evita o roubo, mas traz CSRF e mais complexidade). Aceitável hoje
  (não há superfície de XSS); fica registrado.
- **[Eficiência/Escalabilidade] Cache e paginação de dados.** `useApi` refaz o GET a
  cada montagem, sem cache/dedupe entre componentes; as listas vêm inteiras (sem
  paginação). Ótimo no volume atual; em escala, uma lib de cache (ex.: React Query) +
  paginação (espelhando o teto já anotado no backend em `admin_list_accounts`).

> Ordem sugerida dos pendentes: **cache/paginação** quando o volume crescer.
> (Code-splitting, tipos compartilhados, kit de formulário, modularização de
> modules/pages e o error boundary já feitos.)
