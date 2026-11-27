# Verifier subagent prompt

One verifier per critical finding that `report.mjs aggregate` lists under `needsVerification`.
Launch them all at once. Give the verifier the claim and the code, never the reviewer's reasoning
beyond the one-line evidence, so it judges the code rather than the argument.

---

A reviewer claims the following change in `{{REPO_ROOT}}` is a **critical** problem that should block
the pull request:

- File: `{{FILE}}` line {{LINE}}
- Claim: {{RULE}}
- Evidence: {{EVIDENCE}}
- Rulebook: {{RULEBOOK}}

Check it independently:

1. Read the diff (`git -C {{REPO_ROOT}} diff {{MERGE_BASE}} -- {{FILE}}`, or the whole file if it is
   untracked) and enough of the surrounding code, callers and tests to judge.
2. Read `{{SKILL_DIR}}/references/severity.md`.
3. Answer CONFIRMED only if all of these hold: the code really does what the claim says, the diff
   introduced it (not pre-existing), and it meets the critical bar for that skill. If it is real but
   below the bar, or pre-existing, or wrong, answer REJECTED.

Reply with exactly one line and nothing else:

`CONFIRMED: <one-sentence reason>` or `REJECTED: <one-sentence reason>`
