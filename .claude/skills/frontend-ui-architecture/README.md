# frontend-ui-architecture

**Version:** 1.1.0 · **Updated:** 2026-11-27

A skill that decides where frontend code lives and what it may depend on in React / Next.js apps:
component placement and splitting, constants, helpers vs utils vs lib, business-logic layers, data
placement, imports and boundaries. Hook usage, state APIs and performance are deliberately left to
`react-best-practices`, and Next.js file conventions to `next-best-practices`, so the skills do not
overlap.

| File | Purpose |
|---|---|
| [SKILL.md](SKILL.md) | The rules, with `[n]` citations to the sources below |
| [examples.md](examples.md) | Good/bad trees and code |
| [references/nextjs-server.md](references/nextjs-server.md) | Next.js DAL, Server Actions, server ↔ client boundary placement (loaded on demand) |
| [references/fsd.md](references/fsd.md) | Default model vs Feature-Sliced Design (loaded on demand) |
| README.md | Sources, versioning, maintenance notes |

## Sources

Each source was opened on 2026-11-27, and the rules in SKILL.md were taken from the page text.
"Used in" names the SKILL.md sections that cite the source.

### Official documentation

| # | Source | Contributes | Used in |
|---|---|---|---|
| 1 | [Thinking in React](https://react.dev/learn/thinking-in-react) — react.dev | Split by data model, extract only when complex, minimal state, closest common parent | Components |
| 2 | [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) — react.dev | `use` prefix only for hook-calling functions, use-case hooks, no lifecycle wrappers | Helpers vs utils |
| 3 | [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — react.dev | Derive during render, logic in event handlers, effects only for external sync | Example 3 (rules themselves live in react-best-practices) |
| 4 | [File Structure (legacy FAQ)](https://legacy.reactjs.org/docs/faq-structure.html) — legacy.reactjs.org | React is unopinionated; colocate files that change together; avoid deep nesting | Principles, Components |
| 5 | [Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure) — nextjs.org | Safe colocation in `app/`, `_private` folders, route groups, strategies for shared code | Principles, Components, Choosing a model |
| 6 | [How to think about data security](https://nextjs.org/docs/app/guides/data-security) — nextjs.org | Data Access Layer, `server-only`, minimal DTOs to client components, Server Actions as public endpoints | Business logic, references/nextjs-server.md |
| 7 | [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions) — Next.js blog, 2023-10-23 | DAL checks the current user, audit `"use client"` props, treat action args as hostile | Business logic, references/nextjs-server.md |
| 8 | [How we optimized package imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) — Vercel blog, 2023-10-13 | Cost of barrel files, `optimizePackageImports` | Imports and boundaries, references/fsd.md |

### Reference architectures

| # | Source | Contributes | Used in |
|---|---|---|---|
| 9 | [Bulletproof React — Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) — alan2207 | `src/` and `features/` trees, no cross-feature imports, shared → features → app, `no-restricted-paths`, direct imports | Principles, Placement, Helpers vs utils, Imports, references/fsd.md, Examples 1 and 9 |
| 10 | [Feature-Sliced Design — Overview](https://feature-sliced.design/docs/get-started/overview) — feature-sliced.design | Layers, slices, segments (`ui/api/model/lib/config`), downward-only imports, public API per slice | references/fsd.md |
| 11 | [Steiger](https://github.com/feature-sliced/steiger) — feature-sliced org | Linter for FSD: forbidden imports, public API, no sidestepping | references/fsd.md |

### Placement and colocation

| # | Source | Contributes | Used in |
|---|---|---|---|
| 12 | [Colocation](https://kentcdodds.com/blog/colocation) — Kent C. Dodds, 2019-06-17 | "Place code as close to where it's relevant as possible"; colocated tests and helpers; no global `utils/` for one-offs | Principles, Constants, Helpers, Tests |
| 13 | [State Colocation will make your React app faster](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) — Kent C. Dodds, 2019-09-23 | State placement order, providers close to consumers, composition before context | Data placement |
| 14 | [React Folder Structure Best Practices](https://www.robinwieruch.de/react-folder-structure/) — Robin Wieruch, updated 2026-05-05 | Folder per component, promote to shared on two consumers, one-way flow, thin `index` public API | Principles, Placement, Components, Constants, Imports |
| 15 | [Delightful React File/Directory Structure](https://www.joshwcomeau.com/react/file-structure/) — Josh W. Comeau, updated 2025-12-03 | Helpers (project-specific) vs utils (portable), component folders with `index`, local vs generic hooks | Helpers vs utils, Constants, Components |
| 16 | [Screaming Architecture — Evolution of a React folder structure](https://dev.to/profydev/screaming-architecture-evolution-of-a-react-folder-structure-4g25) — Johannes Kettmann (Profy.dev), 2022-02-25 | Group by domain, feature public API, absolute aliases, global `hooks/` as dumping ground, kebab-case rationale | Imports, Naming, Constants |
| 17 | [Guidelines to improve your React folder structure](https://maxrozen.com/guidelines-improve-react-app-folder-structure) — Max Rozen | Tests next to components, pages vs components, no premature extraction | Principles, Tests |
| 18 | [Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) — TkDodo, 2024-07-26 | Barrels cause cycles and slow dev; import siblings directly; `optimizePackageImports` limits | Imports and boundaries, Example 8 |
| 19 | [How We Achieved 75% Faster Builds by Removing Barrel Files](https://www.atlassian.com/blog/atlassian-engineering/faster-builds-when-removing-barrel-files) — Tim Sebastian (Atlassian), 2025-06-26 | Measured cost of barrels at scale and migration approach | Principles, Imports |

### Business logic and layering

| # | Source | Contributes | Used in |
|---|---|---|---|
| 20 | [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html) — Juntao Qiu (martinfowler.com), 2023-02-16 | View vs non-view logic, domain classes, gateway for fetching, strategy objects | Principles, Business logic, Example 7 |
| 21 | [Headless Component: a pattern for composing React UIs](https://martinfowler.com/articles/headless-component.html) — Juntao Qiu (martinfowler.com), 2023-11-07 | Behavior in hooks, markup in consumers | Business logic, Example 6 |
| 22 | [Path To A Clean(er) React Architecture — API Layer & Fetch Functions](https://dev.to/jkettmann/path-to-a-cleaner-react-architecture-api-layer-fetch-functions-4jin) — Johannes Kettmann, 2024-04-26 | Fetch functions out of components; components unaware of endpoints | Business logic, Types, Example 3 |
| 23 | [Path To A Clean(er) React Architecture (Part 6) — Business Logic Separation](https://dev.to/jkettmann/path-to-a-cleaner-react-architecture-part-6-business-logic-separation-221g) — Johannes Kettmann, 2024-06-21 | Use-case functions with injected dependencies, wrapped by hooks | Business logic |
| 24 | [Path To A Clean(er) React Architecture (Part 7) — Domain Logic](https://dev.to/jkettmann/path-to-a-cleaner-react-architecture-part-7-domain-logic-lg) — Johannes Kettmann, 2024-07-05 | Domain functions on entities, business constants inside domain functions, searchable names | Constants, Helpers, Business logic, Naming, Example 3 |
| 25 | [Container/Presentational Pattern](https://www.patterns.dev/react/presentational-container-pattern) — patterns.dev | Hooks replace container components; presentational components stay pure | Business logic |
| 26 | [Practical React Query](https://tkdodo.eu/blog/practical-react-query) — TkDodo, updated 2023-10-21 | Server vs client state, query key as dependency array, no copying into `useState` | Principles, Data, Constants |
| 27 | [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) — TkDodo, 2024-01-17 | `queryOptions` factories that keep key and fetcher together | Data, Constants, Example 3 |

### Naming and enforcement

| # | Source | Contributes | Used in |
|---|---|---|---|
| 28 | [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react) — Airbnb | One component per file, PascalCase filenames, `handleX` / `onX` naming | Components, Naming |
| 29 | [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) — javierbrea | Element types and allowed dependency pairs as lint rules | Imports and boundaries |
| 30 | [import/no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md) — eslint-plugin-import | Restricted import zones (`target` / `from` / `except`) | Imports and boundaries, Example 9 |

### Repository sources

- `client/CLAUDE.md` — DevDigest client map and conventions (the "In this repo" section).
- `client/INSIGHTS.md` — drift between the two `@devdigest/shared` copies.
- `client/src` layout as of 2026-11-27 (`app/**/_components/<Name>/`, `lib/api.ts`, `lib/hooks/`).

### Also consulted during research (not cited in SKILL.md)

These came up in research. Each one is either covered by a source above or not authoritative
enough to cite.

- [Next.js — Colocation (old URL)](https://nextjs.org/docs/app/building-your-application/routing/colocation): now serves the same content as source 5.
- [Dan Abramov's "move files around until it feels right"](https://legacy.reactjs.org/docs/faq-structure.html): the original tweet is deleted; the idea is reflected in source 4.
- [TkDodo's Blog index (TanStack docs)](https://tanstack.com/query/latest/docs/framework/react/community/tkdodos-blog): an index of sources 26–27 and related posts.
- [OWASP Next.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html): supports source 6 (middleware is not an authorization layer).

## Verification notes

- **Source 25 (patterns.dev)** could not be fetched during verification (DNS failure). The rule
  attributed to it comes from search-result excerpts of that page and agrees with sources 20–21.
  Re-check it on the next update.
- **Sources 9 and 30** returned HTTP 503 on the first attempt and loaded on retry.
- **Sources 22–24** are cross-posts on dev.to of articles first published on profy.dev.

## Where sources disagree

| Topic | Positions | Skill decision |
|---|---|---|
| `index.ts` in folders | FSD [10], Wieruch [14], Comeau [15], Profy [16] use `index` as a public API. TkDodo [18], Atlassian [19] and Bulletproof [9] advise against barrels. | Allow a thin per-component `index.ts` with a single re-export. Forbid aggregating barrels and importing through a folder's own index. |
| Group by type vs by feature | Comeau [15] groups by function. Bulletproof [9], Wieruch [14], Profy [16] and FSD [10] group by feature. | By feature / route, with a shared layer grouped by type. |
| Meaning of `lib/` | Varies between projects. | `lib/` wraps or configures third-party libraries. Generic pure functions go in `utils/`. |
| File naming case | Airbnb [28]: PascalCase. Profy [16]: kebab-case. | One convention per repo. The DevDigest client uses PascalCase component folders and kebab-case shared folders. |
| Custom hook vs `queryOptions` for query reuse | Practical React Query [26] recommends custom hooks. Query Options API [27] prefers factories. | `queryOptions` factory as the unit of reuse, plus a thin hook where convenient. |

## Versioning

The skill version is semantic and appears in `SKILL.md` frontmatter (`metadata.version`) and at
the top of this file. Keep both in sync.

- **Major:** a rule is reversed, or the base model changes.
- **Minor:** a new rule, section or source.
- **Patch:** wording, fixed links, new examples that add no new rule.

### Changelog

- **1.1.0** (2026-11-27): Removed rules duplicated from react-best-practices (derive vs sync, event handlers, effects, context usage, `use` prefix). Moved Next.js server data access and Server Actions to `references/nextjs-server.md`, and model choice and FSD to `references/fsd.md`. Trimmed naming to repo-level decisions. Added eval cases under `evals/`.
- **1.0.0** (2026-11-27): Initial version. 30 sources, colocation + feature-folders base model, DevDigest client mapping.
