# Transactions across repositories

The use case knows which writes must succeed together; a single repository does not. So the use case
opens the transaction through a port, and repositories take whatever executor they are given.

## The pieces

> **Not in the code yet (as of 2.0.0).** `Tx`, `DbExecutor`, `TransactionRunner`, `src/platform/ports.ts`, `src/db/transaction-runner.ts`
> and the `agentsTx` getter do not exist; create them in the first change that needs a multi-repository
> write. Today no code uses `db.transaction`.

`src/db/client.ts (infrastructure)`:

```ts
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbExecutor = Db | Tx;
```

`src/platform/ports.ts` (application, generic) and `modules/agents/ports.ts` (application, module-specific):

```ts
export interface TransactionRunner<R> {
  run<T>(work: (repos: R) => Promise<T>): Promise<T>;
}

export type AgentsUnitOfWork = {
  agents: AgentRepositoryPort;
  agentVersions: AgentVersionRepositoryPort;
};
```

`src/db/transaction-runner.ts` (infrastructure; knows Drizzle, knows no module):

```ts
export class DrizzleTransactionRunner<R> implements TransactionRunner<R> {
  constructor(
    private readonly db: Db,
    private readonly bind: (exec: DbExecutor) => R,
  ) {}

  run<T>(work: (repos: R) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(this.bind(tx)));
  }
}
```

`src/platform/container.ts` (composition root; the only place that knows both sides):

```ts
get agentsTx(): TransactionRunner<AgentsUnitOfWork> {
  return (this._agentsTx ??= new DrizzleTransactionRunner(this.db, (exec) => ({
    agents: new DrizzleAgentRepository(exec),
    agentVersions: new DrizzleAgentVersionRepository(exec),
  })));
}
```

Use case:

```ts
async update(workspaceId: string, id: string, patch: AgentPatch): Promise<Agent> {
  return this.tx.run(async ({ agents, agentVersions }) => {
    const current = await agents.findById(workspaceId, id);
    if (!current) throw new AgentNotFound(id);
    const next = applyAgentPatch(current, patch);
    await agents.save(next);
    if (next.version !== current.version) await agentVersions.record(next);
    return next;
  });
}
```

The use case never sees `tx`; it sees repositories bound to one transaction. Tests pass an in-memory
`TransactionRunner` that calls `work` with fake repositories.

## Rules

1. Repositories never call `db.transaction` themselves.
2. Keep the transaction body to DB work only — no LLM, GitHub, git or HTTP calls inside `run`. A held
   connection during a slow external call starves the pool (`postgres` max 10 connections by default in
   `createDb`). Fetch external data first, then open the transaction.
3. Side effects that must happen after commit (SSE event on `RunBus`, enqueueing a job) run after `run`
   resolves, not inside it.
4. Nested transactions become savepoints in Drizzle; avoid relying on that across use cases — compose
   inside one `run` instead.
5. Use `isolationLevel` only with a written reason (in the PR description).

## Sources

- Drizzle Transactions — https://orm.drizzle.team/docs/transactions
- Fowler, Unit of Work — https://martinfowler.com/eaaCatalog/unitOfWork.html
- Sentry, Atomic repositories in Clean Architecture and TypeScript (Drizzle) — https://blog.sentry.io/atomic-repositories-in-clean-architecture-and-typescript
- Microsoft, Infrastructure persistence layer — https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
