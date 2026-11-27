---
name: frontend-ui-architecture
description: "Frontend UI architecture and code organization for React / Next.js apps: where components, hooks, constants, helpers, utils, types, styles, tests and business logic belong, when to split a component, when to promote code to a shared folder, and which imports are allowed between folders. Use whenever creating a new component, page, hook or helper file, moving or splitting code, reviewing a PR for structure, or when the user asks 'where should this go', 'how should I structure this', 'should this be a util or a helper', 'where do I put this constant', 'where does this logic belong', 'folder structure', 'feature folders', 'barrel files' or 'separate logic from UI', even if they do not say 'architecture'. Not for hook/state API usage or rendering performance (use react-best-practices) or Next.js file conventions and RSC details (use next-best-practices)."
metadata:
  version: 1.1.0
  updated: 2026-11-27
  sources: README.md
---

# Frontend UI Architecture

Decide **where code lives and what it may depend on** in a React / Next.js codebase. This skill
covers placement, decomposition and boundaries only. How to use hooks, effects, state and context
correctly is in `react-best-practices`. Next.js special files and RSC rules are in `next-best-practices`.
Apply those skills alongside this one; this one does not restate them.

`[n]` points to the numbered sources in [README.md](README.md). Good/bad trees and code are in
[examples.md](examples.md). Read a reference file only when its topic comes up:
- [references/nextjs-server.md](references/nextjs-server.md): the code includes Next.js server code
  (Server Components that read data, Server Actions, a data access layer, secrets).
- [references/fsd.md](references/fsd.md): choosing or comparing an architecture model, or the repo uses
  Feature-Sliced Design.

**Precedence:** the conventions of the repository you are in win over the generic rules here. For
DevDigest `client/`, read [In this repo](#in-this-repo-devdigest-client) first.

## Core principles

1. **Colocate.** Put code as close as possible to where it is used, and keep things that change
   together in one place [12][4][5].
2. **Promote on the second consumer.** Code starts private to its first user. It moves up only when a
   second, real consumer appears, and then only to the closest common ancestor. Nothing goes into
   `shared/`, `utils/` or `components/` speculatively [14][12][17].
3. **Dependencies flow one way:** shared → features → routes/app. Shared code never imports feature
   code, and features never import each other. Compose features at the route [9][14].
4. **Separate view from non-view logic.** Components render. Hooks wire state. Plain TypeScript
   functions hold business rules. An API layer talks to the network [20][22][23][24].
5. **Server state lives in the query cache**, next to the fetch function that loads it [26][27].
6. **Imports are explicit.** Import the file you need, and avoid aggregating barrels [18][19][8][9].

The goal: a reader can predict where something lives, and deleting a feature deletes one folder.
When a choice is unclear, pick the option that keeps the feature removable in one step.

## Placement ladder

Apply the same ladder to components, hooks, constants, helpers and types. Choose the **lowest** rung
that covers every current consumer.

| Used by | Put it in |
|---|---|
| One component | The component's own file, or its folder (`constants.ts`, `helpers.ts`, `useX.ts`) |
| Several children of one component | That component's folder (private `_components/` for the children) |
| Several components of one route | The route's private folder: `app/<route>/_components/` (Next.js) or `features/<f>/components/` |
| Several routes of one domain | The closest common route ancestor, or a feature folder `features/<domain>/` |
| Many unrelated domains, no domain knowledge | Shared layer: `components/`, `hooks/`, `utils/`, `lib/` |
| Visual primitives with no app knowledge | The UI kit / design-system package |

Move code **down** the ladder when a consumer disappears, just as you move it up.

## Components: where and how to split

**Where.** A route entry (`page.tsx`) stays thin: it reads params and renders one view. Feature UI
lives in colocated folders next to the route that owns it [5][9]. Top-level `components/` is only for
UI that several routes reuse [14].

**Split a component when** any of these is true [1][14]:
- A piece has its own state, data dependency or reason to change.
- A piece is reused, or will obviously be tested on its own.
- The JSX contains a block you could give a meaningful domain name (`FindingSummary`, not `TopPart`).
- The file mixes fetching, mapping, layout and interaction in one body.

**Do not split** a small inline piece (a header row, a label) until it grows. Premature splitting
scatters one idea across files [1][4].

**Shape:**
- One exported component per file. Small private sub-components may share the file [28].
- Once a component has more than one file, give it a folder named after it [14][15]. Private
  children go in a nested `_components/` folder inside it.
- Keep nesting to about three or four levels below the feature root [4].

## Constants

- **Default:** a `constants.ts` next to the code that uses the constants. Promote it only when a
  second consumer appears [14][15].
- **What counts:** static lookup maps, option lists, enum-like `as const` objects, and limits or
  sizes used for rendering.
- **Not constants:**
  - **Business thresholds and rules** (limits, quotas, eligibility) live inside the domain function
    that enforces them, so the rule and its number cannot drift apart [24].
  - **UI copy** goes to i18n message files.
  - **Environment and config values** are read in one config / API-client module [9].
  - **Query keys** live with the query that uses them [26][27].
- Avoid a project-wide `constants.ts` that everything imports. It couples unrelated features and
  becomes a dumping ground [12][16].

## Helpers vs utils vs lib vs hooks vs domain

Decide by what the function **knows** and **does**:

| Question | Yes → | Location |
|---|---|---|
| Does it call React hooks? | **Hook** | Next to its consumer; shared `hooks/` only with a second consumer [2][15][16] |
| Does it return JSX? | **Component** | See the placement ladder |
| Does it encode a business rule about domain entities (user, PR, finding)? | **Domain function** | The feature's `domain`/`model` module [24][20] |
| Does it know this app's shapes or wording but no business rule (format a run label, pick a colour)? | **Helper** | `helpers.ts` next to its consumer [15] |
| Would it work unchanged in any other project (`clamp`, `groupBy`, `formatBytes`)? | **Util** | Shared `utils/` [15][9] |
| Does it wrap or configure a third-party library (fetch client, query client, i18n)? | **Lib** | Shared `lib/` [9] |

- Helpers, utils and domain functions are **pure**: no React and no I/O. That makes them
  unit-testable without rendering [24][20].
- A shared `utils/` that picks up domain knowledge is a smell. Move the domain parts back into the
  feature [12].

## Business logic: layers

| Layer | Owns | Must not |
|---|---|---|
| **View** (component) | Rendering, layout, wiring events to callbacks | Call `fetch`, know endpoints or raw response shapes, hold business rules [22][20] |
| **Hook** (orchestration) | State, combining queries and mutations, calling use cases | Contain JSX or inline business rules [20][23] |
| **Use case** | Multi-step flows (validate → call API → update) as plain functions with injected dependencies | Depend on components [23] |
| **Domain / model** | Pure rules and derived values on entities, validation, DTO → view-model mapping | Import React, fetch, or read globals [24][20] |
| **API layer** | One function per endpoint (`getRun(id)`) on top of the single HTTP client | Be called directly from components [22][9] |
| **Server data access** | Next.js only, see [references/nextjs-server.md](references/nextjs-server.md) | Be importable from client code [6][7] |

- **Branching per variant** (per provider, per verdict) becomes one lookup map or strategy object in
  the domain layer, not `if` chains repeated across components [20].
- **Reusable interactive behavior** (dropdown, disclosure, keyboard navigation) is a headless hook
  that returns state and handlers. The visual component consumes it [21].
- **Presentational components stay pure** and props-driven. The "container" role belongs to a hook,
  not to a wrapper component [25].

## Data placement

- One query hook or `queryOptions` factory per resource, defined next to its fetch function in the
  domain's API/hooks module, with every query input in the key [26][27].
- Client state starts in the component that uses it. Context providers sit as close to their
  consumers as possible, not automatically at the app root [13].

## Types, styles, tests

- Props types live in the component file. Types used only inside a feature live in that feature.
- API contract types come from the shared contract package. Do not redefine them locally. When the
  UI needs a different shape, map DTO → view model in the domain or API layer [24][22].
- Styles and unit/component tests sit next to the file they belong to (`Name.test.tsx`). There is no
  mirrored `__tests__/` tree. End-to-end flows live at the project root [12][17].

## Imports and boundaries

- Use the path alias (`@/…`) instead of chains like `../../../../lib/x` [16].
- Never import from a sibling feature or route folder. Promote the shared piece, or compose at the
  parent route [9][14].
- **Barrels:**
  - Avoid aggregating `index.ts` files that re-export many modules. They load every module, slow dev
    and tests, and hide circular imports [18][19][8].
  - A thin per-component `index.ts` that only re-exports the folder's public component is
    acceptable [14][15].
  - Inside a folder, import siblings directly, never through the folder's own `index.ts` [18].
- Enforce boundaries with lint rather than memory: `import/no-restricted-paths` zones [30][9],
  `eslint-plugin-boundaries` [29], `import/no-cycle`.

## Naming (only what the code does not show)

- Pick one file-name case for component folders and one for other modules per repo, and never mix
  them [28][16].
- Name domain functions as searchable verbs or predicates (`canRetryRun`, `hasBlockedUser`) [24].

## In this repo (DevDigest `client/`)

Source of truth: `client/CLAUDE.md`. Mapping of the rules above:

| Concept | Location in `client/src` |
|---|---|
| Thin route entry | `app/**/page.tsx` renders one view from `_components/` |
| Route-private components | `app/<route>/_components/<Name>/`, nested children in `<Name>/_components/<Child>/` |
| Component folder | `Name.tsx`, `index.ts` (single re-export), `constants.ts`, `helpers.ts`, `styles.ts`, `Name.test.tsx`; add files only when needed |
| Cross-route UI | `components/<kebab-name>/` (app-shell, diff-viewer, page-shell) |
| UI kit (do not edit unless the task is the kit) | `vendor/ui` → `@devdigest/ui` |
| Contract types (two drifting copies, see `client/INSIGHTS.md`) | `vendor/shared` → `@devdigest/shared` |
| The only HTTP client | `lib/api.ts` (`apiFetch`, `ApiError`) |
| Every data hook (TanStack Query), grouped by domain | `lib/hooks/<domain>.ts` |
| Library wrappers / app-wide providers | `lib/*.tsx` (providers, theme, toast, repo-context) |
| UI strings | `messages/en/<namespace>.json` via next-intl, never `constants.ts` |

- No `fetch` in components. Add an endpoint call on top of `apiFetch` and a hook in
  `lib/hooks/<domain>.ts`.
- A new route-private component gets the folder shape above with a colocated test.
- Cross-route reuse means promoting from `app/**/_components/` to `components/`, not importing across
  route folders.
- Prefer `@/lib/hooks/<domain>` over deep relative paths. Some existing files still use
  `../../../../lib/hooks/…`. Do not copy that.
- The client has no server data layer: it talks to the Fastify API over REST/SSE, and authorization
  lives on the server.

## Review checklist

- [ ] Each new file sits on the lowest ladder rung that covers its current consumers.
- [ ] No new import from a sibling feature/route folder, and nothing shared imports feature code.
- [ ] Components contain no `fetch`, endpoint strings, raw DTO mapping or business thresholds.
- [ ] Constants are colocated, UI copy is in i18n, and query keys sit with their queries.
- [ ] Helpers and utils are pure and live at the right level.
- [ ] No new aggregating barrel, and no import through a folder's own `index.ts`.
- [ ] Tests sit next to the code they test.
