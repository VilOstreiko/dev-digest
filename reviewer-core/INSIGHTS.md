# reviewer-core insights

Log of non-obvious findings about `reviewer-core/`: things the code does not make obvious
and that cost time to discover.

- One line per finding: `- YYYY-MM-DD — <what we learned> — <why it matters / where>`.
- Newest at the bottom. Append; do not rewrite history.
- When a finding has come up in 2+ sessions, move it into the Gotchas section of
  [`CLAUDE.md`](CLAUDE.md) and delete it here. Do not log what CLAUDE.md already says.

## Log

- 2026-11-21 — Map-reduce is already live: `run.ts` picks single-pass or map-reduce from the agent's `strategy`, and the server passes it — README's "later milestones" note about `reduce()` is misleading.
