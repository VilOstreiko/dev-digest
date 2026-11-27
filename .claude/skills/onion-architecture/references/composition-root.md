# Composition root: `src/platform/container.ts`

The container is the one place that knows every ring. It decides which implementation backs each port
and builds each object once. Everything else receives its dependencies.

## Rules

> **Not in the code yet (as of 2.0.0).** `Container` has no service getters; routes `new` their services today (e.g.
> `new AgentsService(app.container)` in `agents/routes.ts`). Add a getter when you touch a module.

1. **All `new` of adapters, repositories, transaction runners and services happens here** (or in a
   module-level factory function the container calls). Routes take services from the container; services
   take ports in their constructor.
2. **Lazy getters with overrides**, matching the existing style:

   ```ts
   get agentsService(): AgentsService {
     return (this._agentsService ??= new AgentsService(
       this.agentsRepo,
       this.llmResolver,
       this.agentsTx,
     ));
   }
   ```

   Every port with a real external effect gets an entry in `ContainerOverrides` so tests can swap it.
3. **Return port types from getters** where a port exists (`get agentsRepo(): AgentRepositoryPort`), so
   consumers cannot reach for implementation-only methods. Today `agentsRepo`/`reviewRepo` return
   concrete classes — legacy.
4. **No business logic in the container.** Choosing an adapter by config (`openrouter` vs `anthropic`) is
   wiring and belongs here; deciding anything about a review is not.
5. **The container is not a dependency.** Services must not import or accept `Container` (service-locator
   anti-pattern). Routes may read `app.container` only to take services/module facades, `config`, and to
   call `getContext` — never ports, adapters, repositories or `db` (hard rule 3).
6. **Module boundaries through the container.** When module B needs module A's data, the container
   passes A's port or facade into B's service — B never imports `modules/a/repository.ts`.
7. **Keep it navigable.** If `container.ts` grows past a screen per module, extract
   `modules/<m>/wiring.ts` exporting `createAgentsModule(deps)`; the container calls it. Wiring files may
   import infrastructure; they are part of the root.

## Sources

- Seemann, Composition Root — https://blog.ploeh.dk/2011/07/28/CompositionRoot/
- Microsoft, Common web application architectures (UI references infrastructure only for DI registration) — https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
- Palermo, Onion Architecture pt 3 (dependencies resolved at startup) — https://jeffreypalermo.com/2008/08/the-onion-architecture-part-3/
