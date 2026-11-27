# Next.js server-side data placement

Read this when a Next.js codebase has Server Components that read data, Server Actions, or secrets.
`[n]` refers to [../README.md](../README.md).

## Choose one data access approach [6][7]

| Approach | When |
|---|---|
| External HTTP API | Large or existing projects with a separate backend. Server Components call it like any client. |
| Data Access Layer (DAL) | Recommended for new full-stack Next.js projects. |
| Component-level queries | Prototypes only. |

Do not mix approaches in one codebase. Mixing makes it impossible to audit where data leaves the server.

## Data Access Layer rules [6][7]

- DAL modules start with `import "server-only"` so a client import fails the build.
- Every DAL function resolves the current user and checks authorization before it returns data.
- It returns minimal DTOs (only the fields the caller renders), never raw database records.
- Only the DAL reads `process.env` secrets. Config values the client needs go through
  `NEXT_PUBLIC_*` variables read in one config module.
- The DAL is where security review focuses, so UI code can change freely around it.

## Server ↔ client boundary placement

- Pass Client Components only the fields they render. Audit `"use client"` props typed as whole
  entities (`user: User`) [6][7].
- Keep `"use client"` files at the leaves of the tree. The data-reading parent stays a Server
  Component and passes plain props down.

## Server Actions [6][7]

- Treat each Server Action as a public HTTP endpoint, even if nothing imports it.
- Keep it thin: parse and validate input, re-check auth and ownership, delegate to the DAL, return a
  minimal result.
- Treat every argument as hostile. Closed-over values are encrypted, but `.bind()` arguments are not.
- Colocate actions with the route that uses them (`app/<route>/actions.ts`). Promote them to a feature
  module only with a second consumer, the same ladder as everything else.

## Placement summary

```
src/
├── app/<route>/
│   ├── page.tsx             Server Component: calls DAL, renders a view
│   ├── actions.ts           thin Server Actions → DAL
│   └── _components/         client and server view components
└── server/                  or lib/server/
    ├── dal/<entity>.ts      "server-only", auth check, DTOs
    └── env.ts               the only reader of secrets
```
