# Delivery ring: Fastify

Fastify is an adapter that drives the application (a *primary* adapter). It knows HTTP; the use cases
must not.

## A handler does three things

1. **Parse** — params/query/body through the route's zod `schema` (`fastify-type-provider-zod`), and
   tenancy through `getContext(container, req)`.
2. **Call one use case** with plain typed arguments.
3. **Map** the result to the response DTO and status code. Throw a domain error for "not there"; the
   error handler picks the status.

```ts
export default async function agentsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const agents = app.container.agentsService;

  app.get('/agents/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return toAgentDto(await agents.get(workspaceId, req.params.id));
  });
}
```

## Rules

1. **No persistence in routes.** No `container.db`, no `import * as t from '../../db/schema.js'`, no
   `drizzle-orm` operators, no `repository.ts` import. `pulls`, `polling`, `settings`, `workspace` routes
   do this today — legacy, do not copy ([legacy.md](legacy.md)).
2. **No adapter or port calls in routes (hard rule 3).** Neither by import (`src/adapters/*`, `octokit`,
   `openai`, `simple-git`, …) nor through the container: `container.github()`, `.git`, `.llm()`,
   `.secrets`, `.auth`, `.codeIndex`, `.embedder`, `.depgraph`, `.tokenizer`, `.jobs`, `.agentsRepo`,
   `.reviewRepo`, `.db`. The HTTP adapter drives the application; it does not drive other adapters. Even
   a one-liner such as "is the GitHub token set?" goes through a (thin) use case, so the capability is
   testable without HTTP and reusable from jobs. Allowed from the container: services/module facades
   (`agentsService`, `repoIntel`), `config`, and `getContext(app.container, req)`.
3. **Validate with the route `schema`**, not `Schema.parse(req.body)` in the handler (project
   convention). Response schemas are welcome; they are a delivery concern.
4. **Request schemas are delivery DTOs.** Build them from `@devdigest/shared` contracts or define them in
   `routes.ts`; never derive them from Drizzle tables (`drizzle-zod`), or the DB schema becomes the API.
5. **Map DTO ↔ domain at the edge.** snake_case API fields (`system_prompt`) are mapped to domain
   names here or in a `dto.ts` next to the routes, so the use case never sees wire format.
6. **Get services from the container**, don't `new` them in the plugin: a route file that does
   `new AgentsService(app.container)` hides the wiring and blocks overrides.
7. **Register by hand** in `src/modules/index.ts` (project convention, no autoload). One plugin per
   module; keep plugins encapsulated — use `fastify-plugin` only for app-wide decorators.
8. **Decorate with services, never with `db`.** `app.container` is the one decoration; do not add
   `app.decorate('db', …)` shortcuts.
9. **Status codes live in one place** — the `setErrorHandler` in `src/app.ts`. `reply.status(201)` for a
   successful create is fine; `reply.status(404)` built by hand is not ([errors.md](errors.md)).
10. **SSE / streaming** (`fastify-sse-v2`, `RunBus`) is delivery: the route subscribes to a port such as
   `RunEvents` and forwards; the use case publishes domain events, not SSE frames.

## Sources

- Fastify Encapsulation — https://fastify.dev/docs/latest/Reference/Encapsulation/
- Fastify Plugins — https://fastify.dev/docs/latest/Reference/Plugins/
- Fastify Decorators — https://fastify.dev/docs/latest/Reference/Decorators/
- Fastify Type Providers — https://fastify.dev/docs/latest/Reference/Type-Providers/
- fastify-type-provider-zod — https://github.com/turkerdev/fastify-type-provider-zod
- Fastify Errors — https://fastify.dev/docs/latest/Reference/Errors/
- marcoturi/fastify-boilerplate — https://github.com/marcoturi/fastify-boilerplate
