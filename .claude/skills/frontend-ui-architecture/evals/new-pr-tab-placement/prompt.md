---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

Add a new "Files summary" tab to the PR page in the client (`app/repos/[repoId]/pulls/[number]`). It shows how many changed files there are per status (added / modified / deleted); the data comes from the backend at `GET /repos/:repoId/pulls/:number/files-summary`. List which files you will create or change and exactly where, and give the code for each.
