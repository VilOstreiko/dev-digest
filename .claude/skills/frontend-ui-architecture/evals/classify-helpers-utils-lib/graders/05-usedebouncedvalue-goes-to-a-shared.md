---
type: llm
focus: trace
weight: 1
---

`useDebouncedValue` goes to a shared location usable by both routes and is not put inside a `lib/hooks/<domain>.ts` data-hook module or under either route's `_components/`.
