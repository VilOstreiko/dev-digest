# reviewer-core insights

Log of non-obvious findings about `reviewer-core/`: things the code does not make obvious
and that cost time to discover. Written by the `engineering-insights` skill.

- Format: ``- YYYY-MM-DD — <finding> — <why / what to do> (`path` · `symbol`)``, under the matching section.
- Append-only: never edit or delete a line; correct a wrong entry with a new dated entry.
- Consolidation (promote to [`CLAUDE.md`](CLAUDE.md) Gotchas, merge, drop stale) is a separate human-reviewed commit.

## What Works

## What Doesn't Work

## Codebase Patterns

- 2026-11-21 — Map-reduce is already live: `run.ts` picks single-pass or map-reduce from the agent's `strategy`, and the server passes it — README's "later milestones" note about `reduce()` is misleading.
  Evidence: `reviewer-core/src/review/run.ts` · `selectMode`

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
