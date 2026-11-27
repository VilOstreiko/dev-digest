---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

`RunHistory.tsx` in the client (`app/repos/[repoId]/pulls/[number]/_components/RunHistory`) has grown too big: it determines a run's outcome, parses timestamps, merges commits and runs into one sorted timeline, renders the commit row and renders the run row. Split it properly. Show the new file structure and the code.
