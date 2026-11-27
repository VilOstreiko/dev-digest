---
type: llm
focus: trace
weight: 1
---

The new route handler does not call container.github() (or any other adapter/port getter on the container) and does not import src/adapters/* or octokit; it delegates to a service/use-case method.
