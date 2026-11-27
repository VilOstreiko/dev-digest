# Enforcement: dependency-cruiser + route container check

Two mechanical checks, both run by `pnpm lint:arch` in `server/`:

| Check | Script | Config / code | Baseline |
|---|---|---|---|
| Imports between rings | `lint:arch:imports` | `server/.dependency-cruiser.cjs` | `server/.dependency-cruiser-known-violations.json` |
| Routes calling ports/adapters through the container | `lint:arch:routes` | `server/scripts/check-route-container-calls.mjs` | `server/.route-container-calls-baseline.json` |

This is separate from repo-intel's use of dependency-cruiser (`src/adapters/depgraph`), which builds
import graphs of *users'* repositories at runtime.

## Commands (from `server/`)

| Command | What it does |
|---|---|
| `pnpm lint:arch` | runs both checks; fails on any violation not in its baseline |
| `pnpm lint:arch:imports` | dependency-cruiser over `src/` and `../reviewer-core/src/` |
| `pnpm lint:arch:routes` | scans `src/modules/*/routes.ts` (and `routes/*.ts`) for forbidden `container.<member>` calls |
| `pnpm lint:arch:baseline` | rewrites both baselines from the current tree — only after **fixing** legacy violations. Needs `npm ci` in `reviewer-core/` first (see below) |
| `npx depcruise src ../reviewer-core/src --config .dependency-cruiser.cjs --output-type err` | shows all violations, including known ones |

## Rules in the config

| Rule | Catches |
|---|---|
| `onion-inner-no-infrastructure` | `service.ts`/`ports.ts`/`domain*` → `src/db`, `src/adapters`, `platform/container.ts`, Fastify, Drizzle, postgres, SDKs |
| `onion-inner-no-io` | same files → `fs`, `child_process`, `net`, `http(s)` |
| `onion-domain-pure` | `domain*` → anything except its own module's domain, `src/platform/errors.ts`, `@devdigest/shared`, zod |
| `onion-routes-no-persistence` | `routes.ts` → `src/db`, any `repository`, `drizzle-orm` |
| `onion-routes-no-adapters` | `routes.ts` → `src/adapters`, SDK packages (octokit, openai, anthropic, simple-git, …) |
| `onion-adapters-no-modules` | `src/adapters` → `src/modules` |
| `onion-no-cross-module-internals` | module A → module B except B's `ports.ts`/`types.ts` and `_shared` |
| `onion-db-row-types-stay-in-infrastructure` | anything but `src/db`, repositories, container → `src/db/rows.ts` |
| `onion-core-no-sdk` / `onion-core-no-io` | `reviewer-core/src` → SDKs, server code, `fs`/network |

`tsPreCompilationDeps: true` means `import type` counts: a type import still couples the rings.

## reviewer-core paths in the baseline

dependency-cruiser records an import by its resolved path, and reviewer-core's `openai` resolves differently
depending on whether `reviewer-core/node_modules` is installed: `../reviewer-core/node_modules/openai/index.d.ts`
when it is, the bare `openai` when it is not. The baseline must match both, so `lint:arch:baseline` runs
`scripts/expand-arch-baseline.mjs` after dependency-cruiser. It adds a bare-name twin for every resolved
reviewer-core entry, so `lint:arch` passes in both states. The bare name can be derived from the resolved
path, but not the other way round. That is why the script refuses to run, and names the unresolved imports,
when `reviewer-core/node_modules` is missing. Run `npm ci` in `reviewer-core/`, restore the baseline with
`git checkout -- .dependency-cruiser-known-violations.json`, and regenerate.

## The route container check is a heuristic

dependency-cruiser sees imports only. Routes reach adapters through `app.container.github()` — a property
access, not an import — so `lint:arch:routes` scans the route files with a regex:
`container.(db|github|git|llm|secrets|auth|codeIndex|embedder|depgraph|tokenizer|agentsRepo|reviewRepo|jobs)`.
The baseline stores counts per file and member, so moving lines does not break it.

Known blind spots:

- Aliasing: `const { github } = app.container`, `const c = app.container; c.github()`, or passing the
  container into a helper that calls the adapter.
- New container members: a getter added to `Container` is not checked until it is added to `FORBIDDEN`
  in the script. When you add an adapter/port getter, add it there in the same change.
- It looks only at route files; a route helper in another file of the module is not scanned.

Treat it as a tripwire, not proof; the review workflow still applies.

**Planned replacement.** The heuristic can go away once routes stop receiving the whole container: each
module plugin gets only its services, e.g. `app.decorate('agentsService', …)` or a plugin option
`{ agents: AgentsService }`, typed via Fastify's declaration merging. Then a route physically has no
`github` to call, and the rule is enforced by the type checker. That is a refactor of every route module,
so it is not part of this version.

## When it fails

1. Read the rule's message; it names the hard rule and the reference file.
2. Fix the dependency direction, don't silence it: introduce/consume a port, move the code to the right
   ring, or have the container inject it.
3. Do **not** regenerate the baseline to make a new violation pass, and do not add `pathNot` exceptions
   for one file. If you believe a rule is wrong, say so to the user with the case; changing the rule is
   a decision for them.
4. After fixing a legacy violation, run `pnpm lint:arch:baseline` and confirm that the baseline only lost
   entries. dependency-cruiser may reorder the file when it regenerates it, so compare old and new entries
   as sets, for example with `jq -S` and `comm`, not only with `git diff`.

## What it can't see

Responsibilities, not imports: business rules in a route, HTTP status decisions in a use case, a repository
deciding domain logic, a service doing SQL-shaped filtering in memory, `app.container.db` used via a
decoration rather than an import (partly covered by `lint:arch:routes`, see its blind spots). Those are
covered by the review workflow in `SKILL.md`.

## Sources

- dependency-cruiser rules reference — https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
- dependency-cruiser rules tutorial — https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-tutorial.md
- eslint-plugin-boundaries (editor-time alternative, not adopted) — https://github.com/javierbrea/eslint-plugin-boundaries
- Fastify Decorators (declaration merging for typed decorations) — https://fastify.dev/docs/latest/Reference/Decorators/
- Sairyss/domain-driven-hexagon (enforcing boundaries) — https://github.com/Sairyss/domain-driven-hexagon
- marcoturi/fastify-boilerplate (dependency-cruiser in CI) — https://github.com/marcoturi/fastify-boilerplate
