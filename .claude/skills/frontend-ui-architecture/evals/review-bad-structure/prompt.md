---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

Глянь структуру мого PR у клієнті перед мерджем, код поки не важливий, тільки де що лежить:
- додав `src/utils/isRunRetryable.ts` (failed && attempts < 3)
- додав `src/constants.ts` з `MAX_ATTEMPTS = 3`, `EMPTY_FINDINGS_TEXT = "No findings yet"` і `API_TIMEOUT_MS`
- додав `src/components/verdict-pill/VerdictPill.tsx`, використовується тільки на сторінці PR
- у `RunHistory.tsx` зробив `import { modelColor } from "../../../../../agents/_components/AgentCard/helpers"`
- додав `src/components/index.ts` з `export *` усіх компонентів, щоб імпорти були коротші
Що б ти змінив?
