# Application ring: use cases and ports

## Use cases (`service.ts`)

A use case is one user intention: "create agent", "start review run", "resync repo index". It loads
domain objects through ports, applies domain rules, persists through ports, and returns a domain value
or a DTO-ready shape.

Rules:

1. **Constructor injection of exactly what it needs.** Take ports, not the `Container`:

   ```ts
   export class AgentsService {
     constructor(
       private readonly agents: AgentRepositoryPort,
       private readonly llm: LlmResolverPort,
       private readonly tx: TransactionRunner<AgentsUnitOfWork>,
     ) {}
   }
   ```

   Passing `Container` turns it into a service locator: the dependency list is invisible, and tests have
   to fake the whole container or monkey-patch privates (see `test/repo-intel-resync.test.ts:31-52`).
   Existing services that take `Container` are legacy — see [legacy.md](legacy.md).
2. **Never construct infrastructure.** `new AgentsRepository(container.db)` inside a service is the
   pattern to remove; the container builds repositories ([composition-root.md](composition-root.md)).
3. **No framework or storage types.** No `FastifyRequest`, `FastifyReply`, `Db`, Drizzle row types,
   `schema.*.$inferSelect`. Input is a plain typed object (already parsed by the route), output is a domain
   type or a `@devdigest/shared` DTO.
4. **Tenancy is an argument.** The route resolves `workspaceId`/`userId` with `getContext` and passes
   them in; the use case never reads the request.
5. **Thin and explicit.** Orchestration lives here; decisions live in the domain. If a use case grows
   `if` chains about business state, move them to a domain function.
6. One class per module is fine (`AgentsService` with several methods). Split into one-class-per-use-case
   only when a method's dependencies diverge strongly from its siblings.

## Ports

A port is an interface owned by the ring that **uses** it, describing what it needs in its own terms.

> **Not in the code yet (as of 2.0.0).** No module has a `ports.ts`, and `src/platform/ports.ts` does not exist. SDK ports in
> `src/vendor/shared/adapters.ts` and `RepoIntel` in `modules/repo-intel/types.ts` are real; the others
> in this file are the target shape.

| Port kind | Where | Examples |
|---|---|---|
| SDK / platform ports shared by many modules | `src/vendor/shared/adapters.ts` (both shared copies if the client needs it) | `LLMProvider`, `GitHubClient`, `GitClient`, `CodeIndex`, `Embedder`, `SecretsProvider`, `AuthProvider` |
| Module persistence ports | `modules/<m>/ports.ts` | `AgentRepositoryPort`, `RunRepositoryPort` |
| Cross-cutting application ports | `src/platform/ports.ts` | `TransactionRunner`, `Clock`, `IdGenerator`, `RunEvents` (wraps `RunBus`) |
| Module facades consumed by other modules | `modules/<m>/types.ts` or `ports.ts` | `RepoIntel` (already done right) |

Rules:

1. Name methods in domain language (`findEnabledForWorkspace`, `recordVersion`), not table language
   (`selectWhere`, `insertRow`).
2. Port signatures use domain types and primitives only. If a port mentions a Drizzle type, it is not a
   port.
3. Every port has an in-memory or mock implementation for tests — SDK ports in `src/adapters/mocks.ts`,
   repository ports as small in-memory classes next to the test or in `test/helpers/`.
4. Keep the interface separate from the implementation file. `DepGraph` and `Tokenizer` currently live
   in the same file as their implementation — split them when you touch them.
5. A module that needs another module's data asks for a port (or the other module's facade), never
   imports its `repository.ts`.

## Sources

- Cockburn, Hexagonal Architecture — https://alistair.cockburn.us/hexagonal-architecture/
- Stemmler, Application layer use cases — https://khalilstemmler.com/articles/enterprise-typescript-nodejs/application-layer-use-cases/
- Herberto Graça, Explicit Architecture — https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/
- Seemann, Layers, Onions, Ports, Adapters — https://blog.ploeh.dk/2013/12/03/layers-onions-ports-adapters-its-all-the-same/
- Sairyss/domain-driven-hexagon — https://github.com/Sairyss/domain-driven-hexagon
