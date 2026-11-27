# Infrastructure ring: Drizzle repositories

Drizzle is a *secondary* (driven) adapter. Its types and query builder stay inside `repository.ts`.

## Shape of a repository

> **Not in the code yet (as of 2.0.0).** `DbExecutor` is not exported from `src/db/client.ts` yet (only `Db` is); add it as
> shown in [transactions.md](transactions.md). Existing repositories take `Db` and return row types.

```ts
import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { Agent } from './domain.js';
import type { AgentRepositoryPort } from './ports.js';

type AgentRow = typeof t.agents.$inferSelect;

function toDomain(row: AgentRow): Agent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    enabled: row.enabled,
    version: row.version,
    config: {
      provider: row.provider as Provider,
      model: row.model,
      systemPrompt: row.systemPrompt,
      strategy: row.strategy as ReviewStrategy,
    },
  };
}

export class DrizzleAgentRepository implements AgentRepositoryPort {
  constructor(private readonly db: DbExecutor) {}

  async findById(workspaceId: string, id: string): Promise<Agent | undefined> {
    const [row] = await this.db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.id, id)));
    return row ? toDomain(row) : undefined;
  }
}
```

## Rules

1. **Implements a port** declared in `modules/<m>/ports.ts`; the class name says the technology
   (`DrizzleAgentRepository`), the port name does not.
2. **Returns domain types.** `$inferSelect` / `$inferInsert` and `src/db/rows.ts` types are private to
   ring 3. The mapper (`toDomain` / `toPersistence`) lives in the repository file or a sibling
   `mapper.ts`, never in the use case. Today `toAgentDto(row: AgentRow)` sits in `agents/helpers.ts` and
   `reviews/service.ts` imports `AgentRow` — legacy.
3. **Parse untrusted columns on the way out.** `jsonb` columns (e.g. `agent_versions.config_json`) are
   parsed with zod in the mapper, so a drifted row fails at the boundary, not deep in a use case.
4. **Workspace-scoped queries.** Every read/write that has a `workspaceId` filters by it in SQL. Tenancy
   is a persistence concern too; never filter in memory after fetching.
5. **Domain-named methods, one repository per aggregate.** `findEnabledForWorkspace`, `saveVersion`.
   Link tables owned by an aggregate (`agent_skills`) go through that aggregate's repository.
6. **Accept an executor, not a bare `Db`.** Type the constructor (or method) parameter as `DbExecutor`
   (`Db | Tx`) so a use case can run several repositories in one transaction
   ([transactions.md](transactions.md)).
7. **No business decisions.** A repository may compute SQL-shaped things (ordering, pagination, upsert
   conflict targets). Whether a patch bumps the version is a domain rule — the repository persists the
   already-decided result. (`agents/repository.ts` imports `isConfigChange` today — legacy.)
8. **Schema, migrations, seeds** stay in `src/db/`. Change `src/db/schema/*` and run `pnpm db:generate`;
   never edit applied migrations (server `CLAUDE.md`).
9. **`drizzle-zod`** (`createSelectSchema`, `createInsertSchema`) may be used inside ring 3 to parse rows;
   do not export those schemas as HTTP contracts.
10. **Raw SQL** (`sql\`…\``, pgvector operators) is fine inside a repository; it is still a repository.

## Read models

Some endpoints aggregate across aggregates (dashboards, PR lists with counts). Model them as a
**query port** (`PullListQuery`) with a Drizzle implementation that returns a read DTO directly —
no entity round-trip needed. That keeps `pulls/routes.ts`-style SQL out of routes without ceremony.

## Sources

- Drizzle type inference (goodies) — https://orm.drizzle.team/docs/goodies
- Drizzle Zod — https://orm.drizzle.team/docs/zod
- Fowler, Repository — https://martinfowler.com/eaaCatalog/repository.html
- Stemmler, Repository / DTO / Mapper — https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/
- Microsoft, Infrastructure persistence layer — https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
- Uncle Bob, The Clean Architecture (data crossing boundaries) — https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
