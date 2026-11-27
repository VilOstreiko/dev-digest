---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Bash]
---

У мене в клієнті з'явилися чотири нові шматки коду, підкажи куди кожен покласти і чому: (1) `clampScore(n, min, max)` — просто обмежує число; (2) `verdictLabel(review)` — повертає рядок типу "Approve · 3 findings" для заголовка ReviewRunAccordion; (3) створення налаштованого `QueryClient` з нашими дефолтами staleTime/retry; (4) хук `useDebouncedValue(value, ms)`, який потрібен і в `FilterBar` на списку PR, і в пошуку на сторінці агентів. Дай шляхи файлів і короткий код.
