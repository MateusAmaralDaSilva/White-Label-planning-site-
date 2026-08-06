# Guia didático do frontend

Este guia explica **como o frontend funciona e por quê**, para quem está
aprendendo. A ideia é entender os conceitos (componente, estado, hooks, Zustand,
rotas, tokens de tema) e depois abrir os arquivos citados para ver na prática.

> É o par didático do **[ARCHITECTURE.md](ARCHITECTURE.md)** (a referência
> técnica) e do **[../backend/GUIA.md](../backend/GUIA.md)** (o guia do servidor).
> Termos estranhos? Veja o **[Glossário](#glossário)** no fim.

---

## 1. O que é o frontend (a visão de cima)

O frontend é a **parte visual** — o que roda no navegador do usuário. Ele **não**
guarda os dados; ele os **pede** ao backend por HTTP e os **desenha** na tela.

```
[Usuário no navegador]  →  clica/digita  →  [Frontend React]  →  HTTP  →  [Backend]
        ↑                                          │
        └──────────────  desenha a tela  ←─────────┘
```

É uma **SPA** (Single Page Application): o navegador carrega a página **uma vez** e,
a partir daí, o JavaScript troca o conteúdo conforme você navega — sem recarregar
a página inteira a cada clique. É por isso que parece um aplicativo, não um site
tradicional.

Duas características centrais do produto (detalhadas adiante):

- **Modular**: cada empresa liga/desliga e reordena "módulos" (Produtos, Vendas…).
- **Whitelabel**: a mesma aplicação veste a cara de cada empresa (nome, logo,
  cores).

---

## 2. A stack (as ferramentas) e por que cada uma

| Ferramenta                   | Para quê serve                                            | Por que ela                                      |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| **Vite**               | "Servidor de desenvolvimento" + empacotador                | Rápido, recarrega na hora que você salva (HMR) |
| **React + TypeScript** | Montar a interface com componentes tipados                 | Padrão de mercado; os tipos pegam erros cedo    |
| **Tailwind CSS**       | Estilizar usando "classes utilitárias"                    | Tokens de cor → tema trocável (whitelabel)     |
| **Zustand**            | Guardar estado**global** (compartilhado entre telas) | Simples, quase sem código                       |
| **React Router**       | Trocar de tela conforme a URL                              | Roteamento numa SPA                              |
| **@dnd-kit**           | Arrastar para reordenar módulos                           | Drag & drop pronto                               |
| **lucide-react**       | Ícones                                                    | Consistentes e leves                             |

---

## 3. Conceitos de React (leia antes do resto)

### 3.1. Componente — "uma peça de LEGO que devolve tela"

Um **componente** é uma função que **devolve um pedaço de interface**. Você monta
telas encaixando componentes menores em maiores, como peças de LEGO.

```tsx
function Boas() {
  return <h1>Olá!</h1> // isto é JSX: "HTML dentro do JavaScript"
}
```

O `<h1>Olá!</h1>` é **JSX** — uma forma de escrever a "cara" do componente que
_parece_ HTML, mas é JavaScript. Onde você vê `<Button>`, `<Card>`, `<Modal>`, são
componentes deste projeto (em `components/ui/`).

### 3.2. Props — "os ajustes que você passa para a peça"

**Props** são os parâmetros de um componente (como argumentos de uma função). É
como você configura uma peça reutilizável:

```tsx
<Button variant="secondary" onClick={salvar}>Salvar</Button>
//        ^prop            ^prop
```

O mesmo `Button` vira muitos botões diferentes dependendo das props. Por isso os
primitivos em `components/ui/` servem o app inteiro sem duplicação.

### 3.3. Estado (state) — "a memória da tela que, ao mudar, repinta"

**Estado** é um dado que pode mudar com o tempo (o texto de um campo, se um modal
está aberto…). Quando o estado muda, o React **redesenha** o que depende dele.
Guardamos estado com o hook `useState`:

```tsx
const [aberto, setAberto] = useState(false) // valor inicial: false
// ...
<button onClick={() => setAberto(true)}>Abrir</button>
{aberto && <Modal>…</Modal>}   // aparece só quando `aberto` é true
```

Regra de ouro: **você não "mexe na tela" na mão** (como no JavaScript antigo com
`document.getElementById`). Você muda o **estado**, e o React cuida de redesenhar.

### 3.4. Hooks — "ganchos para plugar recursos do React"

**Hooks** são funções que começam com `use…` e dão superpoderes ao componente:

- `useState` — dar **memória** ao componente (§3.3).
- `useEffect` — rodar um **efeito colateral** (buscar dados, assinar algo) _depois_
  que a tela renderiza.
- Hooks **personalizados** (nossos): `useApi` (buscar dados da API),
  `useBootstrap` (carregar a config do tenant). Um hook personalizado é só uma
  função que usa outros hooks — uma forma de **reaproveitar lógica**.

---

## 4. Conceitos deste projeto

### 4.1. Módulo + registry — "o cardápio único"

Um **módulo** é uma funcionalidade autocontida (Produtos, Vendas, Clientes…).
Todos são declarados num **único lugar**, `src/modules/registry.ts`, cada um se
descrevendo: `{ id, name, icon, path, component, enabled, order }`.

Esse array é a **fonte de verdade**: a **sidebar**, as **rotas** (`App.tsx`) e o
**gerenciador de módulos** são todos _derivados_ dele. Adicionar um módulo = criar
a pasta + uma linha no registry. Nenhuma lista de rotas separada para manter em
sincronia.

### 4.2. Tokens de tema — "a mesma casa, decoração trocável" (o whitelabel)

Nenhuma cor é escrita "na mão" (`#4F78FF`) dentro dos componentes. Eles usam
**tokens semânticos**: `bg-surface`, `text-ink`, `bg-accent`, `text-danger`…

Cada token aponta para uma **variável CSS** cujo valor é definido pelo **tema
ativo** (`config/themes/`). Trocar o tema (ou a cor da marca de um cliente) =
trocar os **valores** dessas variáveis — **nenhum componente muda**. É esse o
mecanismo _whitelabel_: mesma "casa" (componentes), decoração (cores) trocável.

### 4.3. Zustand — "um quadro branco compartilhado"

Componentes têm memória própria (state), mas às vezes vários precisam do **mesmo**
dado (quem está logado, o tema atual, os módulos). Colocar isso numa **store
global** é como um **quadro branco na parede**: qualquer componente lê, e quando
alguém apaga/escreve, todos que estão "olhando" aquele pedaço se redesenham.

As stores ficam em `src/store/` (Zustand):

- `authStore` — token e usuário logado (com `persist`: sobrevive ao reload).
- `appStore` — os módulos (liga/desliga/ordem) e estado da sidebar.
- `brandStore` / `themeStore` — marca e tema do tenant.
- `notificationStore` — notificações lidas.

Detalhe de eficiência: usamos **seletores** (ex.: `useEnabledModules()`) para um
componente "assinar" só o pedaço que lhe interessa — assim ele não redesenha à toa
quando muda outra parte do quadro.

### 4.4. Rotas — "trocar a tela sem recarregar a página"

Numa SPA, o **React Router** olha a URL e decide **qual componente** mostrar, sem
recarregar. Em `App.tsx`:

- `/login` é público.
- O resto fica atrás de `<RequireAuth>` (se não está logado → manda para `/login`).
- As rotas dos módulos são **geradas em loop** sobre o `registry`.
- `/admin` e `/equipe` têm guardas por papel (`RequireAdmin`/`RequireTenantAdmin`).

> **Importante:** essas guardas são só **UX** (escondem telas). Quem realmente
> impede o acesso é o **backend**. O frontend nunca é a fonte de segurança —
> qualquer um pode mexer no navegador, então a decisão de verdade mora no servidor.

### 4.5. Buscar dados: `api` + `useApi` + `<Async>`

Três peças que trabalham juntas para falar com o backend:

1. **`lib/api.ts`** — o cliente HTTP. Um lugar só que anexa o token
   (`Authorization: Bearer …`) e, se o backend responder **401**, faz `logout`.
2. **`hooks/useApi.ts`** — `const state = useApi<T>('/api/products')` dispara o GET
   e devolve `{ data, loading, error, reload }`.
3. **`components/ui/Async.tsx`** — recebe esse `state` e mostra **loader**, **erro
   (com botão de tentar de novo)** ou os **dados**. Assim cada tela só descreve o
   caso de **sucesso**:

```tsx
const state = useApi<Product[]>('/api/products')
return <Async state={state}>{(produtos) => /* desenha a lista */}</Async>
```

Isso concentra "carregando/erro" num só lugar — sem repetir `if (loading)…` em toda
tela.

---

## 5. O caminho de um clique (do login até uma tela)

**Passo a passo, do "Entrar" até ver seus produtos:**

1. **Login** (`pages/login/`): você digita e-mail/senha e o `authStore.login()`
   faz `POST /api/auth/login`. O backend devolve um **token** (a "pulseira da
   festa" — veja o guia do backend), guardado no `authStore` (com `persist`).
2. **Redireciona** para `/`. Como agora está autenticado, `<RequireAuth>` deixa
   passar para o `MainLayout`.
3. **Bootstrap** (`MainLayout` → `useBootstrap`): faz `GET /api/config` e aplica a
   **marca** (`brandStore`), o **tema** (`themeStore`) e os **módulos**
   (`appStore.applyServerConfig`). É aqui que a tela "veste" a cara do tenant.
   - Se a **assinatura** estiver inativa, o layout mostra o **Paywall** no lugar do
     painel (o admin de plataforma é isento).
4. **Você clica em "Produtos"** na sidebar → a URL vira `/produtos` → o Router
   mostra o `ProductsModule`.
5. **O módulo busca os dados**: `useApi('/api/products')` dispara o GET; o cliente
   `api` anexa o token; o `<Async>` mostra o loader e depois a lista.
6. **Você cria um produto**: o formulário (dentro de um `<Modal>`) faz
   `api.post('/api/products', …)`; ao voltar OK, chamamos `state.reload()` para
   rebuscar a lista atualizada.
7. **Se o token expirou** no meio do caminho: o backend responde **401**, o
   `api.ts` faz `logout`, e o `<RequireAuth>` te leva de volta ao `/login`.

---

## 6. Passeio pelas pastas

```
src/
├── main.tsx        # ponto de entrada: aplica o tema salvo e "monta" o React na página
├── App.tsx         # o mapa de rotas + as guardas (auth/admin)
├── config/         # "fontes de verdade" de conteúdo: temas/ (um por tema), planos, marca…
├── lib/            # utilidades sem estado: api (HTTP), format (moeda), icons, cn, color
├── hooks/          # reutilizáveis: useApi (buscar), useResourceForm (form), useBootstrap
├── store/          # estado GLOBAL (Zustand): auth, app(módulos), brand, theme, notifications
├── types/          # tipo local AppModule (os contratos da API vêm de @contracts, do backend)
├── components/
│   ├── ui/         # PRIMITIVOS (Button, Card, Modal, Input, Async, TextField/Number/Select…)
│   ├── charts/     # BarChart, RankBars (usados no cliente e no admin)
│   └── *.tsx       # peças da moldura: Sidebar, topbar (menus), Paywall
├── layouts/
│   └── MainLayout.tsx  # a "moldura" logada: bootstrap + sidebar + topbar + conteúdo
├── modules/        # UMA PASTA POR FUNCIONALIDADE (+ registry.ts). Cada uma: index (casca) + partes
└── pages/          # telas fora do fluxo, também em pastas: login/, admin/ (+analytics/), team/
```

**Regra mental:** `components/ui/` = peças genéricas (não sabem o que é "Produto");
`modules/` = telas de negócio (compõem as peças de `ui/`); `pages/` = telas fora do
fluxo normal (login, áreas de admin). Cada módulo/página é uma **pasta**: o
`index.tsx` é só a casca (layout + busca + montagem) e cada seção/card/form fica no
seu próprio arquivo.

---

## 7. As funcionalidades, por área

### 7.1. Login e sessão

`pages/login/` + `store/authStore.ts`. O token fica guardado e é anexado a cada
requisição por `lib/api.ts`. `GET /api/auth/me` reidrata a sessão no reload.

### 7.2. Whitelabel (marca, tema, módulos)

`hooks/useBootstrap.ts` aplica a config do tenant. A **marca** (nome/sigla/logo)
vem do `brandStore`; o **tema** do `themeStore` (a escolha manual do usuário vence
a do tenant); os **módulos** do `appStore`. Trocar a cara de um cliente é editar
dados, não componentes (§4.2).

### 7.3. Módulos de negócio

Cada um em `modules/*/index.tsx`, todos no mesmo molde (§8): Produtos, Serviços
(compartilham o `Catalog`), Vendas, Clientes, Agenda, Relatórios, Chamados,
Dashboard, além de Home (portal) e Atividades (feed).

### 7.4. Assinatura

`components/Paywall.tsx` cobre o painel quando a assinatura está inativa; um
**banner** no topo avisa quando faltam ≤7 dias. O frontend só espelha o estado que
o backend informa (`billing`) e impõe (HTTP 402).

### 7.5. Áreas administrativas

- `pages/admin/` (só dono da plataforma): abas **Contas** (provisionar/editar
  contas, creditar meses, definir ramo) e **Financeiro** (`pages/admin/analytics/`,
  com os gráficos de `components/charts`).
- `pages/team/` (admin do tenant): gerenciar os logins da própria conta.

---

## 8. O molde de uma tela (padrão que se repete)

Reconhecer este molde faz você entender **qualquer** módulo de uma vez:

```tsx
function MinhaTela() {
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)     // null | 'new' | registro
  const state = useApi('/api/recurso')                // busca a lista

  return (
    <Async state={state}>{(itens) => (
      <>
        <PageHeader title="…" action={<Button onClick={() => setEditando('new')}>Novo</Button>} />
        <Card> {/* lista/tabela com <SearchInput> e os itens */} </Card>
        {editando && (
          <Formulario                                  {/* dentro de um <Modal> */}
            initial={editando === 'new' ? undefined : editando}
            onClose={() => setEditando(null)}
            onSaved={() => { setEditando(null); state.reload() }}
          />
        )}
      </>
    )}</Async>
  )
}
```

O `index.tsx` acima é a **casca**: quando a tela cresce, cada seção/linha/card vira
um arquivo irmão na pasta do módulo (ex.: `modules/reports/` tem `KpiRow`,
`RevenueChart`, `CustomersSection`, `ExpenseForm`…), e o `index` só os monta.

E o formulário segue sempre a mesma receita: os campos prontos `TextField` /
`NumberField` / `SelectField` (de `@/components/ui`) + o hook `useResourceForm`
(`{ busy, error, run }`, que faz o `try/catch` e traduz o erro da API) dentro de um
`<Modal>` com `FormActions`. Uma vez entendido em `modules/customers/`, todos os
outros são iguais.

```tsx
function Formulario({ initial, onClose, onSaved }) {
  const editing = initial !== undefined
  const [nome, setNome] = useState(initial?.nome ?? '')
  const { busy, error, run } = useResourceForm()

  function handleSubmit(e) {
    e.preventDefault()
    run(async () => {
      if (editing) await api.put(`/api/recurso/${initial.id}`, { nome })
      else await api.post('/api/recurso', { nome })
      onSaved()
    }, 'Não foi possível salvar.')
  }

  return (
    <Modal title={editing ? 'Editar' : 'Novo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Nome" id="rec-nome" value={nome} onChange={setNome} required autoFocus />
        {error && <p className="text-sm text-danger">{error}</p>}
        <FormActions editing={editing} busy={busy} onCancel={onClose} onDelete={…} submitLabel="Criar" />
      </form>
    </Modal>
  )
}
```

---

## 9. Como rodar

```bash
npm install
npm run dev       # http://localhost:5173 (recarrega ao salvar)
```

Precisa do **backend no ar** (`cd ../backend && npm run dev`) para os dados
aparecerem. A URL da API vem de `VITE_API_URL` no `.env` (padrão
`http://localhost:4000`). Build de produção: `npm run build`.

---

## Glossário

- **SPA (Single Page Application)**: app que carrega a página uma vez e troca o
  conteúdo via JavaScript, sem recarregar.
- **Componente**: função que devolve um pedaço de interface (JSX).
- **JSX**: sintaxe que parece HTML dentro do JavaScript/TypeScript.
- **Prop**: parâmetro passado a um componente para configurá-lo.
- **Estado (state)**: dado que muda no tempo; ao mudar, o React redesenha.
- **Hook**: função `use…` que dá recursos ao componente (`useState`, `useEffect`,
  ou os nossos `useApi`/`useBootstrap`).
- **Render / re-render**: o React desenhar (ou redesenhar) a tela.
- **Store (Zustand)**: estado global compartilhado entre componentes.
- **Seletor**: função que lê só um pedaço da store (evita redesenho à toa).
- **Rota**: associação entre uma URL e a tela que ela mostra.
- **Token de design**: nome semântico de cor (`accent`, `ink`) que aponta para uma
  variável CSS definida pelo tema — a base do whitelabel.
- **Tema**: conjunto de valores para os tokens (claro/escuro/…).
- **Módulo**: funcionalidade autocontida, declarada no `registry`.
- **Bootstrap**: o carregamento inicial da config do tenant após o login.
- **Persist**: guardar parte da store no `localStorage` para sobreviver ao reload.
- **Token (JWT)**: credencial que prova quem você é (ver `../backend/GUIA.md`).

---

_Este guia é o complemento didático. Para a referência técnica detalhada, veja
`ARCHITECTURE.md`._
