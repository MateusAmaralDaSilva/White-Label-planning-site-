# Coding Agent Rules

These rules apply to any agent that creates or changes code in this repository.

## Core principles

1. Build modular, maintainable software.
2. Prefer simple, concise designs with clear responsibilities.
3. Do not duplicate behavior that already exists. Search the repository before creating a helper, component, hook, repository function, type, endpoint, or utility.
4. Reuse existing abstractions when they are correct. If an abstraction is too specific or poorly designed, improve it deliberately instead of adding a parallel implementation.
5. Keep business rules in one authoritative location. Do not duplicate the same rule across frontend, backend, and database unless each layer is intentionally enforcing a separate boundary.
6. Preserve the existing architecture and conventions unless there is a clear reason to change them.

## Before writing code

- Read the relevant README, architecture notes, package scripts, and nearby source files.
- Trace the existing flow before changing it: UI → state/hooks → API client → route → middleware → repository → database.
- Search for related names, endpoints, types, components, hooks, and utilities with `rg`.
- Identify the narrowest source-of-truth file for the requested behavior.
- State the intended change and affected files before making a substantial edit.

## Modularity rules

- A module should have one clear responsibility and a small public surface.
- Treat approximately 100 lines as a readability budget for new or substantially modified files, including imports and comments.
- Before adding to a file near that budget, extract a cohesive responsibility into a focused sibling module. A temporary exception is acceptable only when splitting would create artificial coupling; document the reason.
- When touching an existing oversized file, split the responsibilities changed in that task when it is safe and within scope. Avoid unrelated repo-wide rewrites.
- Prefer domain-focused modules with explicit exports. Use a small barrel file only when it preserves an existing import contract.
- Keep domain behavior separate from presentation, transport, persistence, and infrastructure concerns.
- Prefer composition over large files with unrelated responsibilities.
- Extract shared behavior only when it is genuinely reusable; do not create abstractions for one-off code without a concrete benefit.
- Keep APIs and contracts explicit and typed.
- In the frontend, use shared UI primitives from `frontend/src/components/ui`, shared behavior from hooks, and domain-specific behavior inside the relevant module or page.
- In the backend, keep HTTP concerns in routes, cross-cutting concerns in middleware, database access in repositories, and shared contracts in `backend/src/types`.
- For database changes, use a new ordered migration. Never rewrite an already-applied migration.

## Duplication rule

Before adding code, answer:

- Does an equivalent function, component, hook, type, route, query, or style already exist?
- Can the existing implementation be reused through parameters or composition?
- Would moving shared behavior to the correct layer remove duplication without creating unnecessary coupling?

If duplication is found during the change, consolidate it when that is within scope. Do not copy/paste logic merely to make the current file convenient.

## Ambiguity and user decisions

Ask the user before coding whenever a major question is unclear, including decisions about:

- public behavior, UX, API contracts, database schema, permissions, security, billing, or tenant isolation;
- architectural direction or a new dependency;
- breaking changes or compatibility behavior;
- data deletion, migration strategy, or deployment behavior;
- requirements where two reasonable interpretations would produce materially different results.

For minor choices that do not change behavior, scope, architecture, security, or data, make a reasonable assumption and document it briefly. Do not block progress on formatting or implementation details.

## Change boundaries

- Work only on the requested behavior and its necessary supporting code.
- Do not silently fix unrelated dirty-worktree changes.
- Do not broaden a documentation, diagnosis, or implementation request into unrelated refactoring.
- Avoid destructive commands and irreversible changes unless explicitly requested and the exact target is confirmed.
- Never commit secrets, credentials, private keys, or real environment values.

## Verification

After changing code:

- Run the narrowest relevant typecheck, build, or test.
- Verify changed API paths, imports, contracts, migrations, and error paths.
- Check that the new code is actually used and that the old duplicate path is removed or intentionally retained.
- Update relevant documentation when behavior, setup, routes, contracts, or folder responsibilities change.
- Report what changed, what was verified, and any remaining uncertainty or blocked decision.
