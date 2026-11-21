# server insights

Log of non-obvious findings about `server/`: things the code does not make obvious
and that cost time to discover.

- One line per finding: `- YYYY-MM-DD — <what we learned> — <why it matters / where>`.
- Newest at the bottom. Append; do not rewrite history.
- When a finding keeps coming up, move it into the Gotchas section of
  [`CLAUDE.md`](CLAUDE.md) and delete it here.

## Log

- 2026-11-21 — Seeded agents use `openrouter` / `deepseek/deepseek-v4-flash` — a fresh setup with only OpenAI/Anthropic keys fails the first review with `ConfigError` (`src/db/seed.ts`).
- 2026-11-21 — Reviews run outside JobRunner (`void executeRuns` in `src/modules/reviews/service.ts`) — no retry and no `jobs` row, unlike clone/index.
