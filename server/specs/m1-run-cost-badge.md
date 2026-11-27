# Run cost badge (server)

## Goal
Expose the USD cost of every review run, and the cost of a PR's current review,
so the UI can show what each review costs. No extra model calls: the cost comes
from the provider response (OpenRouter `usage.cost`) or the price book.

## Scope
- `agent_runs.cost_usd` (`double precision`, nullable), added in migration `0010`.
  Commit `d45ab0d` removed it on purpose; this feature brings it back.
- `ReviewRunExecutor` persists `ReviewOutcome.costUsd` on `done` runs and writes it to
  `RunStats.cost_usd` in the trace. Failed and cancelled runs store `null`.
- `GET /pulls/:id/runs` → `RunSummary.cost_usd`.
- `GET /runs/:id/trace` → `RunStats.cost_usd` (`nullish`: older trace documents do not have it).
- `GET /repos/:id/pulls` → `PrMeta.cost_usd`: the sum of `cost_usd` over the latest `done`
  run of each agent on the PR (`latestCostByPr` in `modules/pulls/status.ts`).
- Contracts change in both copies of `@devdigest/shared` (server and client).

## Acceptance criteria
- A `done` run stores the cost reported by the LLM layer; the run list and the trace return the same value.
- PR cost only counts the newest `done` run per agent; older runs of the same agent are ignored.
- Runs with unknown cost are skipped in the sum. A PR with no known cost returns `null`.
- Failed and cancelled runs never add to the PR cost.

## Out of scope
- Partial cost of failed runs (tokens spent before the failure are still discarded).
- Cost aggregates per repo or per agent.
- Seeded runs with cost.
