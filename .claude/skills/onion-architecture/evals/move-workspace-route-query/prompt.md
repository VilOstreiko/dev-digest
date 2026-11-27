---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

server/src/modules/workspace/routes.ts queries the database directly from the route. Move this into the right layers without changing the API response, and add a test.
