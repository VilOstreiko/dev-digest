# Choosing an architecture model

Read this when choosing or comparing a frontend structure model, or when a repo already uses
Feature-Sliced Design. `[n]` refers to [../README.md](../README.md).

## Default: colocation + feature folders

The default in this skill is **Next.js colocation combined with Bulletproof-style feature folders**
[5][9]:
- Routes own their private UI (`app/<route>/_components`).
- Domains that span routes get `features/<domain>/` with `api/`, `components/`, `hooks/`,
  `domain/`, `types/`, `utils/`. Include only the folders the feature needs.
- A shared layer is grouped by type (`components/`, `hooks/`, `lib/`, `utils/`, `types/`).
- Imports flow shared → features → app, and features never import each other.

It fits small to mid-size apps and teams that want low ceremony.

## Alternative: Feature-Sliced Design (FSD) [10][11]

A stricter, standardized model for large apps or many teams.

- **Layers**, top to bottom: `app` → `pages` → `widgets` → `features` → `entities` → `shared`.
  `processes` is deprecated.
- **Slices:** every layer except `app` and `shared` is split by business domain (`entities/user`,
  `features/add-to-cart`).
- **Segments** inside a slice, by purpose: `ui`, `api`, `model`, `lib`, `config`.
- **Import rule:** a module imports only from layers strictly below it. Slices on the same layer
  never import each other.
- **Public API:** each slice exposes an `index.ts`, and outsiders import only through it.
- **Tooling:** Steiger (`npx steiger ./src`) lints forbidden imports, missing public APIs and imports
  that bypass a public API [11].
- **Adoption:** shape `app` and `shared` first, then pages and widgets, then extract entities.

## Picking one

| Signal | Lean towards |
|---|---|
| Next.js App Router, few domains, a single team | Colocation + feature folders |
| Many domains reused across many pages, several teams | FSD |
| Existing repo already consistent with one model | Keep that model |

Do not mix two models in one repo. You can borrow FSD ideas inside the default model: downward-only
imports, segment names, or a public entry per feature. If you do, record the decision in the repo's
CLAUDE.md.

## FSD vs "no barrels"

FSD requires an `index.ts` public API per slice. TkDodo and Atlassian advise against barrels
[18][19]. With FSD, keep slice `index.ts` files as pure re-exports (so `optimizePackageImports`
[8] and tree shaking still work), and never import a slice's own `index.ts` from inside the slice.
