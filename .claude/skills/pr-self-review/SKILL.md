---
name: pr-self-review
description: Pre-PR gate for DevDigest. Reviews every local change on the branch (committed, staged, unstaged, untracked) against origin/main by routing each changed file to the project skills that own it (frontend skills on client/, onion/fastify/drizzle/postgres on server/ and reviewer-core/, security and typescript as fallback), runs typecheck and lint:arch, verifies every critical finding, and writes a PASS/BLOCK verdict that a hook enforces on `gh pr create`. Use it before opening any pull request and whenever the user says "self review", "review my changes", "check my diff", "is this ready for a PR", "can I open a PR", "run the pre-PR check", or a `gh pr create` was blocked by the self-review gate, even if they do not name the skill.
---

# PR self-review

Catches what the project skills would flag in review before the PR exists, and refuses PR creation
while a critical finding stands. A PreToolUse hook in `.claude/settings.json` runs
`scripts/check-gate.mjs` on every `gh pr create`. The gate opens only when the verdict file for this
worktree says PASS and its fingerprint matches the current code exactly. Any edit after the review
closes it again.

All commands run from the repository root. `S=.claude/skills/pr-self-review/scripts`.
State lives in this worktree's git dir (`git rev-parse --absolute-git-dir`)`/pr-self-review/`. It is
local, never committed, and never written outside the repo.

## Workflow

1. **Collect.** Run `node $S/collect-diff.mjs`, adding `--force-large` only if the user asked for it.
   - Exit 10: nothing to review. Say so and stop.
   - Exit 11: the diff is over the size limit (`limits` in `routing.json`). Show the `byPackage`
     breakdown, propose concrete split points (server vs client, one module per PR, migrations
     separately) and stop. Continue only if the user explicitly asks; re-run with `--force-large`.
2. **Route.** Run `node $S/route.mjs`.
   - Exit 12: a skill in `.claude/skills/` is not in `routing.json` (or routing names a missing
     skill). Stop and report it. Never guess a mapping silently: the user decides whether the new
     skill gets paths or goes under `excluded`.
   - Primary skills claim files by path (and `zod` by content). `typescript-expert` and `security`
     are fallbacks: they review only files no primary skill claimed.
3. **Plan the cache.** Run `node $S/cache.mjs plan` (add `--no-cache` if the user asked for a full
   re-review). Files whose content, package context and skill text are unchanged since an earlier run
   reuse their findings; only `review` files go to subagents.
4. **Mechanical checks.** Run `node $S/checks.mjs` now, before the reviews (it takes seconds), so the
   reviewers can be told what is already reported. It typechecks touched
   packages, runs `pnpm lint:arch` for server/reviewer-core changes (attributing each violation to its
   file), checks schema ⇔ migration consistency and the two `vendor/shared` copies, and matches every
   API path a changed client file calls (`api.*`, `apiFetch`, `fetch`) against the routes registered
   in `server/src/` — reviewers each see one rulebook, so nobody else would notice a call to a route
   that does not exist. Never regenerate a `lint:arch` baseline to make it pass. Baselines only shrink.
5. **Skill reviews.** For every skill in `plan.json` with a non-empty `review` list, launch one
   `general-purpose` subagent, all in a single message so they run in parallel. Build each prompt from
   [references/subagent-prompt.md](references/subagent-prompt.md):
   - `{{FILES}}`: that skill's `review` list only.
   - `{{CONTEXT_FILES}}`: `<pkg>/CLAUDE.md` and `<pkg>/INSIGHTS.md` for each package among those
     files (repo-root files → root `CLAUDE.md`).
   - `{{EXTRA_CONTEXT}}`: for `onion-architecture`, also read
     `.claude/skills/onion-architecture/references/legacy.md`. Otherwise leave it empty.
   - `{{OUTPUT_PATH}}`: `<state>/run/findings/<skill>.json`, using the `runDir` printed in step 1.
   - `{{MERGE_BASE}}`: from step 1.
   - `{{SKILL_DIR}}`: the absolute path of this skill's directory (the parent of `$S`).
   - `{{KNOWN_FINDINGS}}`: one line per finding in `<state>/run/mech.json` that touches this skill's
     files (`id file:line rule`), or `none`. Reviewers skip these, so one problem is not reported twice.
6. **Aggregate.** When all subagents are done, run `node $S/cache.mjs store`, then
   `node $S/report.mjs aggregate`. It merges cached, fresh and mechanical findings and deduplicates
   them: same file, same category, lines within 3 become one finding listing every skill, and a
   mechanical finding that a reviewer repeated anyway (a `lint:arch` violation on a file flagged for
   layering, a missing migration) is folded into that finding as confirmation. It assigns
   IDs (`C#` critical, `M#` major, `N#` minor). Exit 13 means a subagent wrote no result file. Re-run
   that one subagent, then aggregate again; do not finalize with a missing reviewer.
7. **Verify criticals.** For each entry in `needsVerification`, launch a verifier subagent from
   [references/verifier-prompt.md](references/verifier-prompt.md), all in parallel. `{{RULEBOOK}}` is
   the reporting skill's `SKILL.md`; for an `api-contract` finding it is `server/src/modules/*/routes.ts`
   plus `client/src/lib/api.ts`. Record each answer
   with `node $S/report.mjs verify <id> CONFIRMED|REJECTED "<reason>"`. Verifiers exist because a
   false critical blocks a PR for nothing. Mechanical criticals, and reviewer findings confirmed by
   `lint:arch`, are facts and skip this step.
   Verdicts are cached while the file is unchanged.
8. **Finalize.** Run `node $S/report.mjs finalize` and show its markdown report to the user as-is. It
   is already a numbered list, criticals first, one finding per number. It ends with a
   "PR description block" to paste into the PR body. Verdicts:
   - `PASS`: no unwaived critical. The gate is open for exactly this code.
   - `BLOCK`: at least one critical stands. Tell the user to fix or waive by ID ("1, 3" / "fix C1").
   - `INCOMPLETE`: the tree changed mid-review or a reviewer is missing. Re-run.
9. **False positives → insights.** If any critical was REJECTED, offer to record the verifier's reason
   with the `engineering-insights` skill in that package's `INSIGHTS.md`, so the next review reads it
   in step 5 and does not repeat the mistake. Offer it; write only if the user agrees.

## Fixing

If the user asks you to fix findings, fix only the ones they name, then run the whole workflow again.
The cache keeps the re-run cheap. Any edit changes the fingerprint, so an old PASS no longer counts.

## Waivers

Waive only when the user's own message names the finding and gives a reason, e.g.
"waive C2: the endpoint is behind the admin network". Never offer or suggest a waiver yourself; the
point of the gate is that someone consciously accepts the risk.
Run `node $S/report.mjs waive C2 "<the user's reason>"`. It records the waiver in `waivers.json`
(keyed by file, category and rule, so it survives re-runs while the finding stays the same) and
re-finalizes. Waived findings appear in the PR description block under "Self-review waivers". Put
that block in the PR body.

## Gate

- `node $S/check-gate.mjs --status` prints `OPEN` or `CLOSED` with the reason.
- The hook blocks only `gh pr create`. Plain `git push` is not gated.
- When the hook blocks a PR creation, run this skill. Do not look for another way to create the PR.

## Maintaining

- New project skill → add it to `routing.json` under `skills` (with `paths`, optional
  `contentPattern`, `fallback`) or `excluded` (with a reason). `route.mjs` refuses to run until you do.
- Severity translation per skill: [references/severity.md](references/severity.md). Update the row
  when a skill's own severity scale changes.
- Size limits, ignore globs and the base branch are in `routing.json`. For a stacked branch whose PR
  targets another branch, write that ref to `<state>/base` (local to this worktree).
  `PR_SELF_REVIEW_BASE` overrides both for one run.
