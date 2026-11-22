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

## Codebase Patterns

- 2026-11-21 — `src/vendor/shared` has drifted from `server/src/vendor/shared` (5 files differ; e.g. `LLMProvider.id` lacks `openrouter`) — check both copies before relying on a contract.
  Evidence: `client/src/vendor/shared/adapters.ts` · `LLMProvider` vs `server/src/vendor/shared/adapters.ts` · `LLMProvider`

## Tool & Library Notes

- 2026-11-22 — A second stack can run next to another worktree's on 3000/3001: `API_PORT=3101 WEB_PORT=3100 pnpm dev` in `server/` (`WEB_PORT` sets the CORS origin) and `NEXT_PUBLIC_API_BASE=http://localhost:3101 pnpm dev --port 3100` in `client/`, sharing the same Postgres. The first `next dev` compile of a route can leave the list skeleton up for ~15 s; that is not a hang, so check the API log before debugging. (`server/src/platform/config.ts` · `API_PORT`/`WEB_PORT`)

## Recurring Errors & Fixes

- 2026-11-22 — React's `Updating a style property during rerender (borderColor) when a conflicting property is set (borderLeftColor)` also fires for `borderColor`/`borderWidth`, not only `border`: both are four-side shorthands. With a side override, write every side as its own longhand. It only shows when the shorthand's value changes, e.g. `focused` flipping after a filter change resets `focusIdx`. (`client/src/app/repos/[repoId]/pulls/[number]/_components/FindingCard/styles.ts` · `s.card`)

## Session Notes

## Open Questions
