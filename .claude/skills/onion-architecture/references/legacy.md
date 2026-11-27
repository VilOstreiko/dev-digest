# Known violations (baseline as of 2026-11-27)

These existed before the skill. Import violations are recorded in
`server/.dependency-cruiser-known-violations.json` (23 entries); container calls from routes in
`server/.route-container-calls-baseline.json` (34 calls in 5 files). `pnpm lint:arch` fails only on new ones.

Policy: **fix on touch**. When a task already changes one of these files, fix the violation in the code
path you touch if it is small and local; otherwise leave it and mention it in the PR. Never extend one
(adding another query to a route that already queries Drizzle is a new finding, tagged `extends-legacy`).
After fixing, run `pnpm lint:arch:baseline` and check that the baseline diff **only removes** entries.

## Routes querying Drizzle directly (rule 2)

| File | Fix direction |
|---|---|
| `src/modules/pulls/routes.ts` | largest; also calls `container.github()`. Extract `PullsService` + `PullListQuery` read port |
| `src/modules/polling/routes.ts` | move queries into `repos` repository / a polling use case |
| `src/modules/settings/routes.ts` | `SettingsService` + repository; `settings/feature-models.ts` also uses `db/schema` |
| `src/modules/workspace/routes.ts` | smallest; worked example in [examples.md](examples.md) |

## Routes calling adapters/ports through the container (rule 3)

Counts per file and member, as in `server/.route-container-calls-baseline.json`:

| File | Calls | Fix direction |
|---|---|---|
| `src/modules/pulls/routes.ts` | `db` ×16, `github` ×4 | `PullsService` with `GitHubClient` + `PullListQuery` ports |
| `src/modules/settings/routes.ts` | `db` ×3, `secrets` ×3, `github` ×1, `llm` ×1 | `SettingsService` (key status, save key, test connection) over `SecretsProvider`/`GitHubClient`/`LLMProvider` |
| `src/modules/polling/routes.ts` | `db` ×3, `github` ×1 | polling use case in `repos` |
| `src/modules/workspace/routes.ts` | `db` ×1 | `WorkspaceService` ([examples.md](examples.md) §2) |
| `src/modules/repo-intel/routes.ts` | `jobs` ×1 | enqueue the index job inside `RepoIntelService` |

`container.repoIntel` in `repo-intel/routes.ts` is not a violation: `RepoIntel` is that module's own
application facade.

## Services depending on the Container / building their own repositories (rules 1, 5)

| File | Note |
|---|---|
| `src/modules/agents/service.ts` | `new AgentsRepository(container.db)` at the constructor; uses `container.llm` |
| `src/modules/reviews/service.ts` | constructs repository; imports `AgentRow` from `src/db/rows.ts` |
| `src/modules/repos/service.ts` | constructs repository; imports `../repo-intel/constants` |
| `src/modules/repo-intel/service.ts` | constructs repository; imports `adapters/codeindex/extract`, `adapters/astgrep`, `node:fs/promises` |

Tests built around these use monkey-patching (`test/repo-intel-resync.test.ts:31-52`).

## Row types and schema outside repositories (rule 4)

- `src/modules/reviews/run-executor.ts`, `src/modules/reviews/diff-loader.ts` — `src/db/rows.ts`, `schema.repos.$inferSelect` as parameter types.
- `src/modules/repos/helpers.ts`, `src/modules/settings/feature-models.ts` — import `db/schema`.
- `src/modules/agents/helpers.ts` — `toAgentDto(row: AgentRow)` maps row → DTO outside the repository.
- `src/modules/agents/repository.ts` — imports `isConfigChange` (a domain rule) from helpers.

Only the first bullet is caught mechanically; the others are review-only findings.

## Adapters importing modules (rule 8)

- `src/adapters/depgraph/index.ts` and `src/adapters/astgrep/index.ts` → `src/modules/repo-intel/constants.ts`.

## Ports defined next to implementations

- `DepGraph` (`src/adapters/depgraph/index.ts`), `Tokenizer` (`src/adapters/tokenizer/index.ts`).

## Composition root returning concrete classes

- `Container.agentsRepo` / `Container.reviewRepo` return `AgentsRepository` / `ReviewRepository`.

## Errors with HTTP status codes

- `src/platform/errors.ts` — `AppError.statusCode`. Kept; new errors follow [errors.md](errors.md).

## reviewer-core SDK leaks (rule 9)

- `reviewer-core/src/llm/openrouter.ts` → `openai` (`OpenRouterProvider`, built by `container.ts`).
- `reviewer-core/src/llm/structured.ts` → `openai/helpers/zod`.
