# server insights

Log of non-obvious findings about `server/`: things the code does not make obvious
and that cost time to discover. Written by the `engineering-insights` skill.

- Format: ``- YYYY-MM-DD — <finding> — <why / what to do> (`path` · `symbol`)``, under the matching section.
- Append-only: never edit or delete a line; correct a wrong entry with a new dated entry.
- Consolidation (promote to [`CLAUDE.md`](CLAUDE.md) Gotchas, merge, drop stale) is a separate human-reviewed commit.

## What Works

## What Doesn't Work

- 2026-11-27 — Symlinking `server/node_modules` (or `reviewer-core/node_modules`) into another worktree breaks `pnpm lint:arch`: dependency-cruiser resolves through the symlink to absolute paths outside the repo (`../../../../Users/.../node_modules/drizzle-orm/index.d.ts`), so none of the 23 baselined violations match and every one reports as new. Install for real with `pnpm install --frozen-lockfile --offline` (store hardlinks, seconds) instead. Also, the `node_modules/` gitignore pattern does not match a symlink, so it shows up as untracked. (`server/.dependency-cruiser-known-violations.json` · `lint:arch:imports`)

## Codebase Patterns

- 2026-11-21 — Fields added to `RunStats` must be `.nullish()`: `getRunTrace` returns the stored `run_traces.trace` jsonb without parsing, so traces written before the field existed come back without it. Per-run cost was removed once on purpose (`d45ab0d`, migration 0009) and restored in 0010; `git show d45ab0d` maps every place the cost goes through. (`server/src/modules/reviews/repository/run.repo.ts` · `getRunTrace`)

## Tool & Library Notes

- 2026-11-27 — `lint:arch` cruises `../reviewer-core/src` from `server/`, so core paths appear as `../reviewer-core/src/...` and its `openai` import is unresolved (reviewer-core's own `node_modules` is usually not installed) and shows up as bare `openai`, not `node_modules/openai/` — rules targeting core must match both forms, as `onion-core-no-sdk` does. Also `tsPreCompilationDeps: true` is required or `import type` leaks (e.g. `AgentRow`) go unseen.
  Evidence: `server/.dependency-cruiser.cjs` · `onion-core-no-sdk`

## Recurring Errors & Fixes

- 2026-11-21 — `pnpm typecheck` in a fresh worktree fails with `Cannot find module 'openai'` / `'zod'` from `../reviewer-core/src/llm/*`, plus follow-on `unknown → T` errors in `src/adapters/llm/{openai,anthropic}.ts`. Cause: the server compiles reviewer-core as source, and reviewer-core has its own `node_modules` that the worktree does not have. Vitest still passes. Fix: run `npm install` in `reviewer-core/` before typechecking. (`server/tsconfig.json` · path aliases)

## Session Notes

## Open Questions
