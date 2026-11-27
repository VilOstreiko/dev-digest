---
name: onion-architecture
description: Enforces Onion Architecture (ports & adapters, inward-only dependencies) in the DevDigest backend — server/ (Fastify 5, Drizzle ORM, zod, Postgres, octokit/openai/anthropic/simple-git adapters, hand-written DI container) and reviewer-core/. Use whenever writing, moving or reviewing backend code — a new module, route, service/use case, repository, adapter, port, mapper, transaction or domain error — and whenever the question is "where should this go", "can this import that", "should the route query the DB", "how do I inject this", or a backend PR needs a layering review, even if the user never says "onion" or "architecture". Not for the Next.js client (use frontend-ui-architecture).
metadata:
  version: 2.0.4
  updated: 2026-11-27
  scope: server/, reviewer-core/
---

# Onion Architecture — DevDigest backend

Version 2.0.4. Changelog and every source behind these rules: [README.md](README.md).

## Why this exists

Business logic must not know how it is delivered (Fastify), stored (Drizzle/Postgres) or which vendor
answers (OpenRouter, GitHub, git). When that holds, use cases are unit-testable with fakes, adapters are
swappable through `ContainerOverrides`, and a schema or SDK change stays inside one file. The server is
already half-way there (SDK ports, `Container`, `Mock*` adapters); this skill keeps new code on the
right side of the line and stops the known leaks from spreading.

## The rings

Dependencies point **inward only**. An inner ring never imports an outer one — not even a type.

| Ring | Holds | Lives in | May import |
|---|---|---|---|
| 1. Domain | entities, value objects, pure rules/calculations, domain errors | `modules/<m>/domain.ts` (or `domain/`); `reviewer-core/src/{prompt,grounding,review}` | other domain code, `platform/errors.ts`, `@devdigest/shared` types |
| 2. Application | use cases (`service.ts`), repository/tx **ports** (`ports.ts`) | `modules/<m>/service.ts`, `modules/<m>/ports.ts`; SDK ports in `src/vendor/shared/adapters.ts` | rings 1–2, `@devdigest/shared` |
| 3. Infrastructure | Drizzle repositories + row↔domain mappers, SDK adapters, db client/schema | `modules/<m>/repository.ts` (or `repository/`), `src/adapters/*`, `src/db/*` | rings 1–3, drizzle, SDKs |
| 4. Delivery | Fastify routes/plugins, zod route schemas, DTO mapping, error→HTTP | `modules/<m>/routes.ts`, error handler in `src/app.ts` | rings 1–2 (calls use cases), `_shared/context` |
| Root | composition root: builds the object graph once | `src/platform/container.ts`, `src/app.ts`, `src/server.ts` | everything |

`@devdigest/shared` (`src/vendor/shared`) is the contract kernel: API DTO schemas and SDK port interfaces.
Every ring may import it; it imports nothing from the server.

## Where does this code go?

Ask in order, stop at the first yes:

1. Does it decide something about the business with no I/O (score, eligibility, state transition, config diff)? → **Domain**.
2. Does it orchestrate a user action — load, decide, save, call a port? → **Use case** in `service.ts`.
3. Does it describe what the use case needs from the outside (persist X, ask the LLM, read git)? → **Port** interface in `ports.ts` (module-owned) or `vendor/shared/adapters.ts` (SDK-level, shared).
4. Does it talk to Postgres, an SDK, the filesystem or a process? → **Adapter**: `repository.ts` or `src/adapters/<name>/`.
5. Does it parse HTTP input, pick a status code or shape a response? → **Route** in `routes.ts`.
6. Does it `new` something or choose an implementation? → **Container**.

## Hard rules (what review blocks on)

1. `service.ts`, `ports.ts`, `domain*` import nothing from `fastify`, `drizzle-orm`, `postgres`, `src/db/*`, `src/adapters/*`, `octokit`, `openai`, `@anthropic-ai/sdk`, `simple-git`, `node:fs`, `node:child_process`.
2. Routes never touch `container.db`, `src/db/*` or a `repository.ts`; a handler parses input, calls **one** use case, maps the result.
3. Routes never call adapters or ports — not by import (`src/adapters/*`, SDKs) and not through the container (`container.github()`, `.git`, `.llm()`, `.secrets`, `.auth`, `.codeIndex`, `.embedder`, `.depgraph`, `.tokenizer`, `.jobs`, `.agentsRepo`, `.reviewRepo`). From the container a route takes only services/use-case facades (and `config`), and resolves tenancy with `getContext`. The HTTP adapter drives the application; it does not drive other adapters.
4. Repositories implement a port and return domain types. Drizzle row types (`$inferSelect`, `src/db/rows.ts`) and `drizzle-zod` schemas never leave ring 3.
5. Use cases receive their repositories and ports through the constructor. Only the container (or a module's factory called by it) uses `new` on adapters/repositories.
6. Transactions are opened by the use case through a `TransactionRunner` port; repositories accept the executor, they never start a transaction themselves.
7. Domain and application throw typed domain errors with no HTTP knowledge; the single `setErrorHandler` in `src/app.ts` owns status codes. SDK errors are translated inside their adapter.
8. `src/adapters/*` never imports `src/modules/*`; a module never imports another module's `repository.ts` or internals — share through a port, the container, or `@devdigest/shared`.
9. `reviewer-core/src` stays SDK-free: no `openai`, `@anthropic-ai/sdk`, network, fs or DB. Its only side effect is the injected `LLMProvider`.

Pragmatism matters as much as purity: don't add a pass-through layer that does nothing. A read-only
endpoint may be route → use case → repository with a trivial use case; that is fine. What is not fine
is skipping a ring or pointing a dependency outward. See [references/domain.md](references/domain.md).

## Building blocks that do not exist yet

The references describe a target shape. These pieces are **not in `server/src` yet** — do not import them
as if they were. Create one in the first change that actually needs it, in the shape the reference gives,
and don't add any of them speculatively:

| Building block | Create in | Shape |
|---|---|---|
| `Tx`, `DbExecutor` types | `src/db/client.ts` | [transactions.md](references/transactions.md) |
| `TransactionRunner<R>` port, `Clock`/`IdGenerator`/`RunEvents` ports | `src/platform/ports.ts` (new file) | [transactions.md](references/transactions.md), [application-and-ports.md](references/application-and-ports.md) |
| `DrizzleTransactionRunner` | `src/db/transaction-runner.ts` (new file) | [transactions.md](references/transactions.md) |
| `DomainError` and its kinds (`NotFound`, `Conflict`, …) + their HTTP mapping | `src/platform/errors.ts`, error handler in `src/app.ts` | [errors.md](references/errors.md) |
| `modules/<m>/ports.ts`, `modules/<m>/domain.ts` | per module | [application-and-ports.md](references/application-and-ports.md), [domain.md](references/domain.md) |
| Service getters on `Container` (`agentsService`, …) | `src/platform/container.ts` | [composition-root.md](references/composition-root.md) |

Names used only for illustration — `LlmResolverPort`, `AgentRepositoryPort`, `AgentNotFound`,
`applyAgentPatch`, the `review-presets` module and its `t.reviewPresets` table — are examples, not code.
After creating a building block, update this table (patch version bump in README).

## Workflow: writing backend code

1. Read `server/INSIGHTS.md` (project rule) and classify every file you are about to create or change by ring, using the table above.
2. Open only the reference file(s) for the rings you touch:
   - route / plugin / request schema → [references/fastify-delivery.md](references/fastify-delivery.md)
   - use case, ports, constructor injection → [references/application-and-ports.md](references/application-and-ports.md)
   - entity, value object, pure rule → [references/domain.md](references/domain.md)
   - Drizzle repository, mapper, row types → [references/drizzle-persistence.md](references/drizzle-persistence.md)
   - multi-repository write → [references/transactions.md](references/transactions.md)
   - SDK adapter (GitHub, git, LLM, embedder, secrets) → [references/adapters.md](references/adapters.md)
   - input/LLM/GitHub payload parsing → [references/zod-boundaries.md](references/zod-boundaries.md)
   - errors → [references/errors.md](references/errors.md)
   - wiring in `container.ts` → [references/composition-root.md](references/composition-root.md)
   - anything in `reviewer-core/` → [references/reviewer-core.md](references/reviewer-core.md)
   - tests → [references/testing.md](references/testing.md)
3. For a new module, follow the worked example in [references/examples.md](references/examples.md).
4. If you edit a file listed in [references/legacy.md](references/legacy.md), fix its violation in the touched code path when the change is small and local; otherwise leave it and say so.
5. Run the checks from `server/`:
   ```bash
   pnpm lint:arch
   pnpm typecheck
   pnpm exec vitest run --exclude '**/*.it.test.ts'
   ```
   `lint:arch` runs two checks, each against its own baseline: `lint:arch:imports` (dependency-cruiser,
   `.dependency-cruiser-known-violations.json`) and `lint:arch:routes` (container calls from routes,
   `.route-container-calls-baseline.json`). Either fails only on a NEW violation. Never "fix" a failure by
   regenerating a baseline — baselines only shrink. Details: [references/enforcement.md](references/enforcement.md).

## Workflow: reviewing a diff

1. Run `pnpm lint:arch` in `server/`; each reported rule is a finding.
2. Walk the diff file by file: classify the file's ring, then check its imports and its responsibilities against the hard rules. Imports are mechanical; responsibilities (business logic in a route, SQL-shaped logic in a use case, HTTP codes in domain) need reading.
3. Check items in `legacy.md` separately: untouched legacy is not a finding; legacy that the diff extends (new query or new `container.github()` in `pulls/routes.ts`, new caller of a row type) is.
4. Report as a **numbered list**, most severe first, one decision per number:

   ```
   1. [introduced] server/src/modules/foo/service.ts:12 — imports `drizzle-orm` (rule 1).
      Fix: move the query into FooRepository.findActive(), expose it on FooRepositoryPort.
   2. [extends-legacy] server/src/modules/pulls/routes.ts:88 — new direct db query (rule 2). ...
   3. [introduced] server/src/modules/agents/routes.ts:40 — calls `container.github()` (rule 3).
      Fix: add the call to a GitHub-backed port used by AgentsService; the route calls the service.
   ```
   Tags: `introduced` (new violation), `extends-legacy` (makes a known one bigger), `pre-existing` (only if asked for a full audit).

## Related skills

Defer to these for tool mechanics; this skill only decides *where* code goes and *what it may import*:
`fastify-best-practices` (plugins, hooks, schemas), `drizzle-orm-patterns` (queries, relations,
migrations), `zod` (schema design), `postgresql-table-design`, `typescript-expert`, `security`.
