# onion-architecture

**Version:** 2.0.4 · **Updated:** 2026-11-27 · **Scope:** `server/`, `reviewer-core/`

A project skill that keeps the DevDigest backend in Onion Architecture (ports & adapters, dependencies
pointing inward only). The agent uses it to decide which ring new code goes in and what it may import,
and to review backend diffs. `pnpm lint:arch` in `server/` checks the import rules (dependency-cruiser) and
that routes do not call adapters through the container (a heuristic script).

## Contents

| File | Purpose |
|---|---|
| [SKILL.md](SKILL.md) | entry point: rings, hard rules, write and review workflows |
| [references/domain.md](references/domain.md) | entities, value objects, pure rules |
| [references/application-and-ports.md](references/application-and-ports.md) | use cases, port interfaces, constructor injection |
| [references/fastify-delivery.md](references/fastify-delivery.md) | routes and plugins as the delivery adapter |
| [references/drizzle-persistence.md](references/drizzle-persistence.md) | repositories, mappers, row types |
| [references/transactions.md](references/transactions.md) | `TransactionRunner` port, `Db \| Tx` executors |
| [references/adapters.md](references/adapters.md) | SDK adapters (GitHub, git, LLM, embedder, secrets) |
| [references/zod-boundaries.md](references/zod-boundaries.md) | where untrusted data is parsed |
| [references/errors.md](references/errors.md) | typed domain errors, one HTTP mapping |
| [references/composition-root.md](references/composition-root.md) | `Container` rules |
| [references/reviewer-core.md](references/reviewer-core.md) | the pure core package |
| [references/testing.md](references/testing.md) | which test type for each ring |
| [references/enforcement.md](references/enforcement.md) | dependency-cruiser rules and commands |
| [references/legacy.md](references/legacy.md) | known violations (baseline) and the fix-on-touch policy |
| [references/examples.md](references/examples.md) | a new module end to end; moving a route query behind a use case |

Enforcement files live in `server/`:

- `.dependency-cruiser.cjs` and `.dependency-cruiser-known-violations.json` — import rules and their baseline; `scripts/expand-arch-baseline.mjs` adds bare-name twins for reviewer-core entries;
- `scripts/check-route-container-calls.mjs` and `.route-container-calls-baseline.json` — container calls from routes and their baseline;
- `package.json` scripts `lint:arch`, `lint:arch:imports`, `lint:arch:routes`, `lint:arch:baseline`.

## Decisions behind this version

1. Enforcement uses dependency-cruiser plus a baseline of known violations. eslint-plugin-boundaries is not used.
2. Existing violations are baselined and fixed when a task touches them. There is no up-front refactor.
3. Expected failures are thrown as typed domain errors and mapped to HTTP status codes in `setErrorHandler`. `Result` values are not used.
4. Transactions go through a `TransactionRunner` port that the use case owns. Repositories accept a `Db | Tx` executor.
5. Code is sliced by feature first (`modules/<m>/`), then by layer inside each feature. This keeps the number of files down.
6. Routes never call adapters or ports, whether by import or through the container (hard rule 3, since 2.0.0). Imports are checked by dependency-cruiser. Container calls are checked by a regex script with its own baseline, until routes receive only their services through Fastify decorations.

## Versioning

Semantic versioning, kept in `metadata.version` in `SKILL.md` and in the header of this file. Bump both together.

- **Major**: a hard rule is added or removed, or a dependency-cruiser rule becomes stricter in a way that fails code that passed before.
- **Minor**: a new reference file, a new rule that the baseline already covers, or a new example.
- **Patch**: wording, links, and updates to `legacy.md` after violations are fixed.

## Changelog

- **2.0.4** (2026-11-27): removes the eval cases (`evals/`) from the skill.
- **2.0.3** (2026-11-27): fixes from eval iteration 2.
  - `examples.md` now names the port method `listSummariesForWorkspace` instead of `listClonedForWorkspace`, which wrongly suggested filtering to cloned repos.
  - `errors.md` now says to map the `DomainError` base class, so that an unmapped kind does not return 500.
  - `enforcement.md` now says to compare a regenerated baseline as a set, because dependency-cruiser may reorder it.
- **2.0.2** (2026-11-27): fixes from the first eval iteration.
  - The import baseline now records reviewer-core SDK imports in both forms, resolved path and bare package name, via `scripts/expand-arch-baseline.mjs`, so `lint:arch` no longer reports false violations depending on whether `reviewer-core/node_modules` is installed.
  - The eval fixture `feature.diff` now compiles.
  - Grader `branches-endpoint-github/04` now also requires that the service has no `Container` dependency.
  - Eval prompts are now in English.
- **2.0.1** (2026-11-27): marks the building blocks that are not in the code yet (`DbExecutor`, `TransactionRunner`, `platform/ports.ts`, `DomainError`, service getters, module `ports.ts`/`domain.ts`). There is a new table in `SKILL.md` and a note in each affected reference file.
- **2.0.0** (2026-11-27): new hard rule 3, "routes never call adapters or ports", which renumbers the old rules 3–8 to 4–9. New dependency-cruiser rule `onion-routes-no-adapters` and a new check `lint:arch:routes` with 34 known calls baselined. `composition-root.md` now limits what routes may take from `app.container`, and `enforcement.md` documents the heuristic and its planned replacement. This is a major bump because the new rule fails code that passed under 1.0.0.
- **1.0.0** (2026-11-27): first version. Defines five rings mapped to the repo, eight hard rules, 14 reference files and 9 dependency-cruiser rules, with 23 known violations baselined.

## Sources

Every link below was checked and resolved on 2026-11-27.

### Onion Architecture and its relatives

- Jeffrey Palermo, *The Onion Architecture: part 1*: https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/ — code may depend only on layers closer to the centre; interfaces sit in the core and implementations at the edge.
- Jeffrey Palermo, *part 2*: https://jeffreypalermo.com/2008/07/the-onion-architecture-part-2/ — the layers and the dependency path between them.
- Jeffrey Palermo, *part 3*: https://jeffreypalermo.com/2008/08/the-onion-architecture-part-3/ — a worked example in which dependencies are wired at startup.
- Jeffrey Palermo, *part 4: After Four Years*: https://jeffreypalermo.com/2013/08/onion-architecture-part-4-after-four-years/ — the core tenets; the core compiles and runs without any infrastructure.
- Alistair Cockburn, *Hexagonal Architecture*: https://alistair.cockburn.us/hexagonal-architecture/ — ports, primary and secondary adapters, and testing every port with a fake.
- Robert C. Martin, *The Clean Architecture*: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html — the Dependency Rule; data crosses boundaries as simple structures.
- Herberto Graça, *Explicit Architecture*: https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/ — combines DDD, hexagonal, onion and clean; components are sliced by feature.
- Mark Seemann, *Layers, Onions, Ports, Adapters: it's all the same*: https://blog.ploeh.dk/2013/12/03/layers-onions-ports-adapters-its-all-the-same/ — onion is layering with dependency inversion applied.
- Mark Seemann, *Composition Root*: https://blog.ploeh.dk/2011/07/28/CompositionRoot/ — wire the object graph in one place, close to the entry point.
- Microsoft, *Common web application architectures*: https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures — Application Core with Infrastructure implementing its interfaces.
- Microsoft, *DDD-oriented microservice*: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice — a domain layer that ignores persistence and a thin application layer.
- Microsoft, *Infrastructure persistence layer design*: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design — one repository per aggregate, plus a unit of work.
- Martin Fowler, *PresentationDomainDataLayering*: https://martinfowler.com/bliki/PresentationDomainDataLayering.html — layer inside each feature module.
- Martin Fowler, *Repository*: https://martinfowler.com/eaaCatalog/repository.html — a repository behaves like a collection of domain objects.
- Martin Fowler, *Unit of Work*: https://martinfowler.com/eaaCatalog/unitOfWork.html — changes are committed together.

### TypeScript and Node practice

- Khalil Stemmler, *Repository, DTO and Mapper*: https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/ — ORM rows never leave the mapper.
- Khalil Stemmler, *Application layer use cases*: https://khalilstemmler.com/articles/enterprise-typescript-nodejs/application-layer-use-cases/ — use cases with dependencies injected through the constructor.
- Khalil Stemmler, *Handling errors with a Result class*: https://khalilstemmler.com/articles/enterprise-typescript-nodejs/handling-errors-result-class/ — the alternative to thrown errors that we considered and did not choose.
- Sairyss, *domain-driven-hexagon*: https://github.com/Sairyss/domain-driven-hexagon — a full TypeScript reference covering ports, mappers, errors and boundary enforcement.
- jbuget, *nodejs-clean-architecture-app*: https://github.com/jbuget/nodejs-clean-architecture-app — a small clean-architecture app in Node.
- marcoturi, *fastify-boilerplate*: https://github.com/marcoturi/fastify-boilerplate — Fastify with repository ports, checked by dependency-cruiser in CI.
- Sentry, *Atomic repositories in Clean Architecture and TypeScript*: https://blog.sentry.io/atomic-repositories-in-clean-architecture-and-typescript — transactions across repositories with Drizzle.

### Tools in this stack

- Fastify, *Encapsulation*: https://fastify.dev/docs/latest/Reference/Encapsulation/
- Fastify, *Plugins*: https://fastify.dev/docs/latest/Reference/Plugins/
- Fastify, *Decorators*: https://fastify.dev/docs/latest/Reference/Decorators/
- Fastify, *Type Providers*: https://fastify.dev/docs/latest/Reference/Type-Providers/
- turkerdev, *fastify-type-provider-zod*: https://github.com/turkerdev/fastify-type-provider-zod
- Fastify, *Testing* (`inject`): https://fastify.dev/docs/latest/Guides/Testing/
- Fastify, *Errors*: https://fastify.dev/docs/latest/Reference/Errors/
- Drizzle, *Transactions*: https://orm.drizzle.team/docs/transactions
- Drizzle, *Goodies* (`$inferSelect` / `$inferInsert`): https://orm.drizzle.team/docs/goodies
- Drizzle, *drizzle-zod*: https://orm.drizzle.team/docs/zod
- Alexis King, *Parse, don't validate*: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
- dependency-cruiser, *rules reference*: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
- dependency-cruiser, *rules tutorial*: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-tutorial.md
- javierbrea, *eslint-plugin-boundaries*: https://github.com/javierbrea/eslint-plugin-boundaries (considered, not adopted)
- Testcontainers, *PostgreSQL module*: https://node.testcontainers.org/modules/postgresql/

### Pitfalls and criticism

- Martin Fowler, *AnemicDomainModel*: https://martinfowler.com/bliki/AnemicDomainModel.html — entities that only hold data, with all logic in services.
- Vladimir Khorikov, *Domain model purity vs completeness*: https://enterprisecraftsmanship.com/posts/domain-model-purity-completeness/ — the trade-off between purity, completeness and performance.
- Jimmy Bogard, *Vertical Slice Architecture*: https://www.jimmybogard.com/vertical-slice-architecture/ — the case against needless layers.
- James Hickey, *Clean Architecture disadvantages*: https://www.jamesmichaelhickey.com/clean-architecture/ — the cost of ceremony.
