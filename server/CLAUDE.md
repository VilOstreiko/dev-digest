# server — @devdigest/api

Backend: imports repos and PRs, indexes repos (`repo-intel`), stores agents, runs
reviews through `reviewer-core`, streams run logs over SSE.

## Stack

Fastify ^5.2 · Drizzle ORM ^0.38 (drizzle-kit ^0.30) · Postgres + pgvector ·
zod ^3.24 · TypeScript ^5.7 · tsx · vitest ^2.1 (+ testcontainers). Package manager: **pnpm**.

## Commands

- `pnpm dev` — API on :3001 (tsx watch)
- `pnpm typecheck`
- `pnpm test` — unit + integration
- `pnpm exec vitest run --exclude '**/*.it.test.ts'` — unit only, no Docker
- `pnpm exec vitest run .it.test` — integration only, needs Docker
- `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:seed`

## Map

- `src/modules/<name>/` — feature plugins: `routes.ts` → `service.ts` → `repository.ts`
- `src/modules/repo-intel/` — codebase indexer + `repoIntel.*` facade
- `src/platform/` — DI container, JobRunner, RunBus/SSE, errors, config
- `src/adapters/` — ports to the outside world; `mocks.ts` for tests
- `src/db/schema/` — Drizzle schema by domain; `src/db/migrations/` — generated SQL
- `src/vendor/shared/` — `@devdigest/shared` Zod contracts
- `test/` — `*.test.ts` hermetic, `*.it.test.ts` real Postgres

## Conventions (non-default)

- New module: create `modules/<name>/routes.ts` and register it by hand in `src/modules/index.ts` (no autoload).
- External dependencies come only from `Container` (`src/platform/container.ts`); tests swap them via `ContainerOverrides`.
- Validate with the route's zod `schema`, not `Schema.parse(req.body)` in the handler.
- Every route resolves tenancy with `getContext(container, req)`.
- A test that imports `test/helpers/pg.ts` must be named `*.it.test.ts`.

## Gotchas

- Migrations are **not** applied on boot.
- Reviews run fire-and-forget (`void executeRuns`), not through JobRunner: no retry, no `jobs` row.
- `RunBus` is in memory; orphaned `running` runs are reaped on boot.
- `repo-intel` degrades silently when a repo is unindexed: the prompt becomes diff-only.
- `modules/pulls/routes.ts` queries Drizzle directly, without service/repository.
- `src/platform/{grounding,prompt,structured}.ts` are re-export shims of `reviewer-core`.
- The schema already holds tables for future milestones; empty tables are expected.

## Do not touch

- Applied files in `src/db/migrations/` and `meta/`: change the schema and run `pnpm db:generate`.
- `src/vendor/shared/` without mirroring the change in `client/src/vendor/shared/`.

## Docs — read when relevant (not auto-loaded)

- README.md — request/DI flow, API map, env vars, review context
- src/modules/repo-intel/README.md — indexer pipeline and facade
- docs/ — deeper server docs; index in docs/README.md
- specs/ — feature specs; read the relevant spec before implementing a feature
- INSIGHTS.md — log of non-obvious findings; append a line when you learn one
- ../TESTING.md — test strategy
