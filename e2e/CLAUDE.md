# e2e — @devdigest/e2e

Deterministic browser flows over the real stack (client + API + seeded DB),
driven by the agent-browser CLI. No Playwright, no LLM, no API keys.

## Stack

agent-browser CLI (Rust + CDP, installed globally: `npm i -g agent-browser && agent-browser install`) ·
tsx ^4.19 · TypeScript ^5.7. Package manager: **npm**.

## Commands

- `npm test` — run all flows against a running stack (`E2E_BASE_URL`, default `http://localhost:3000`)
- `npm run e2e:hermetic` — isolated fresh stack on alternate ports via `../scripts/e2e.sh` (local only; CI calls `npm test`)
- `npm run typecheck`

## Map

- `specs/NN-name.flow.json` — the flows; these are the e2e specs
- `run.ts` — runner: executes each flow's commands in one shared browser session
- `lib/assert.ts` — stdout assertions
- `agent-browser.json` — CLI config

## Conventions (non-default)

- A flow is a JSON list of agent-browser commands. `wait --text` / `wait --url` are the assertions.
- Deterministic locators only (`--url`, `--text`, `find role|text|label`). Never use the AI `chat` command.
- Flows read seeded data only (`acme/payments-api`, PR #482, seeded agents) and never trigger a model call.

## Gotchas

- Needs a freshly seeded DB: flows `01` and `02` follow the home redirect to the first repo and assume the seeded repo is the only one.
- `run.ts` only picks up files ending in `.flow.json`.

## Docs — read when relevant (not auto-loaded)

- README.md — flow format, env vars, how to run locally and in CI
- docs/ — deeper e2e docs; index in docs/README.md
- specs/ — the flow files themselves
- INSIGHTS.md — non-obvious findings by section; read first, append via `engineering-insights`
- ../TESTING.md — test strategy
