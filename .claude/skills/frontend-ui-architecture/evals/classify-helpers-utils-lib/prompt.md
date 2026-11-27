---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

I have four new pieces of code in the client. Tell me where each one should go and why: (1) `clampScore(n, min, max)`, which just clamps a number; (2) `verdictLabel(review)`, which returns a string like "Approve · 3 findings" for the ReviewRunAccordion header; (3) creating a configured `QueryClient` with our staleTime/retry defaults; (4) a `useDebouncedValue(value, ms)` hook needed both in `FilterBar` on the PR list and in the search on the agents page. Give file paths and short code.
