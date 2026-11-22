# Findings by severity on the PR list (server)

## Goal
Let the PR list show each PR's findings by severity, and list them on hover, from the
same `GET /repos/:id/pulls` call. No new endpoint, no extra request, no migration: the
findings already live in the `findings` table.

## Scope
- Contract (both copies of `@devdigest/shared`, `contracts/platform.ts`):
  - `PrFindingPreview` = `Finding.pick({ id, severity, category, title, file, start_line,
    end_line, confidence, rationale })`.
  - `PrMeta.findings: PrFindingPreview[] | null | undefined`.
- `latestReviewIdsByPrAgent` in `modules/pulls/status.ts`: from reviews sorted newest
  first, keeps the newest review of each agent per PR (same keying as `latestCostByPr`).
- `GET /repos/:id/pulls`: one extra `IN` query on `findings` for those review ids,
  grouped by PR in JS. `score` is unchanged (latest review of the PR).

## Acceptance criteria
- A PR's findings are the union of the newest `review` of every agent; older reviews of
  the same agent are ignored.
- Reviews without an agent are grouped under their own key.
- Dismissed and accepted findings are included.
- A PR that was never reviewed returns `findings: null`; a reviewed PR with no findings
  returns `[]`.
- Severity values are those of the `Severity` contract (`CRITICAL | WARNING | SUGGESTION`).
- The response order of findings is not guaranteed; the client sorts them.

## Out of scope
- Server-side severity counts or sorting.
- Paging or truncating findings in the list response.
