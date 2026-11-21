# e2e insights

Log of non-obvious findings about `e2e/`: things the code does not make obvious
and that cost time to discover.

- One line per finding: `- YYYY-MM-DD — <what we learned> — <why it matters / where>`.
- Newest at the bottom. Append; do not rewrite history.
- When a finding keeps coming up, move it into the Gotchas section of
  [`CLAUDE.md`](CLAUDE.md) and delete it here.

## Log

- 2026-11-21 — `agent-browser` is not a package dependency; it must be installed globally (`npm i -g agent-browser && agent-browser install`) or pointed to via `AGENT_BROWSER_BIN`.
