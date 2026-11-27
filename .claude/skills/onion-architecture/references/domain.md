# Domain ring

The innermost ring: what the business *is*, independent of how it is stored or served.

## What belongs here

- **Entities** — things with identity and a lifecycle: an `Agent` with a config version, a `ReviewRun`
  that moves `queued → running → done | failed`.
- **Value objects** — immutable, compared by value, valid by construction: `Severity`, `RiskScore`,
  `RepoFullName` (`owner/name`), a diff line reference.
- **Pure rules** — functions that decide: "does this patch bump the agent's version?"
  (`isConfigChange` in `modules/agents/helpers.ts` is already one), score recomputation, eligibility.
- **Domain errors** — `AgentNotFound`, `RunAlreadyFinished`, `InvalidStateTransition` (see [errors.md](errors.md)).

## Rules

1. No I/O, no `async` unless it is pure composition, no `Date.now()`/`Math.random()` hidden inside —
   take a `now: Date` or a `Clock` port from the use case so rules stay deterministic.
2. Import only other domain code, `src/platform/errors.ts` (for `DomainError`) and `@devdigest/shared` types. Never `drizzle-orm`, `fastify`, an SDK,
   `src/db/*`, or `zod` used for HTTP shapes. Using zod to build a value object's own parser is fine.
3. Model with plain TS: `type` + factory/validation functions, or small classes with private
   constructors. Prefer readonly fields and returning new values over mutation.
4. Put behaviour where the data is. A rule that inspects only an agent's fields belongs next to the
   agent type, not in the use case (Fowler: anemic domain model). Move it when you touch it.
5. Don't invent depth that is not there. If an endpoint is CRUD with no rules, a DTO type from
   `@devdigest/shared` plus a repository is enough — no empty entity class. Add a domain type when the
   first real rule appears.

## File placement

- Small module: `modules/<m>/domain.ts`.
- Grows past ~200 lines or several aggregates: `modules/<m>/domain/<aggregate>.ts`.
- Pure helpers that already exist in `helpers.ts` and are domain rules (e.g. `isConfigChange`) may stay
  there; when you split the file, the rule goes to `domain.ts` and row↔DTO mappers go to infrastructure
  (`repository.ts` mapper) or delivery (route DTO mapper).
- `reviewer-core/src/{prompt,grounding,review}` is a shared domain/application core already — see
  [reviewer-core.md](reviewer-core.md).

## Example

```ts
export type AgentConfig = Readonly<{
  provider: Provider;
  model: string;
  systemPrompt: string;
  strategy: ReviewStrategy;
}>;

export type Agent = Readonly<{
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  version: number;
  config: AgentConfig;
}>;

export function applyAgentPatch(agent: Agent, patch: AgentPatch): Agent {
  const config = { ...agent.config, ...pickConfig(patch) };
  const bumped = isConfigChange(agent.config, config);
  return {
    ...agent,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    config,
    version: bumped ? agent.version + 1 : agent.version,
  };
}
```

The use case loads the agent, calls `applyAgentPatch`, and saves the result. The version-bump rule is
tested without a database.

## Sources

- Palermo, Onion Architecture pt 1 & 4 — https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/ · https://jeffreypalermo.com/2013/08/onion-architecture-part-4-after-four-years/
- Fowler, AnemicDomainModel — https://martinfowler.com/bliki/AnemicDomainModel.html
- Khorikov, Domain model purity vs completeness — https://enterprisecraftsmanship.com/posts/domain-model-purity-completeness/
- Microsoft, DDD-oriented microservice — https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice
