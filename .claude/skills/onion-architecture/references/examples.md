# Worked examples

> **Not in the code yet (as of 2.0.0).** The `review-presets` module, its table and `DomainError` are illustrative; see
> "Building blocks that do not exist yet" in `SKILL.md` before copying.

## Contents

1. New module end to end (`review-presets`)
2. Moving a route query behind a use case (`workspace`)

## 1. New module end to end

Feature: workspace-scoped review presets (name + agent ids + strategy). Files:

```
src/modules/review-presets/
  domain.ts        ring 1: Preset type, validation rule
  ports.ts         ring 2: PresetRepositoryPort
  service.ts       ring 2: PresetsService use cases
  repository.ts    ring 3: DrizzlePresetRepository + mapper
  routes.ts        ring 4: Fastify plugin
```

`domain.ts`:

```ts
import type { ReviewStrategy } from '@devdigest/shared';
import { DomainError } from '../../platform/errors.js';

export type Preset = Readonly<{
  id: string;
  workspaceId: string;
  name: string;
  agentIds: readonly string[];
  strategy: ReviewStrategy;
}>;

export class PresetNotFound extends DomainError {
  constructor(id: string) {
    super('preset_not_found', 'Preset not found', { id });
  }
}

export class EmptyPreset extends DomainError {
  constructor() {
    super('preset_empty', 'A preset needs at least one agent');
  }
}

export function assertPresetValid(agentIds: readonly string[]): void {
  if (agentIds.length === 0) throw new EmptyPreset();
}
```

`ports.ts`:

```ts
import type { Preset } from './domain.js';

export interface PresetRepositoryPort {
  listForWorkspace(workspaceId: string): Promise<Preset[]>;
  findById(workspaceId: string, id: string): Promise<Preset | undefined>;
  create(input: Omit<Preset, 'id'>): Promise<Preset>;
}
```

`service.ts`:

```ts
import { assertPresetValid, PresetNotFound, type Preset } from './domain.js';
import type { PresetRepositoryPort } from './ports.js';

export class PresetsService {
  constructor(private readonly presets: PresetRepositoryPort) {}

  list(workspaceId: string): Promise<Preset[]> {
    return this.presets.listForWorkspace(workspaceId);
  }

  async get(workspaceId: string, id: string): Promise<Preset> {
    const preset = await this.presets.findById(workspaceId, id);
    if (!preset) throw new PresetNotFound(id);
    return preset;
  }

  create(input: Omit<Preset, 'id'>): Promise<Preset> {
    assertPresetValid(input.agentIds);
    return this.presets.create(input);
  }
}
```

`repository.ts` — the only file that knows the table:

```ts
import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { Preset } from './domain.js';
import type { PresetRepositoryPort } from './ports.js';

type PresetRow = typeof t.reviewPresets.$inferSelect;

const toDomain = (row: PresetRow): Preset => ({
  id: row.id,
  workspaceId: row.workspaceId,
  name: row.name,
  agentIds: row.agentIds,
  strategy: row.strategy as Preset['strategy'],
});

export class DrizzlePresetRepository implements PresetRepositoryPort {
  constructor(private readonly db: DbExecutor) {}

  async listForWorkspace(workspaceId: string): Promise<Preset[]> {
    const rows = await this.db
      .select()
      .from(t.reviewPresets)
      .where(eq(t.reviewPresets.workspaceId, workspaceId));
    return rows.map(toDomain);
  }

  async findById(workspaceId: string, id: string): Promise<Preset | undefined> {
    const [row] = await this.db
      .select()
      .from(t.reviewPresets)
      .where(and(eq(t.reviewPresets.workspaceId, workspaceId), eq(t.reviewPresets.id, id)));
    return row ? toDomain(row) : undefined;
  }

  async create(input: Omit<Preset, 'id'>): Promise<Preset> {
    const [row] = await this.db.insert(t.reviewPresets).values({ ...input, agentIds: [...input.agentIds] }).returning();
    return toDomain(row!);
  }
}
```

`routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ReviewStrategy } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import type { Preset } from './domain.js';

const CreatePresetBody = z.object({
  name: z.string().min(1),
  agent_ids: z.array(z.string().uuid()),
  strategy: ReviewStrategy,
});

const toDto = (p: Preset) => ({ id: p.id, name: p.name, agent_ids: p.agentIds, strategy: p.strategy });

export default async function presetRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const presets = app.container.presetsService;

  app.get('/review-presets/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return toDto(await presets.get(workspaceId, req.params.id));
  });

  app.post('/review-presets', { schema: { body: CreatePresetBody } }, async (req, reply) => {
    const { workspaceId } = await getContext(app.container, req);
    const preset = await presets.create({
      workspaceId,
      name: req.body.name,
      agentIds: req.body.agent_ids,
      strategy: req.body.strategy,
    });
    reply.status(201);
    return toDto(preset);
  });
}
```

Wiring in `src/platform/container.ts`:

```ts
get presetsService(): PresetsService {
  return (this._presetsService ??= new PresetsService(new DrizzlePresetRepository(this.db)));
}
```

Then: add the table in `src/db/schema/*` → `pnpm db:generate`; register `presetRoutes` in
`src/modules/index.ts`; map `NotFound`-kind errors to 404 in the error handler if not already mapped.

Tests:

- `test/review-presets-service.test.ts` — `new PresetsService(new InMemoryPresetRepository())`; asserts
  `EmptyPreset` and `PresetNotFound`. No Docker.
- `test/review-presets-repository.it.test.ts` — real Postgres; asserts workspace scoping and mapping.
- `test/review-presets-routes.test.ts` — `app.inject`; asserts 201, 404, 422.

## 2. Moving a route query behind a use case (`workspace`)

Before (`src/modules/workspace/routes.ts`): the handler imports `drizzle-orm` and `db/schema` and selects
`repos` itself — violates rule 2.

After:

- `src/modules/repos/ports.ts` gains `listSummariesForWorkspace(workspaceId): Promise<RepoSummary[]>` on the
  repos repository port (the `repos` module owns that table), implemented in `repos/repository.ts` with
  the row → `RepoSummary` mapper. It returns every repo in the workspace, cloned or not, because the
  endpoint reports `cloned: false` for the rest.
- `src/modules/workspace/service.ts`:

  ```ts
  export class WorkspaceService {
    constructor(
      private readonly repos: RepoSummaryPort,
      private readonly cloneDir: string,
    ) {}

    async overview(workspaceId: string): Promise<WorkspaceOverview> {
      const repos = await this.repos.listSummariesForWorkspace(workspaceId);
      return { workspaceId, cloneDir: this.cloneDir, repos };
    }
  }
  ```

  `RepoSummaryPort` is declared in `repos/ports.ts`; workspace imports only that file, which
  `onion-no-cross-module-internals` allows.
- `routes.ts` calls `app.container.workspaceService.overview(workspaceId)` and maps to snake_case.
- `pnpm lint:arch:baseline` drops the two `workspace/routes.ts` entries.
