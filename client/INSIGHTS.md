# client insights

Log of non-obvious findings about `client/`: things the code does not make obvious
and that cost time to discover.

- One line per finding: `- YYYY-MM-DD — <what we learned> — <why it matters / where>`.
- Newest at the bottom. Append; do not rewrite history.
- When a finding keeps coming up, move it into the Gotchas section of
  [`CLAUDE.md`](CLAUDE.md) and delete it here.

## Log

- 2026-11-21 — `src/vendor/shared` has drifted from `server/src/vendor/shared` (5 files differ; e.g. `LLMProvider.id` lacks `openrouter`) — check both copies before relying on a contract.
