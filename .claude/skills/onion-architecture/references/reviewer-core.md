# reviewer-core: the shared core package

`reviewer-core/` is the purest part of the backend: diff → prompt → LLM → grounded findings. It is
consumed by `server/` as TypeScript source (path alias). Treat the whole package as domain + application;
it has no infrastructure ring of its own.

## Rules

1. **No I/O except the injected `LLMProvider`.** No DB, filesystem, GitHub, git, network, env, clock
   side effects. Pass inputs in; return values out (`reviewer-core/CLAUDE.md`).
2. **No vendor SDKs.** `openai`, `@anthropic-ai/sdk` and their helpers belong in `server/src/adapters/llm/`.
   Two known leaks — `src/llm/openrouter.ts` (`OpenRouterProvider`, imported by the server container) and
   `src/llm/structured.ts` (`openai/helpers/zod`) — are legacy. When touched, move the provider to
   `server/src/adapters/llm/openrouter.ts` and keep only provider-agnostic structured-output logic here.
3. **Contracts come from `@devdigest/shared`**, which resolves to `../server/src/vendor/shared`.
   Don't define local copies of `Review`, `Finding`, etc.
4. **Public API through `src/index.ts` only.** The server imports `@devdigest/reviewer-core`, never deep
   paths. After changing an exported signature, run `pnpm typecheck` in `server/`.
5. **Do-not-touch rules still apply:** `INJECTION_GUARD` and the grounding gate are domain invariants
   (findings without a real diff line are dropped; the score is recomputed from survivors).
6. **Tests** are hermetic with a stubbed `LLMProvider` (`npm test`); keep them that way.

## Sources

- Palermo, Onion Architecture pt 4 (core compiles and runs without infrastructure) — https://jeffreypalermo.com/2013/08/onion-architecture-part-4-after-four-years/
- Cockburn, Hexagonal Architecture — https://alistair.cockburn.us/hexagonal-architecture/
