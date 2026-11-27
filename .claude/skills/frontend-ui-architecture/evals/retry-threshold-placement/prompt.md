---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

In the client, `RunHistory` (on the PR page) needs to show a Retry button next to a run when its status is failed and it has had fewer than 3 attempts. Where should this logic and the number 3 live, and what should it look like in code? Show the changes file by file.
