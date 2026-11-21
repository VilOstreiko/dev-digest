# Run cost badge (client)

## Goal
Show the cost and tokens of each review run, and the cost of a PR's current review,
using the fields the API already returns (`PrMeta.cost_usd`, `RunSummary.cost_usd`,
`RunStats.cost_usd`). See `server/specs/m1-run-cost-badge.md` for the data.

## Scope
- `src/lib/format-cost.ts`: `formatCost` (one format everywhere) and `formatTokenCount`.
- `RunCostBadge` (`pulls/[number]/_components/RunCostBadge`), two variants:
  - `compact`: `9,119 tok · $0.0013`, used in the Timeline run row;
  - `full`: `$0.014 · 8k→1.3k`, used in the verdict banner.
- PR list: a `Cost` column between Status and Updated.
- Timeline (`RunHistory`): the compact badge under the run time, only for `done` runs.
- Run trace drawer (`TraceBody`): a `COST` tile between TOKENS and FINDINGS.
- Verdict banner: the full badge for the review's run, matched by `review.run_id` in the
  runs list that `FindingsTab` already loads (no extra request).

## Acceptance criteria
- `formatCost`: missing cost → `—` (never `$0.00`); below $1 → two significant digits
  (`$0.014`, `$0.0013`, `$0.06`); from $1 up → two decimals; below $0.0001 → `<$0.0001`.
- A failed or cancelled run shows no cost in the Timeline.
- A PR with no reviewed cost shows `—` in the list.
- An old trace without `cost_usd` shows `—` in the COST tile.
- The banner shows no cost line when the review's run is not found.

## Out of scope
- Cost in other screens (Agent Performance, CI runs, eval).
- Currencies other than USD.
