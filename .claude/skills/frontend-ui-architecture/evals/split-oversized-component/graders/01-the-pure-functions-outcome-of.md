---
type: llm
focus: trace
weight: 1
---

The pure functions (outcome of a run, timestamp parsing, merging and sorting the timeline) move out of `RunHistory.tsx` into a colocated non-React module inside the `RunHistory/` folder (e.g. `helpers.ts`).
