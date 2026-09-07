
# Application guide and system behavior

This guide describes the current application behavior. Verify route names and environment defaults against source before publishing a user-facing guide.

## System at a glance

The application is a multi-tenant, white-label business panel:

```text
Browser (React/Vite SPA)
  → HTTP client with Bearer JWT
Express API
  → auth/current-user/subscription middleware
  → repository transaction with tenant context
PostgreSQL
  → RLS policies and SECURITY DEFINER admin/auth functions
```

The frontend never talks directly to PostgreSQL. The backend derives the tenant from the signed JWT, sets `app.current_tenant` for the transaction, and relies on PostgreSQL row-level security to isolate tenant data.

## First-run and runtime flow

1. `frontend/src/main.tsx` applies the persisted theme before the first paint, mounts React, and creates the browser router.
2. `App.tsx` exposes `/login`, protects the main outlet with `RequireAuth`, creates module routes from `moduleRegistry`, and protects `/admin` and `/equipe` by role.
3. `MainLayout` calls `useBootstrap`, which requests `GET /api/config` and applies tenant brand, theme, module configuration, and billing state.
4. The API client reads `VITE_API_URL` (defaulting to the local backend URL in source), attaches `Authorization: Bearer <token>`, and logs out on an authenticated 401.
5. The backend authenticates the token, reloads the current user and role from PostgreSQL on every request, and places billing state on the request.
6. `/api/config` remains readable for an authenticated user even when the subscription is expired, so the frontend can show `Paywall`. Other tenant data requires an active subscription; platform admins are exempt.

## How a human uses the app

### Login and tenant panel

Open the frontend, submit an email and password on `/login`, and expect `POST /api/auth/login` to return a token and public user object. After login, the user lands in the tenant shell. The sidebar contains the enabled modules in tenant-defined order.

The initial seeded test accounts are documented in database setup notes and may differ from the current bootstrap script. Do not put passwords into durable documentation; tell operators to inspect the seed/bootstrap configuration or create credentials securely.

### Modules

The module manager in the sidebar lets a user toggle non-required modules and drag to reorder them. Changes are optimistic in the UI and persist through `PUT /api/config`; they are not the tenant’s durable local-storage configuration. The required Home module stays enabled. The sidebar, home tools, and route rendering all derive from the same registry/store path.

Current business areas are:

| Area         | User capability                                   | Frontend search                                              | API search                                      |
| ------------ | ------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| Home         | View active tools and news                        | `frontend/src/modules/home/`                               | `feeds.routes.ts`                             |
| Dashboard    | View KPIs, tasks, and recent activity             | `frontend/src/modules/dashboard/`                          | `dashboard.routes.ts`, `activity.repo.ts`   |
| Products     | Create, edit, list, and delete products           | `frontend/src/modules/products/`                           | `products.routes.ts`, `products.repo.ts`    |
| Services     | Use the catalog pattern for services              | `frontend/src/modules/services/`, `products/Catalog.tsx` | products route/repository with the service kind |
| Sales        | Record/list/delete sales; sales feed reports      | `frontend/src/modules/sales/`                              | `sales.routes.ts`, `sales.repo.ts`          |
| Agendamentos | Manage agendas and calendar events                | `frontend/src/modules/calendar/`                           | `calendar.routes.ts`, `calendar.repo.ts`    |
| Customers    | Create, edit, list, and delete customers          | `frontend/src/modules/customers/`                          | `customers.routes.ts`, `customers.repo.ts`  |
| Reports      | Review revenue, customers, expenses, and rankings | `frontend/src/modules/reports/`                            | `reports.routes.ts`, `expenses.routes.ts`   |
| Chamados     | Create, update, list, and delete support tickets  | `frontend/src/modules/support/`                            | `support.routes.ts`, `support.repo.ts`      |
| Atividades   | Review business activity history                  | `frontend/src/modules/activity/`                           | `feeds.routes.ts`/activity repository         |

### Theme and branding

The theme switcher selects a registered token set. Components use semantic Tailwind classes backed by CSS variables, not hard-coded brand colors. Tenant branding arrives in `/api/config` and overrides the default brand after bootstrap. Theme choice and UI preferences are separate from tenant module configuration; document their persistence behavior separately.

### Tenant administrator

Users with `isTenantAdmin` can open `/equipe`, see the login-seat count, add logins, and remove other members. The frontend hides the link for ordinary users, while the backend route is independently protected. The backend/database limit is authoritative.

### Platform administrator

Users with `isPlatformAdmin` can open `/admin` to manage tenant accounts, branding/logo, users, credits/subscriptions, platform expenses, and platform analytics. Platform-admin operations cross tenant boundaries through restricted backend admin functions and are not ordinary tenant CRUD. Document this role separately from tenant administration.

### Subscription expiry

Billing is derived from the tenant’s `paid_until` timestamp. When inactive, ordinary users receive a paywall after bootstrap; data routes are blocked with HTTP 402. The platform admin remains exempt. The layout displays a warning when expiry is within seven days. No background job is required to flip an expired flag.

## API route map

The Express entry point mounts:

| Mount          | Responsibility                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/health`    | Returns`{ status: "ok" }`; used by Docker/load balancers.                                                         |
| `/api/auth`  | Login and token-backed current-user lookup.                                                                         |
| `/api/admin` | Platform-admin account, billing, user, expense, and analytics operations; larger JSON body limit for logo payloads. |
| `/api`       | Authenticated tenant config and business-domain routes.                                                             |

The tenant route composition currently includes `/config`, `/news`, `/notifications`, `/activity`, `/products`, `/customers`, `/calendar/calendars`, `/calendar/events`, `/support/tickets`, `/reports`, `/sales`, `/expenses`, `/dashboard`, and `/team` families. Confirm exact verbs and parameter forms in the matching `*.routes.ts` file before documenting an API contract.

## Security invariants to preserve in explanations

- The app role is `whitelabel_app`, not the database owner.
- Tenant ID comes from the signed JWT, never from a client-selected body/query field.
- `withTenant()` sets tenant context inside a transaction; RLS is the database backstop even if a query omits an explicit tenant predicate.
- Auth middleware reloads the current user and role per request, enabling immediate revocation/demotion.
- Password verification is performed through the database function introduced by migration `0019`; the application role should not read `password_hash` directly.
- Input is validated at the route/repository boundary and again by database constraints where applicable.
- Login attempts are rate-limited in memory per backend instance.

## Local and container operation

Use the repository’s own setup notes for exact commands. At a high level:

- Frontend development: `cd frontend`, install dependencies, then use the Vite `dev` script. Build with `npm run build`; it type-checks and emits `dist/`.
- Backend development: `cd backend`, configure `DATABASE_URL` and related environment variables, then use the backend dev script only after verifying its entrypoint against `backend/src/index.ts`. Build with `npm run build`; production starts the compiled `dist/index.js`.
- Docker Compose: database → migrator → seeder → backend/frontend. The frontend image bakes `VITE_API_URL` at build time and nginx proxies `/api/` to the backend. Internal SPA routes need the nginx fallback to `index.html`.
- Database: apply ordered migrations as the database owner, then run the API with the least-privilege app role. Never mix those roles in operator guidance.

## Troubleshooting order

When login or startup fails, inspect in this order:

1. Is PostgreSQL healthy and is the ordered migration set applied?
2. Does `DATABASE_URL` point to the app role and correct database?
3. Is the backend listening and does `/health` return 200?
4. Does `CORS_ORIGINS` contain the exact frontend origin?
5. Was `VITE_API_URL` set before the frontend build?
6. Does `/api/auth/login` return a meaningful 4xx/5xx response, and does the browser send the Bearer token afterward?
7. If the panel loads but is empty/blocked, inspect `/api/config`, tenant module rows, billing, role flags, and repository/RLS behavior.

## Current drift checks

The repository has active changes and historical notes. Before publishing a definitive guide, check at least:

- `backend/package.json` scripts against the actual backend entry file and Docker command.
- Migration documentation against the actual migration directory, including newer files such as `0020_drop_brand_tagline.sql` and `0021_default_dashboard.sql`.
- Seed credentials in `tests/login-smoke.ps1`, `backend/scripts/bootstrap.js`, and database README notes; they are not necessarily identical.
- Tracked/generated build artifacts and working-tree changes; do not describe them as intentional architecture without verification.
