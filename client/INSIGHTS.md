# client insights

Log of non-obvious findings about `client/`: things the code does not make obvious
and that cost time to discover. Written by the `engineering-insights` skill.

- Format: ``- YYYY-MM-DD — <finding> — <why / what to do> (`path` · `symbol`)``, under the matching section.
- Append-only: never edit or delete a line; correct a wrong entry with a new dated entry.
- Consolidation (promote to [`CLAUDE.md`](CLAUDE.md) Gotchas, merge, drop stale) is a separate human-reviewed commit.

## What Works

## What Doesn't Work

- 2026-11-22 — Runtime value imports from `@devdigest/shared` (e.g. `Severity.options`) pass `pnpm test` and `pnpm typecheck` but break `next dev` with `Module not found: Can't resolve './contracts/findings.js'`: the vendored barrel uses `.js` specifiers that Next's webpack does not map to `.ts`. Import only types (`import type`) from it in the client and keep runtime constants local, e.g. `as const satisfies readonly Severity[]`. (`client/src/lib/severity.ts` · `SEVERITIES`)
- 2026-11-22 — An absolutely positioned popover inside a PR-list row gets clipped: the table card has `overflow: hidden`. Render it in a portal with `position: fixed`, positioned from the anchor's rect. React synthetic clicks still bubble through the portal to `PRRow`'s navigate `onClick`, so stop propagation on the card as well. (`client/src/app/repos/[repoId]/pulls/styles.ts` · `tableCard`; `client/src/components/findings-summary/FindingsHoverCard.tsx`)
- 2026-11-22 — A fixed hover card that closes on `window` `scroll` in the capture phase also closes on its own inner scroll and scrollbar drags; skip events whose target is inside the card. A focusable trigger (`tabIndex=0`) that closes on `blur` also closes when the user clicks the card's scrollbar; ignore blur while the pointer is over the trigger or the card. (`client/src/components/findings-summary/SeverityCounters.tsx` · `closeOnOuterScroll`, `blur`)
- 2026-11-27 — The model chip's background is invalid CSS for any model missing from `MODEL_COLOR`, which covers only gpt-4.1/gpt-4o/gpt-4o-mini/o1. `modelColor` falls back to `"var(--text-secondary)"`, and `modelChip` appends `"1a"`, producing `var(--text-secondary)1a`, so the chip renders with no background. This hits every seeded agent (`deepseek/deepseek-v4-flash`). Fix with `color-mix(in srgb, <color> 10%, transparent)` instead of hex-suffix alpha, and add entries for the seeded models. (`client/src/app/agents/_components/AgentCard/styles.ts` · `modelChip`, `AgentCard/helpers.ts` · `modelColor`)
- 2026-11-27 — Some PR-page strings are hard-coded English despite the next-intl rule: the tab labels "Overview" / "Agent runs" / "Files changed" and the "No findings yet" empty state. Do not copy these neighbours. Put new strings in `messages/en/prReview.json`. (`PrDetailHeader.tsx` · `tabs`, `FindingsTab.tsx` · `EmptyState title`)

## Codebase Patterns

- 2026-11-21 — `src/vendor/shared` has drifted from `server/src/vendor/shared` (5 files differ; e.g. `LLMProvider.id` lacks `openrouter`) — check both copies before relying on a contract.
  Evidence: `client/src/vendor/shared/adapters.ts` · `LLMProvider` vs `server/src/vendor/shared/adapters.ts` · `LLMProvider`
- 2026-11-27 — Import style is mixed: about 28 files use 3+ level `../` chains and about 11 use the `@/` alias. `lib/hooks/index.ts` is an `export *` barrel over 5 domain modules, and some files import through it. In evals, agents copied both habits by default. New code should import `@/lib/hooks/<domain>` and `@/components/<name>` directly. (`client/src/lib/hooks/index.ts`, `AgentCard.tsx` · `useDeleteAgent` import)

## Tool & Library Notes

- 2026-11-22 — jsdom does not split a shorthand that contains `var()` (e.g. `border: 1px solid var(--crit)`) into longhands, so `toHaveStyle({ borderColor: "var(--crit)" })` fails even when the browser renders correctly. Write longhands (`borderWidth`/`borderStyle`/`borderColor`) when a test needs to assert one of them. (`client/src/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/styles.ts` · `s.pill`)

- 2026-11-22 — A second stack can run next to another worktree's on 3000/3001: `API_PORT=3101 WEB_PORT=3100 pnpm dev` in `server/` (`WEB_PORT` sets the CORS origin) and `NEXT_PUBLIC_API_BASE=http://localhost:3101 pnpm dev --port 3100` in `client/`, sharing the same Postgres. The first `next dev` compile of a route can leave the list skeleton up for ~15 s; that is not a hang, so check the API log before debugging. (`server/src/platform/config.ts` · `API_PORT`/`WEB_PORT`)

## Recurring Errors & Fixes

- 2026-11-22 — React's `Updating a style property during rerender (borderColor) when a conflicting property is set (borderLeftColor)` also fires for `borderColor`/`borderWidth`, not only `border`: both are four-side shorthands. With a side override, write every side as its own longhand. It only shows when the shorthand's value changes, e.g. `focused` flipping after a filter change resets `focusIdx`. (`client/src/app/repos/[repoId]/pulls/[number]/_components/FindingCard/styles.ts` · `s.card`)

## Session Notes

## Open Questions

- 2026-11-27 — Two client calls have no server route: `api.get(\`/repos/${repoId}/context\`)` and `api.post(\`/repos/${repoId}/context/reindex\`)`. No `routes.ts` under `server/src/modules` registers `/repos/:id/context`, so both 404 at runtime. Unknown whether the route is planned or the hooks are dead. The pr-self-review `api-contract` check flags this kind of call only when a diff adds it. (`client/src/lib/hooks/core.ts` · context hooks)

- 2026-11-27 — No agreed home for shared pure utilities or shared non-data hooks. There is no `src/utils/` or `src/hooks/`. Shared pure functions sit flat in `src/lib/` (`model-label.ts`, `github-urls.ts`), and `lib/hooks/` holds TanStack Query hooks only. The `frontend-ui-architecture` skill assumes `utils/` and `hooks/`. Without it, agents put both kinds in `src/lib/`. Decide one convention and record it in the skill's "In this repo" section and in `client/CLAUDE.md`. (`client/src/lib/` · `model-label.ts`, `.claude/skills/frontend-ui-architecture/SKILL.md` · `In this repo`)
