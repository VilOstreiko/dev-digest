---
name: engineering-insights
description: Records non-obvious engineering findings into the INSIGHTS.md of the package being worked on (client/, server/, reviewer-core/, e2e/). Use the moment a session hits a dead end, fixes a non-obvious error, pivots approach, receives a user correction, discovers an undocumented convention or dependency quirk, makes a decision with a reason, or leaves a question open — and always as a wrap-up at the end of the session, before reporting done.
---

# Engineering insights

Goal: the next session in this package knows what this one learned, without re-discovering it.

1. Pick the file: `<package>/INSIGHTS.md` for the package the finding is about (repo-intel → `server/`). Several packages → each one it concerns.
2. Filter: skip it if it is obvious from reading the code, already in CLAUDE.md/README, generic knowledge, or a one-off. Ask: would a future session act differently or save 5+ minutes?
3. Write it actionable "cold": concrete names, numbers, the why and the fix, plus `path` · `symbol` evidence. Format, section rubric and examples: [reference.md](reference.md).
4. Re-read the file right before writing. If the insight is already there, even worded differently, skip it. Otherwise append to the matching section only.
5. Insert, never rewrite: use Edit with `old_string` = the last line of the target section (or its `##` heading when empty) and `new_string` = that same line + the new entry. Never use Write on an existing INSIGHTS.md. Never edit or delete existing lines; correct a wrong entry with a new dated entry that names it.
6. After writing, run `.claude/skills/engineering-insights/scripts/check-append-only.sh`. If it fails, stop, show the user the lost lines and put them back with Edit exactly as printed — never `git checkout` the whole file (that also drops other uncommitted work).
7. Look hardest for **What Doesn't Work** — dead ends are the most valuable entries. Cap a wrap-up at 5 entries.
8. Tell the user in one line what was added and where, or "no new insights".
