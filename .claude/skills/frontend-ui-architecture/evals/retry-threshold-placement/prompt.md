---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

У клієнті в `RunHistory` (сторінка PR) треба показувати кнопку Retry біля рану, якщо він має статус failed і в нього було менше 3 спроб. Куди покласти цю логіку і саме число 3, і як це має виглядати в коді? Покажи зміни по файлах.
