# reviewer-core — @devdigest/reviewer-core

Pure review engine: diff → prompt → LLM → grounded findings. Its only consumer is
`server/`, which imports this package's TypeScript source through a path alias.

## Stack

TypeScript ^5.7 · zod ^3.24 · openai ^4.77 (OpenRouter client) · vitest ^2.1.
Package manager: **npm**.

## Commands

- `npm test` — hermetic, stubbed `LLMProvider`, no keys
- `npm run typecheck` — this is also the build; the package never emits JS
- After changing an exported signature, also run `pnpm typecheck` in `../server`.

## Map

- `src/index.ts` — public API; everything the server uses is exported here
- `src/prompt.ts` — `assemblePrompt`, `wrapUntrusted`, `INJECTION_GUARD`
- `src/grounding.ts` — `groundFindings`: the citation gate against the diff
- `src/llm/` — OpenRouter provider, structured output (Zod → JSON Schema, parse-with-repair)
- `src/review/` — `run.ts` (single-pass or map-reduce, chosen by the agent's `strategy`), `reduce.ts` (merges per-file results)
- `src/output/to-review.ts` — CI payload helper (used from M6)

## Conventions (non-default)

- No DB, filesystem, GitHub or network access. The only side effect is the injected `LLMProvider`.
- Contracts (`Review`, `Finding`, …) come from `@devdigest/shared`, not local types.

## Gotchas

- `@devdigest/shared` resolves to `../server/src/vendor/shared`; `zod` is mapped to this package's own `node_modules` in `tsconfig.json`.
- Prompt slots `skills`, `memory`, `specs` exist for later milestones; the server does not pass them yet, so `assemblePrompt` omits those sections.

## Do not touch

- `INJECTION_GUARD`: do not weaken it or replace it with keyword filtering of untrusted text.
- The grounding gate: findings without a real diff line are dropped, and the score is recomputed from the survivors. Never trust the model's own score.

## Docs — read when relevant (not auto-loaded)

- README.md — pipeline diagram and public API
- docs/ — deeper engine docs; index in docs/README.md
- specs/ — feature specs; read the relevant spec before implementing a feature
- INSIGHTS.md — log of non-obvious findings; append a line when you learn one
- ../TESTING.md — test strategy
