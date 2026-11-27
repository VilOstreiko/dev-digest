# Severity contract

Every skill has its own vocabulary (CRITICAL/HIGH/MEDIUM, hard rules, checklists, confidence levels).
The gate needs one scale, so each reviewer translates into it. When unsure between two levels, pick the
lower one and explain in `evidence`. The gate blocks on critical, so a false critical costs the
author a waiver or a wasted fix, and a missed critical is caught by the verifier only if it was reported.

| Level | Meaning | Blocks the PR |
|---|---|---|
| `critical` | The change, as written, introduces a runtime bug, a security hole, data loss, or breaks a hard rule that is expensive to undo once merged | yes, until fixed or waived |
| `major` | Real problem that should be fixed before merge but does not break anything immediately: maintainability, performance, a rule bent rather than broken | no |
| `minor` | Style, naming, placement nits, optional improvements | no |

## Per-skill mapping

| Skill | critical | major | minor |
|---|---|---|---|
| security | its CRITICAL or HIGH: exploitable without unusual preconditions (injection, missing authz on a route, secret in code or logs, path traversal, SSRF) | MEDIUM, defence-in-depth gaps | LOW, hardening ideas |
| onion-architecture | a `[introduced]` violation of a numbered hard rule (1–9) in its SKILL.md | `[extends-legacy]`, soft guidance (naming, file placement inside the right ring) | style |
| frontend-ui-architecture | a forbidden import direction (shared code importing feature code, cross-route import), data fetching or endpoint strings inside a component | wrong ladder rung, new aggregating barrel, constants or UI copy in the wrong place | naming, folder-shape nits |
| react-best-practices | its CRITICAL rules when the diff demonstrably breaks them (side effect or setState during render, hooks called conditionally, missing/unstable `key` on a dynamic list, mutated state) | its HIGH rules | its MEDIUM rules |
| next-best-practices | server-only code or secrets reachable from a client component, `"use client"` boundary that breaks the build, async API misuse that throws at runtime | RSC/data-pattern inefficiency, metadata or image misuse | conventions |
| fastify-best-practices | route without input validation on user-controlled data, unhandled promise that crashes the process, reply sent twice | missing response schema, plugin encapsulation issues | style |
| drizzle-orm-patterns | multi-write without a transaction where partial failure corrupts state, query that ignores tenancy/ownership filters, raw SQL with interpolated input | N+1 queries, missing `returning`, untyped results | style |
| postgresql-table-design | destructive change without a migration plan (drop/rename column with data, NOT NULL without default on a populated table), missing FK where orphans break reads | missing index on a new FK or hot filter, wrong data type | naming |
| zod | user input reaching business logic without `parse`/`safeParse`, `.parse` on untrusted input where a throw becomes a 500 | schema/type drift, `z.any()` | style |
| react-testing-library | a test that cannot fail (no assertion, asserts on a mock it set up) added as the only coverage for new logic | implementation-detail queries, `fireEvent` where `userEvent` fits | style |
| typescript-expert | `any`/`as` cast or non-null `!` that hides a real runtime `undefined`, unsound type guard | needless `any`, missing return types on exported API | style |

Mechanical checks (typecheck, `lint:arch`, migration consistency, missing `node_modules`) are produced
by `scripts/checks.mjs`, not by reviewers. They are critical by definition except the vendor-mirror and
hand-written-migration checks, which are major. The same script reports `api-contract` criticals (a
client call to a path or method no server route serves); those are pattern matches, so they go through
a verifier like reviewer findings.

## Scope rule

Report only what the diff introduces or extends. A violation that existed on the base branch and that
the diff does not touch is not a finding, even if it sits in a changed file. When the diff adds to a
known legacy violation (onion-architecture `references/legacy.md`, an `INSIGHTS.md` entry), tag it
`extends-legacy` and cap it at major.
