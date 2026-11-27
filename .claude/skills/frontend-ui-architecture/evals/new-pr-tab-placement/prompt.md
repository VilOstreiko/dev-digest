---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

Додай на сторінку PR (client, `app/repos/[repoId]/pulls/[number]`) новий таб «Files summary»: він показує кількість змінених файлів за статусом (added / modified / deleted), дані приходять з бекенду `GET /repos/:repoId/pulls/:number/files-summary`. Розпиши, які файли створиш або зміниш і де саме, і дай код для кожного.
