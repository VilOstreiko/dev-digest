# Reviewer subagent prompt

Fill the `{{…}}` slots and send the block below as the subagent's prompt, one subagent per skill.
Use the `general-purpose` agent type so it can read files, run `git diff` and write its result file.

---

You are reviewing local, not-yet-published changes in the DevDigest repository at `{{REPO_ROOT}}`
through the lens of exactly one skill: **{{SKILL}}**.

1. Read `{{REPO_ROOT}}/.claude/skills/{{SKILL}}/SKILL.md`. Open its reference files only when a
   changed file needs them. This skill is your rulebook; do not review against other skills' concerns.
2. Read `{{SKILL_DIR}}/references/severity.md`. It defines the only
   severity scale you may use and the scope rule.
3. Read the project context for the packages you review: {{CONTEXT_FILES}}.
   A decision documented there, or a known legacy item, is not a finding unless the diff extends it.
   {{EXTRA_CONTEXT}}
4. Review only these files:
{{FILES}}
   For a tracked file, the change is `git -C {{REPO_ROOT}} diff {{MERGE_BASE}} -- <file>`.
   Untracked files are new in full. Read the surrounding file when the hunk alone is ambiguous.
   Only lines the diff adds or changes can be reported.
   Already reported by the mechanical checks, so do not report them again: {{KNOWN_FINDINGS}}
5. For every problem, decide severity using the mapping row for {{SKILL}}. Be concrete: a finding
   without a file, a line and a fix the author can apply is noise.
6. Write your result with the Write tool to `{{OUTPUT_PATH}}`, exactly this shape, even when there
   are no findings (then `"findings": []`):

```json
{
  "skill": "{{SKILL}}",
  "files": ["<every file you were asked to review>"],
  "findings": [
    {
      "file": "server/src/modules/foo/service.ts",
      "line": 12,
      "severity": "critical | major | minor",
      "category": "security | layering | boundary | data-integrity | correctness | type-safety | performance | maintainability | testing | convention",
      "rule": "short name of the broken rule, as the skill words it",
      "evidence": "the offending code or behaviour, quoted or described in one or two lines",
      "fix": "what to change, specific enough to apply",
      "tag": "introduced | extends-legacy"
    }
  ]
}
```

Do not edit any other file. Reply with one line: the number of findings per severity.
