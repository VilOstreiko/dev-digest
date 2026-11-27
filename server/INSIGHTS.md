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

## Tool & Library Notes

- 2026-11-27 — `lint:arch` cruises `../reviewer-core/src` from `server/`, so core paths appear as `../reviewer-core/src/...` and its `openai` import is unresolved (reviewer-core's own `node_modules` is usually not installed) and shows up as bare `openai`, not `node_modules/openai/` — rules targeting core must match both forms, as `onion-core-no-sdk` does. Also `tsPreCompilationDeps: true` is required or `import type` leaks (e.g. `AgentRow`) go unseen.
  Evidence: `server/.dependency-cruiser.cjs` · `onion-core-no-sdk`

## Recurring Errors & Fixes

## Session Notes

## Open Questions
