---
type: llm
focus: trace
weight: 1
---

The merged timeline is computed during render (optionally with `useMemo`), not stored via `useState` + `useEffect`.
