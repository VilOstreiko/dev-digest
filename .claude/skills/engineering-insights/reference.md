# Engineering insights — reference

## Entry format

```
- YYYY-MM-DD — <finding> — <why it matters / what to do> (`path` · `symbol`)
```

- One entry, one line. Concrete names and numbers, no hedging.
- Evidence is a path plus a symbol (function, type, constant, route), not a line number: line numbers go stale after the first refactor, a symbol stays greppable.
- A correction or addition is a new entry: `- YYYY-MM-DD — Update to "<first words of old entry>": <what is actually true / new> (...)`.

## Sections

| Section | What belongs there |
|---|---|
| What Works | An approach that solved a real problem here and should be reused |
| What Doesn't Work | Dead ends, antipatterns, approaches that looked right and failed — and why. The most valuable section; the most often skipped |
| Codebase Patterns | Conventions and architectural decisions with their reason, that the code alone does not explain |
| Tool & Library Notes | Dependency quirks, version-specific behaviour, CLI flags that matter |
| Recurring Errors & Fixes | Exact error text (or its stable part) → cause → fix |
| Session Notes | `YYYY-MM-DD — <1–2 line summary>` only for a session with a real problem, decision or discovery |
| Open Questions | Something found but not resolved; what is known so far and where to look |

## Vague vs useful

| Bad (noise) | Good (actionable cold) |
|---|---|
| Promises can be tricky | `Promise.all()` on the ingest pipeline times out after ~30 items — use `Promise.allSettled()` in batches of 10 for this module |
| Be careful with async state | Checkout-flow state always goes through Zustand (`cartStore.ts`) because 3 components share the cart; local state does not work here |
| Be careful with imports | Avoid relative imports in `/utils` — the build step resolves them incorrectly; use the path alias |
| Shared types may differ | `client/src/vendor/shared` has drifted from `server/src/vendor/shared` (`LLMProvider.id` lacks `openrouter`) — check both copies before relying on a contract |
| README might be outdated | Map-reduce is already live (`reviewer-core/src/review/run.ts` · `selectMode` picks it from the agent's `strategy`); README's "later milestones" note about `reduce()` is wrong |

Test before writing: if it is obvious to anyone reading the code, do not write it.

## Do not write

- Generic programming knowledge or framework docs.
- What CLAUDE.md, README or specs already say.
- One-off incidents that will not recur (a typo, a flaky network call).
- A replay of the session — extract the lesson, not the history.

## Maintenance (humans, not the agent during capture)

- Past ~200 entries per file, or once a finding has come up in 2+ sessions: a separate, reviewed commit promotes it to the package CLAUDE.md Gotchas and removes it here, merges duplicates, and drops fixed or stale entries.
