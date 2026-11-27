# Testing each ring

Each ring is tested at its own level. The onion pays off here: only ring 3 needs Docker.

| Ring | Test type | File name | Uses |
|---|---|---|---|
| Domain | pure unit | `test/<m>-domain.test.ts` | plain values, no mocks |
| Application (use case) | unit with fakes | `test/<m>-service.test.ts` | in-memory repository ports, `Mock*` adapters, fake `TransactionRunner` |
| Delivery (routes) | HTTP via `app.inject` | `test/<m>-routes.test.ts` or `*.it.test.ts` | `buildApp({ overrides })`, fake services/adapters |
| Infrastructure (repository) | integration | `test/<m>-repository.it.test.ts` | Testcontainers Postgres via `test/helpers/pg.ts` |
| Adapter (SDK) | contract test against the port | `test/adapters.test.ts` | recorded payloads, no live network |

## Rules

1. **Use cases are tested without a database.** If you can't, the use case depends on infrastructure —
   fix the dependency, don't reach for Testcontainers.
2. **No monkey-patching privates.** Constructor injection makes `new AgentsService(fakeRepo, fakeLlm, fakeTx)`
   possible. Casting a partial `Container` and overwriting `service['repo']` (as in
   `test/repo-intel-resync.test.ts`) is the symptom of a service that builds its own dependencies.
3. **In-memory fakes implement the port**, so a port change breaks the fake at compile time. Keep shared
   fakes in `test/helpers/` or next to `src/adapters/mocks.ts` for SDK ports.
4. **Repository tests hit real Postgres.** Mapper bugs, tenancy filters and jsonb parsing only show up
   there. A test importing `test/helpers/pg.ts` must be named `*.it.test.ts` (server convention).
5. **Routes are tested through `app.inject`**, asserting status codes and bodies — this is where error
   mapping (`AgentNotFound` → 404) is verified.
6. **reviewer-core** stays hermetic with a stubbed `LLMProvider`.

Commands (from `server/`): `pnpm exec vitest run --exclude '**/*.it.test.ts'` (no Docker),
`pnpm exec vitest run .it.test` (Docker), `pnpm test` (both).

## Sources

- Fastify Testing (`inject`) — https://fastify.dev/docs/latest/Guides/Testing/
- Testcontainers PostgreSQL — https://node.testcontainers.org/modules/postgresql/
- Cockburn, Hexagonal Architecture (every port testable with a fake adapter) — https://alistair.cockburn.us/hexagonal-architecture/
