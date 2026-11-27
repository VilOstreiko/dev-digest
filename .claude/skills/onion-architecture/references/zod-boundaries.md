# zod at the boundaries

"Parse, don't validate": turn untrusted data into precise types **once**, at the edge where it enters,
and let the inner rings trust the types.

## The edges in this backend

| Edge | Ring | Tool |
|---|---|---|
| HTTP request params/query/body | Delivery | route `schema` via `fastify-type-provider-zod` |
| HTTP response | Delivery | optional response schema / `@devdigest/shared` DTO types |
| LLM structured output | Infrastructure (adapter) | `StructuredRequest.schema` → `completeStructured` parses |
| GitHub / git / ripgrep payloads | Infrastructure (adapter) | zod parse or explicit mapping in the adapter |
| `jsonb` columns (`config_json`, `output_schema`) | Infrastructure (repository mapper) | zod parse in `toDomain` |
| Secrets / env config | Root | `src/platform/config.ts` |

## Rules

1. **Parse once.** After the edge, pass the parsed type. No `Schema.parse(...)` inside use cases or domain
   on data that already crossed a boundary; if a use case needs a stronger type, the edge should produce it.
2. **Route `schema`, not handler `.parse`.** Project convention; it also gives typed `req.params`/`req.body`.
3. **Contracts vs persistence schemas.** `@devdigest/shared` contracts (`src/vendor/shared/contracts/*`) are
   the API. `drizzle-zod` schemas describe tables. Never use one in place of the other.
4. **`@devdigest/shared` has two copies** (server and client). A contract change is applied to both in the
   same change (root `CLAUDE.md`).
5. **Value objects may use zod internally** (e.g. a branded `RepoFullName` built with `.brand()`); that is
   domain code using a parsing library, not HTTP leaking in.
6. **Errors from parsing** surface as 422 through the shared handler in `src/app.ts`; do not catch and
   rewrap ZodErrors in routes.

## Sources

- Alexis King, Parse, don't validate — https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
- Fastify Type Providers — https://fastify.dev/docs/latest/Reference/Type-Providers/
- fastify-type-provider-zod — https://github.com/turkerdev/fastify-type-provider-zod
- Drizzle Zod — https://orm.drizzle.team/docs/zod
