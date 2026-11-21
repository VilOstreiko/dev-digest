# client insights

Log of non-obvious findings about `client/`: things the code does not make obvious
and that cost time to discover. Written by the `engineering-insights` skill.

- Format: ``- YYYY-MM-DD — <finding> — <why / what to do> (`path` · `symbol`)``, under the matching section.
- Append-only: never edit or delete a line; correct a wrong entry with a new dated entry.
- Consolidation (promote to [`CLAUDE.md`](CLAUDE.md) Gotchas, merge, drop stale) is a separate human-reviewed commit.

## What Works

## What Doesn't Work

## Codebase Patterns

- 2026-11-21 — `src/vendor/shared` has drifted from `server/src/vendor/shared` (5 files differ; e.g. `LLMProvider.id` lacks `openrouter`) — check both copies before relying on a contract.
  Evidence: `client/src/vendor/shared/adapters.ts` · `LLMProvider` vs `server/src/vendor/shared/adapters.ts` · `LLMProvider`

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
