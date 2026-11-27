---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Add a GET /repos/:id/branches endpoint to server that returns the list of this repository's branches from GitHub (branch name and whether it is the default). Look the repository up in the current workspace; if it is not there, return 404. Add tests.
