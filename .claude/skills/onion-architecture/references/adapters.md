# Infrastructure ring: SDK adapters

`src/adapters/<name>/` implements the SDK-level ports from `src/vendor/shared/adapters.ts`:

| Port | Adapter(s) | Mock |
|---|---|---|
| `LLMProvider` | `adapters/llm/openai.ts`, `adapters/llm/anthropic.ts`, `OpenRouterProvider` (in reviewer-core — legacy) | `MockLLMProvider` |
| `GitHubClient` | `adapters/github/octokit.ts` | `src/adapters/mocks.ts` |
| `GitClient` | `adapters/git/simple-git.ts` | `src/adapters/mocks.ts` |
| `CodeIndex` | `adapters/codeindex/ripgrep.ts` | `src/adapters/mocks.ts` |
| `Embedder` | `adapters/embedder/openai.ts` | `src/adapters/mocks.ts` |
| `SecretsProvider` / `AuthProvider` | `adapters/secrets/local.ts`, `adapters/auth/local.ts` | `src/adapters/mocks.ts` |
| `DepGraph`, `Tokenizer` | `adapters/depgraph`, `adapters/tokenizer` (port and impl in one file — legacy) | inline in tests |

## Rules

1. **One adapter = one technology.** The only files that import `octokit`, `openai`, `@anthropic-ai/sdk`,
   `simple-git`, `@vscode/ripgrep`, `@ast-grep/napi`, `dependency-cruiser`, `js-tiktoken` are under
   `src/adapters/` (and `src/db/` for `postgres`/`drizzle-orm`). A use case that needs one of them gets a
   port.
2. **Implement the port with `implements`**, so TypeScript catches drift, and add/extend the `Mock*` in
   `src/adapters/mocks.ts` in the same change.
3. **Translate at the edge.** Map SDK responses to port types (never return an Octokit or OpenAI
   response object), and map SDK errors to `ExternalServiceError` (or a more specific error) inside the
   adapter. Parse LLM/HTTP payloads with zod here ([zod-boundaries.md](zod-boundaries.md)).
4. **Resilience lives here too.** Retries, timeouts, rate limits (`withRetry`, `withTimeout` from
   `src/platform/resilience.ts`, `p-queue`) wrap SDK calls inside the adapter, not inside use cases.
5. **Adapters point inward only.** An adapter may import ports, `@devdigest/shared`, `src/platform/{errors,resilience}`.
   It must not import `src/modules/*` (today `adapters/depgraph/index.ts:20` imports
   `modules/repo-intel/constants` — legacy; move such constants to the port file or pass them in).
6. **Secrets come from `SecretsProvider`**, resolved by the container when it builds the adapter.
   An adapter never reads `process.env` or `~/.devdigest/secrets.json` itself.
7. **Filesystem and processes are infrastructure.** `node:fs`, `node:child_process` and ripgrep calls
   belong in an adapter. `repo-intel/service.ts` reading files with `node:fs/promises` and calling
   `adapters/codeindex/extract.js` directly is legacy; new code asks a port.

## Adding a new external integration

1. Declare the port (shared → `vendor/shared/adapters.ts` in **both** copies if the client needs the
   types; server-only → `src/platform/ports.ts` or the module's `ports.ts`).
2. Write `src/adapters/<name>/<tech>.ts` implementing it.
3. Add a `Mock<Name>` to `src/adapters/mocks.ts`.
4. Add a lazy getter + `ContainerOverrides` entry in `src/platform/container.ts`.
5. Inject the port into the use case's constructor.

## Sources

- Cockburn, Hexagonal Architecture (primary vs secondary adapters) — https://alistair.cockburn.us/hexagonal-architecture/
- Herberto Graça, Explicit Architecture — https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/
- Microsoft, Common web application architectures — https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
- Sairyss/domain-driven-hexagon — https://github.com/Sairyss/domain-driven-hexagon
