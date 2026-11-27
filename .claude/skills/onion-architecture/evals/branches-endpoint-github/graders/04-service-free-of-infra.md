---
type: llm
focus: trace
weight: 1
---

The service/use case that lists branches does not depend on the Container (no Container-typed parameter or field, no this.container.* calls such as this.container.github()); it receives the GitHub client or a resolver for it, and its repository port, through its constructor, and imports nothing from drizzle-orm, src/db/*, src/adapters/*, octokit or fastify.
