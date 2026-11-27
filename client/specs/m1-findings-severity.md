# Findings severity counters, hover list and severity pills (client)

## Goal
Show findings by severity instead of a bare count, list them on hover, and let the user
filter a review run's findings by severity. Data comes from what is already loaded:
`PrMeta.findings` on the PR list (see `server/specs/m1-findings-severity.md`) and
`usePrReviews` on the PR page. Nothing here sends a request or runs a model.

## Scope
- `src/lib/severity.ts`: `SEVERITIES` (from the `Severity` contract), `SEVERITY_ORDER`,
  `sortBySeverity`, `countBySeverity`.
- `src/components/findings-summary/`:
  - `SeverityCounters`: icon + count per severity, colours, icons and labels from `SEV`.
  - `FindingsHoverCard`: the hover list (severity, title, category, `file:line`,
    confidence, 2-line rationale).
- PR list: a `Findings` column between Score and Status.
- Timeline (`RunHistory`): counters under the agent name, from the review whose
  `run_id` matches the run (`FindingsTab` builds the map); the blockers suffix stays.
- Review run accordion (`FindingsPanel`): severity pills left of Hide low confidence,
  in one row, separated by a divider.

## Acceptance criteria
- Counters run left to right from CRITICAL to SUGGESTION; severities with no findings
  are not shown.
- Hovering or focusing the counters shows a help cursor and a panel with every finding,
  sorted from highest to lowest severity.
- Clicking the counters does not open the PR and sends no request.
- PR list: no findings (never reviewed, or none found) shows a muted `—`.
- Timeline: when the run's review is not loaded or has no findings, the old
  `N finding(s)` text stays.
- Pills: one per severity present in the review, highest first, labelled
  `<count> <label>`. No findings → no pills.
- A pill's count follows Hide low confidence (it counts only the findings the toggle
  leaves), but not the severity filter. If the toggle hides every finding of a
  severity, its pill stays with `0` and keeps its selection.
- Pills are a single-choice filter: picking one deselects the other; clicking the
  selected pill clears the filter and shows every severity.
- The selected pill uses its severity's colour (`SEV.c` text and border, `SEV.bg` fill)
  and has `aria-pressed="true"`.
- The severity filter and Hide low confidence combine: only findings passing both stay.
  If nothing passes, the "No findings match" empty state shows.
- Dismissed findings are counted and listed.

## Out of scope
- Filtering the PR list by severity.
- Changing the accordion header (`N findings · M blockers`).
- The `INFO` level of `SEV`, which the `Severity` contract does not have.
