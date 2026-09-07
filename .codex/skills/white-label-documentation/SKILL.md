---
name: white-label-documentation
description: Create or update documentation for this white-label planning application, including the repository map, system behavior, AI search routing, user workflows, and operational guidance.
---

# White-Label Documentation

Use this skill when a user asks to understand, explain, onboard, document, or update documentation for this repository. It is project-specific: keep the explanation grounded in the current code and configuration.

## Source of truth

Treat runtime code and configuration as authoritative, in this order:

1. Current source under `frontend/src`, `backend/src`, `backend/db/migrations`, Docker files, package manifests, and tests.
2. Existing architecture, setup, deployment, and database notes for rationale and operational context.
3. TODOs, comments, and historical notes only as explicitly labeled context.

Never expose values from `.env`, credentials, JWT secrets, database passwords, API tokens, or private infrastructure details. It is safe to document variable names, expected formats, and where configuration is consumed.

## Discovery workflow

Before writing a system-level explanation:

- Inventory the repository with `rg --files`, excluding generated/dependency directories such as `node_modules`, `dist`, `build`, `coverage`, and `.git`.
- Inspect both package manifests, `docker-compose.yml`, Dockerfiles, nginx configuration, environment/config modules, existing documentation, and tests.
- Trace the main runtime path: `frontend/src/main.tsx` → `App.tsx` → `MainLayout` → bootstrap/stores/API client → `backend/src/index.ts` → routers/middleware → repositories → tenant context and migrations.
- Search for actual routes and API calls with `rg`; do not infer endpoints from filenames alone.
- Compare documentation with code. Mark stale, contradictory, or unverified statements as such instead of silently repeating them.

Read [references/project-map.md](references/project-map.md) when the request concerns folders, files, ownership, or where an AI should search. Read [references/application-guide.md](references/application-guide.md) when the request concerns how the application is used, how data flows, API domains, deployment, troubleshooting, or change impact.

## Documentation behavior

Produce documentation for two readers:

- Humans need a plain-language system overview, folder/subfolder meanings, startup and usage instructions, role-based behavior, and troubleshooting.
- An AI needs a search map: the source-of-truth file for each concern, the request/data path, important invariants, and the safest next file to inspect.

For a full repository guide, cover every meaningful tracked folder and subfolder, not just the top-level directories. Group repetitive leaf files by responsibility, but name important entry points and registries explicitly. Explain what is generated or operational-only and should normally not be edited.

Use exact paths and route names. Separate observed facts from inferences. When code and documentation disagree, report the conflict and prefer the current executable path. Keep the repository’s existing language when editing an existing document unless the user asks for another language.

## Change-location routing

When answering “where do I change this?”, route to the narrowest source of truth:

- User-facing business screen: `frontend/src/modules/<domain>/`.
- Login, team, or platform administration: `frontend/src/pages/<area>/`.
- Reusable UI or design-system primitive: `frontend/src/components/`.
- Frontend state/bootstrap/API behavior: `frontend/src/store/`, `frontend/src/hooks/`, or `frontend/src/lib/api.ts`.
- Module availability/order/route metadata: `frontend/src/modules/registry.ts` and `backend/src/db/repositories/tenants.repo.ts`.
- Theme tokens or theme selection: `frontend/src/config/themes/` and `frontend/src/store/themeStore.ts`.
- API endpoint: matching `backend/src/routes/` file, then its repository and contract types.
- Database behavior or tenant isolation: `backend/src/db/repositories/`, `backend/src/db/tenant-context.ts`, and a new ordered migration under `backend/db/migrations/`.
- Shared API shape: `backend/src/types/`; the frontend consumes it through the `@contracts` alias.
- Deployment/runtime behavior: `docker-compose.yml`, the relevant Dockerfile, nginx config, `DEPLOY.md`, and environment/config modules.

Do not recommend editing an already-applied migration. For schema changes, document the need for a new migration and the required application order. Keep the backend application connected as `whitelabel_app`; database migrations and administrative SQL have different privileges.

## Expected deliverable

Unless the user asks for a narrower output, organize a repository guide as:

1. What the system is and its frontend/backend/database boundaries.
2. A complete folder and subfolder map.
3. The end-to-end request, authentication, tenant-isolation, and rendering flows.
4. How a user operates the application, including role and subscription differences.
5. A search/change matrix for future AI agents.
6. Local/deployment commands, tests, and troubleshooting grounded in the repository.
7. Known inconsistencies, assumptions, and documentation gaps.

Validate links and paths after editing. For a substantially revised skill, run the bundled validator:

```powershell
py "C:\Users\silva\.codex\skills\.system\skill-creator\scripts\quick_validate.py" ".codex\skills\white-label-documentation"
```
