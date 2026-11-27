# Errors across rings

Decision: **throw typed errors**, don't return `Result` values. Domain and application throw errors that
say *what went wrong in business terms*; the delivery ring alone decides the HTTP status.

## Today

`src/platform/errors.ts` has `AppError(code, message, statusCode, details)` with `NotFoundError` (404),
`ValidationError` (422), `ExternalServiceError` (502), `ConfigError` (500). The status code is baked
into the error, and `src/app.ts` `setErrorHandler` sends `err.statusCode`. This works, but it puts HTTP
knowledge in the inner rings. Keep it working; steer new code toward the shape below.

## Target shape

> **Not in the code yet (as of 2.0.0).** `DomainError`, its kinds and their mapping in `setErrorHandler` do not exist; add
> them to `src/platform/errors.ts` / `src/app.ts` in the first change that throws a domain error. Until
> then the existing `AppError` subclasses remain valid.

1. **Domain errors** carry a stable `code` and details, no status. `DomainError` lives in `src/platform/errors.ts` next to `AppError` (the one platform file domain code may import):

   ```ts
   export class DomainError extends Error {
     constructor(
       readonly code: string,
       message: string,
       readonly details?: unknown,
     ) {
       super(message);
       this.name = new.target.name;
     }
   }

   export class AgentNotFound extends DomainError {
     constructor(agentId: string) {
       super('agent_not_found', 'Agent not found', { agentId });
     }
   }
   ```

   Generic kinds the handler can map: `NotFound`, `Conflict`, `InvalidState`, `Forbidden`, `ExternalFailure`.
   Specific errors extend one of them, so the handler maps by kind, not by every class.
2. **One mapping table** in the delivery ring (`src/app.ts` or `src/platform/http-errors.ts` imported only by
   `app.ts`): `NotFound → 404`, `Conflict → 409`, `InvalidState → 409/422`, `Forbidden → 403`,
   `ExternalFailure → 502`. The existing `AppError` branch stays for legacy errors. When you introduce
   `DomainError`, map the base class too (`DomainError → 400` with its `code`): otherwise a kind you have
   not mapped yet falls through to the generic 500 branch. Add a kind's mapping in the same change that
   adds the kind.
3. **Adapters translate SDK errors** (Octokit `RequestError`, OpenAI `APIError`, postgres unique
   violation `23505`) into domain/infra errors inside the adapter or repository. No `instanceof
   RequestError` outside `src/adapters/github`.
4. **"Not found" is an error from the use case**, not `undefined` that every route converts. New use cases
   throw `XNotFound`; existing ones returning `undefined` (agents) are fine until touched.
5. **Expected vs unexpected.** Typed errors are for outcomes a caller can act on. Bugs and invariant
   breaks throw plain `Error` and become 500 with a log line — don't wrap them in a domain error.
6. **Background work** (`void executeRuns`, `JobRunner`) has no HTTP handler: catch at the job boundary,
   record the failure on the run/job, publish on `RunBus`. Never let a domain error escape a fire-and-forget
   promise unhandled.

## Sources

- Fastify Errors / `setErrorHandler` — https://fastify.dev/docs/latest/Reference/Errors/
- Stemmler, Handling errors with a Result class (the alternative we did not choose) — https://khalilstemmler.com/articles/enterprise-typescript-nodejs/handling-errors-result-class/
- Sairyss/domain-driven-hexagon (error handling section) — https://github.com/Sairyss/domain-driven-hexagon
