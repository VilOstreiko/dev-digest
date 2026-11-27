# client insights

Log of non-obvious findings about `client/`: things the code does not make obvious
and that cost time to discover. Written by the `engineering-insights` skill.

- Format: ``- YYYY-MM-DD — <finding> — <why / what to do> (`path` · `symbol`)``, under the matching section.
- Append-only: never edit or delete a line; correct a wrong entry with a new dated entry.
- Consolidation (promote to [`CLAUDE.md`](CLAUDE.md) Gotchas, merge, drop stale) is a separate human-reviewed commit.

## What Works

## What Doesn't Work

- 2026-11-27 — The model chip's background is invalid CSS for any model missing from `MODEL_COLOR`, which covers only gpt-4.1/gpt-4o/gpt-4o-mini/o1. `modelColor` falls back to `"var(--text-secondary)"`, and `modelChip` appends `"1a"`, producing `var(--text-secondary)1a`, so the chip renders with no background. This hits every seeded agent (`deepseek/deepseek-v4-flash`). Fix with `color-mix(in srgb, <color> 10%, transparent)` instead of hex-suffix alpha, and add entries for the seeded models. (`client/src/app/agents/_components/AgentCard/styles.ts` · `modelChip`, `AgentCard/helpers.ts` · `modelColor`)
- 2026-11-27 — Some PR-page strings are hard-coded English despite the next-intl rule: the tab labels "Overview" / "Agent runs" / "Files changed" and the "No findings yet" empty state. Do not copy these neighbours. Put new strings in `messages/en/prReview.json`. (`PrDetailHeader.tsx` · `tabs`, `FindingsTab.tsx` · `EmptyState title`)

## Codebase Patterns

- 2026-11-21 — `src/vendor/shared` has drifted from `server/src/vendor/shared` (5 files differ; e.g. `LLMProvider.id` lacks `openrouter`) — check both copies before relying on a contract.
  Evidence: `client/src/vendor/shared/adapters.ts` · `LLMProvider` vs `server/src/vendor/shared/adapters.ts` · `LLMProvider`
- 2026-11-27 — Import style is mixed: about 28 files use 3+ level `../` chains and about 11 use the `@/` alias. `lib/hooks/index.ts` is an `export *` barrel over 5 domain modules, and some files import through it. In evals, agents copied both habits by default. New code should import `@/lib/hooks/<domain>` and `@/components/<name>` directly. (`client/src/lib/hooks/index.ts`, `AgentCard.tsx` · `useDeleteAgent` import)

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions

- 2026-11-27 — Two client calls have no server route: `api.get(\`/repos/${repoId}/context\`)` and `api.post(\`/repos/${repoId}/context/reindex\`)`. No `routes.ts` under `server/src/modules` registers `/repos/:id/context`, so both 404 at runtime. Unknown whether the route is planned or the hooks are dead. The pr-self-review `api-contract` check flags this kind of call only when a diff adds it. (`client/src/lib/hooks/core.ts` · context hooks)

- 2026-11-27 — No agreed home for shared pure utilities or shared non-data hooks. There is no `src/utils/` or `src/hooks/`. Shared pure functions sit flat in `src/lib/` (`model-label.ts`, `github-urls.ts`), and `lib/hooks/` holds TanStack Query hooks only. The `frontend-ui-architecture` skill assumes `utils/` and `hooks/`. Without it, agents put both kinds in `src/lib/`. Decide one convention and record it in the skill's "In this repo" section and in `client/CLAUDE.md`. (`client/src/lib/` · `model-label.ts`, `.claude/skills/frontend-ui-architecture/SKILL.md` · `In this repo`)
