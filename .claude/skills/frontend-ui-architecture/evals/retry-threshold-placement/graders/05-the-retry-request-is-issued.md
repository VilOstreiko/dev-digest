---
type: llm
focus: trace
weight: 1
---

The retry request is issued through a mutation hook in `lib/hooks/<domain>.ts` built on `apiFetch`, not with `fetch` inside the component.
