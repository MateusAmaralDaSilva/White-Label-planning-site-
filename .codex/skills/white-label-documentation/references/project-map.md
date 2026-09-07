# Project map: White-Label planning application

This is a maintained snapshot of the repository structure observed when the skill was created. On every future documentation task, verify it with `rg --files` and the current tree before relying on it.

## Repository boundaries

| Path | Meaning |
| --- | --- |
| `.claude/` | Local Claude/tooling settings. It is configuration, not application runtime code. Do not treat it as the system architecture. |
| `.codex/skills/` | Repository-local Codex skills. The `white-label-documentation/` folder contains this skill and its references. |
| `frontend/` | React 18 + TypeScript + Vite single-page application. It renders the UI and calls the backend over HTTP. |
| `backend/` | Express + TypeScript API, PostgreSQL access, authentication, tenant security, and database migrations. |
| `tests/` | Operational smoke tests; currently contains the PowerShell login smoke test. |
| Root `.md`, `.yml`, `.sh`, `.service`, `.timer`, and `todo.txt` files | Deployment, database/hosting, monitoring, setup, and project notes. Inspect these for operations, not for frontend behavior. |

Generated/dependency directories such as `frontend/node_modules/` and `frontend/dist/` are build artifacts. They may exist locally but are not normal edit targets or sources of truth.

## Backend folders

| Folder | Meaning and search use |
| --- | --- |
| `backend/src/` | API process entry point. Start with `index.ts`; it configures Express, CORS, body limits, health, route mounts, 404 handling, and error handling. |
| `backend/src/config/` | Process configuration loaded from environment variables. `env.ts` is the place to verify defaults, production fail-fast rules, CORS, proxy, and pool settings. |
| `backend/src/routes/` | HTTP boundary. `auth.ts` owns login/session endpoints. `data/` owns tenant-facing domains. `admin/` owns platform-admin endpoints. |
| `backend/src/routes/data/` | Tenant-facing route composition and domain routers: feeds/news, products, customers, calendars/events, support, reports, sales, expenses, dashboard, and team. `helpers.ts` resolves tenant/user context from the authenticated request. |
| `backend/src/routes/admin/` | Platform-admin route composition, account provisioning/editing/users/credits, platform expenses, and analytics. `helpers.ts` handles admin-specific request helpers. |
| `backend/src/middleware/` | Cross-cutting request gates: JWT authentication/current-user reload, active-subscription gate, and centralized error conversion. |
| `backend/src/db/` | PostgreSQL pool and transaction/tenant-context helpers. `withTenant()` sets the transaction-local tenant used by RLS; `withTransaction()` is for cross-tenant administrative transactions. |
| `backend/src/db/repositories/` | The data-access and domain-rule layer, one repository per domain. This is the normal place to inspect or change SQL, validation, and database-facing behavior after finding a route. |
| `backend/src/lib/` | Backend utilities: JWT, HTTP errors, async handlers, rate limiting, billing calculations, and relative-time formatting. |
| `backend/src/types/` | Shared API contracts and domain types. The frontend imports the aggregate contract through `frontend/tsconfig.json`’s `@contracts` alias; do not redefine those interfaces in the frontend. |
| `backend/scripts/` | One-off operational scripts such as `bootstrap.js`, which seeds platform/test tenants and demonstration data when invoked by Docker Compose. |
| `backend/db/` | PostgreSQL documentation, ER artifacts, and migrations. This is database code, not Node runtime code. |
| `backend/db/migrations/` | Ordered SQL history for schema, RLS, roles, functions, billing, calendars, and authentication changes. Add a new migration for a new schema change; do not rewrite an applied migration. |
| `backend/db/migrations/old migrations/` | Historical SQL kept for reference. It is not part of the current ordered migration set unless an operator explicitly uses it. |

## Frontend folders

| Folder | Meaning and search use |
| --- | --- |
| `frontend/src/` | Browser application source. `main.tsx` initializes the theme and React Router; `App.tsx` defines public/auth/admin/tenant-admin route guards. |
| `frontend/src/config/` | Static frontend configuration and display metadata: default branding, plan/contact data, news/activity/notification presentation maps, and theme registry files. Data records generally come from the API. |
| `frontend/src/config/themes/` | Theme contract, light/dark token sets, registry, and CSS-variable application. Search here for theme IDs, semantic colors, or whitelabel appearance. |
| `frontend/src/lib/` | Small framework-independent helpers. `api.ts` is the single HTTP client and handles base URL, Bearer tokens, 401 logout, and API errors; `format.ts`, `icons.ts`, `color.ts`, `slugify.ts`, `cn.ts` support presentation. |
| `frontend/src/hooks/` | Reusable async and UI behavior. `useBootstrap.ts` loads tenant brand/theme/modules/billing; `useApi.ts` handles GET state; `useResourceForm.ts` standardizes mutations and errors. |
| `frontend/src/store/` | Zustand global state. Auth and theme preferences are persisted; tenant module availability/order is loaded from and saved to the backend, while only sidebar UI preference is persisted locally. |
| `frontend/src/types/` | Frontend-only types such as the module shape. API contracts belong in `backend/src/types/`. |
| `frontend/src/components/ui/` | Reusable design-system primitives and form helpers. These should remain domain-agnostic. |
| `frontend/src/components/charts/` | Reusable chart primitives used by tenant reports and platform analytics. `BarChart/` contains the chart implementation, scale, legend, tooltip, and types. |
| `frontend/src/components/` | Shared shell and cross-domain components: sidebar, module manager, theme switcher, notifications, user menu, paywall, error boundary, and the chart/UI subfolders. |
| `frontend/src/layouts/` | Application shells. `MainLayout.tsx` runs bootstrap, paywall handling, sidebar/topbar, suspense, and the nested route outlet. |
| `frontend/src/modules/` | Business modules shown in the tenant sidebar and generated routes. `registry.ts` is the frontend source of truth for module IDs, labels, icons, paths, components, defaults, and required status. Each child folder is one module and normally has `index.tsx` plus focused forms/cards/rows/utils. |
| `frontend/src/modules/home/` | Post-login landing page with active tools and news. |
| `frontend/src/modules/dashboard/` | KPI/task/dashboard view. |
| `frontend/src/modules/products/` | Shared product/service catalog UI; `Catalog.tsx` varies behavior by `kind`. |
| `frontend/src/modules/services/` | Service module entry point, reusing the catalog patterns. |
| `frontend/src/modules/sales/` | Sales creation/listing and product loading. |
| `frontend/src/modules/calendar/` | Calendars, agendas, filters, colors, month grid, and events. |
| `frontend/src/modules/customers/` | Customer list, row, and create/edit/delete form. |
| `frontend/src/modules/reports/` | Tenant reports, KPIs, revenue charts, expenses, customer and ranking sections. |
| `frontend/src/modules/support/` | Tenant support ticket list and CRUD form. |
| `frontend/src/modules/activity/` | Activity feed and presentation helpers. |
| `frontend/src/pages/` | Non-module screens. `login/` is public; `team/` is tenant-admin-only; `admin/` is platform-admin-only. |
| `frontend/src/pages/login/` | Login landing page, form, branding, about, and plan sections. |
| `frontend/src/pages/team/` | Tenant login management: list, add, and delete members. |
| `frontend/src/pages/admin/` | Platform account management, branding/logo, users, credits, and admin analytics. `analytics/` is a focused sub-area for platform finance views. |

## Root operational files

| Path | Meaning |
| --- | --- |
| `docker-compose.yml` | Production-like orchestration for PostgreSQL, migration runner, seeder, backend, and nginx-served frontend. It mounts migrations read-only and injects runtime secrets through environment variables. |
| `frontend/Dockerfile` | Builds the SPA with `VITE_API_URL` at build time, then serves `dist/` with nginx. It copies backend contract types because the frontend TypeScript build aliases them. |
| `backend/Dockerfile` | Builds TypeScript to `dist/`, installs production dependencies, copies bootstrap scripts, and starts `dist/index.js`. |
| `frontend/nginx.conf` | SPA fallback, `/api/` reverse proxy to backend, frontend health proxy, and upload size setting. |
| `DEPLOY.md` | Deployment, environment, database, build, security, and change-impact instructions. |
| `frontend/ARCHITECTURE.md` and `frontend/GUIA.md` | Frontend architecture and beginner-oriented explanations. |
| `backend/README.md`, `backend/GUIA.md`, and `backend/db/README.md` | Backend/database setup, security, migration, and operational explanations. Verify migration lists against the actual directory before quoting them. |
| `EMAIL_ALERTS_SETUP.md`, `monitor-notify-unhealthy.sh`, `.service`, `.timer` | Optional host-level monitoring that emails when Docker health checks become unhealthy; outside the application request path. |
| `tests/login-smoke.ps1` | Manual/operational login smoke test for seeded accounts. Read it before claiming test coverage; it is not a unit/integration test suite. |

## AI search matrix

| Question | Search first | Then trace |
| --- | --- | --- |
| Where is a screen? | `frontend/src/modules/<domain>/` or `frontend/src/pages/<area>/` | API calls in the screen, shared components, and matching backend route/repository |
| Why is a menu item/route present? | `frontend/src/modules/registry.ts` | `appStore.ts`, `Sidebar.tsx`, `App.tsx`, backend tenant config |
| Why is branding/theme different? | `frontend/src/config/themes/`, `brandStore.ts`, `themeStore.ts` | `useBootstrap.ts`, `/api/config`, tenant repository and migrations |
| What API serves data? | `frontend/src` API call search | matching `backend/src/routes`, repository, and `backend/src/types` |
| Why can one tenant not see another? | `backend/src/middleware/auth.ts` | `tenant-context.ts`, repository transaction, RLS migration `0002_security.sql` |
| Why is access blocked? | `subscription.ts`, `MainLayout.tsx`, `Paywall.tsx` | `loadCurrentUser`, tenant billing fields, billing migrations |
| What changes the schema? | `backend/db/migrations/` | repository SQL, contracts, deploy order, and migration README |
