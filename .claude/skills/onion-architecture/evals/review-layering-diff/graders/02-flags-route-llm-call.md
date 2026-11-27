---
type: llm
focus: trace
weight: 1
---

Flags the new POST /agents/:id/test route calling app.container.llm() directly as a layering violation (route calling an adapter/port instead of a use case).
