---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

Look at the structure of my client PR before merge. The code itself does not matter yet, only where things live:
- added `src/utils/isRunRetryable.ts` (failed && attempts < 3)
- added `src/constants.ts` with `MAX_ATTEMPTS = 3`, `EMPTY_FINDINGS_TEXT = "No findings yet"` and `API_TIMEOUT_MS`
- added `src/components/verdict-pill/VerdictPill.tsx`, used only on the PR page
- in `RunHistory.tsx` I did `import { modelColor } from "../../../../../agents/_components/AgentCard/helpers"`
- added `src/components/index.ts` with `export *` of all components so imports are shorter
What would you change?
