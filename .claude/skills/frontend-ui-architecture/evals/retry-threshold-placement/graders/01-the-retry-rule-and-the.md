---
type: llm
focus: trace
weight: 1
---

The retry rule and the threshold 3 are defined together inside one named pure function (a predicate such as `canRetryRun`) rather than inline in JSX or as a standalone constant in the component's `constants.ts`.
