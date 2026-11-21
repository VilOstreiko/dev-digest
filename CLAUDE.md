# DevDigest

Local-first AI pull-request review. Four independent packages, **no workspace**:
each has its own `package.json` + lockfile; cross-package code is shared via
tsconfig path aliases. Each package has its own `CLAUDE.md` (auto-loaded inside it).

## Map

| Package | Role | Port | Package manager |
|---|---|---|---|
| `server/` | Fastify API + Postgres, hosts `repo-intel` and `@devdigest/shared` | 3001 | pnpm |
| `client/` | Next.js studio UI | 3000 | pnpm |
| `reviewer-core/` | Pure review engine, consumed by server as TS source | — | npm |
| `e2e/` | Deterministic browser flows | — | npm |

## Commands

- `./scripts/dev.sh` — Postgres (Docker) + migrate + seed + API + web. Flags: `--no-seed`, `--no-client`, `--db-only`.
- `docker compose down -v` — drop the DB volume (full reset).
- Run each package's commands from inside that package, with its own package manager.

## Cross-package gotchas

- `@devdigest/shared` exists as **two copies**: `server/src/vendor/shared` and
  `client/src/vendor/shared`. They have already drifted. A contract change must be
  applied to both.
- `reviewer-core` resolves `@devdigest/shared` from `../server/src/vendor/shared`.
- Secrets live in `~/.devdigest/secrets.json` (fallback: env), never in the DB or git.
- Seeded agents use `openrouter` / `deepseek/deepseek-v4-flash`: reviews need
  `OPENROUTER_API_KEY`, not only OpenAI/Anthropic keys.
- Only Postgres runs in Docker; API and web run on the host.

## Docs — read when relevant (not auto-loaded)

- README.md — architecture diagram, quick start, roadmap (M1–M8)
- TESTING.md — test strategy and CI workflow per package
- docs/agent-prompts/ — reviewer agent prompts and model choice
- .claude/skills/README.md — catalog of project skills
