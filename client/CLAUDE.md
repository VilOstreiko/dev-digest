# client — @devdigest/web

The studio UI: repos, PR list, diff, review runs and findings, agents, settings.
Talks to the API over REST and SSE only.

## Stack

Next.js ^15.1 (App Router) · React ^19 · TanStack Query ^5.62 · next-intl ^3.26 ·
zod ^3.24 · TypeScript ^5.7 · vitest ^2.1 + jsdom + Testing Library. Package manager: **pnpm**.

## Commands

- `pnpm dev` — web on :3000 (API expected on :3001)
- `pnpm test` — component tests, fetch mocked, no API needed
- `pnpm typecheck`
- `pnpm build`

## Map

- `src/app/**/page.tsx` — thin route pages
- `src/app/**/_components/<Name>/` — feature components, each with its own `*.test.tsx`
- `src/lib/api.ts` — the only fetch client (`apiFetch`, `ApiError`)
- `src/lib/hooks/` — every data hook (TanStack Query)
- `src/components/` — cross-route UI: app-shell, diff-viewer, page-shell
- `src/vendor/ui/` — `@devdigest/ui` kit; `src/vendor/shared/` — `@devdigest/shared` copy
- `messages/en/*.json` — UI strings by namespace

## Conventions (non-default)

- Data access goes through hooks in `src/lib/hooks/` built on `apiFetch`; no direct `fetch` in components.
- Feature logic lives in colocated `_components/<Name>/` folders, not in `page.tsx`.
- UI strings go into `messages/en/<namespace>.json` and are read via next-intl.
- Path aliases: `@/*` → `src/*`, `@devdigest/ui`, `@devdigest/shared`.

## Gotchas

- API base comes from `NEXT_PUBLIC_API_BASE`, default `http://localhost:3001`.
- Review runs return immediately; progress arrives over SSE `/runs/:id/events`, then the client refetches.
- `messages/en/` already has namespaces for future milestones; unused ones are expected.

## Do not touch

- `src/vendor/ui/` unless the task is about the UI kit itself.
- `src/vendor/shared/` alone: it has a server copy (see root CLAUDE.md).

## Docs — read when relevant (not auto-loaded)

- README.md — UI route map and the API calls behind each route
- docs/ — deeper client docs; index in docs/README.md
- specs/ — feature specs; read the relevant spec before implementing a feature
- INSIGHTS.md — non-obvious findings by section; read first, append via `engineering-insights`
- ../e2e/README.md — browser flows that cover the main journeys
