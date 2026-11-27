---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

`RunHistory.tsx` у клієнті (`app/repos/[repoId]/pulls/[number]/_components/RunHistory`) розрісся: там і визначення outcome рану, і парсинг timestamp-ів, і злиття комітів з ранами в один таймлайн із сортуванням, і рендер рядка коміту, і рендер рядка рану. Розбий його правильно. Покажи нову структуру файлів і код.
