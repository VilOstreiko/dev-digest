# Frontend UI Architecture — Examples

Good/bad pairs for the rules in [SKILL.md](SKILL.md). Source numbers refer to [README.md](README.md).

## 1. Project trees

### Feature folders (Bulletproof style, Vite / SPA) [9]

```
src/
├── app/                 routes, providers, router — composes features
├── components/          shared UI used by several features
├── config/              env and app config, read in one place
├── features/
│   └── reviews/
│       ├── api/         fetch functions + query options for this domain
│       ├── components/
│       ├── hooks/
│       ├── domain/      pure business rules on Review / Finding
│       ├── types/
│       └── utils/
├── hooks/               shared, domain-agnostic hooks
├── lib/                 configured third-party libs (api client, query client)
├── types/
└── utils/               generic pure functions
```

Dependency direction: `components|hooks|lib|utils|types` → `features/*` → `app`. Features never import each other.

### Next.js App Router with colocation [5]

```
src/app/repos/[repoId]/pulls/[number]/
├── page.tsx                         thin: reads params, renders the view
└── _components/
    ├── FindingsPanel/
    │   ├── FindingsPanel.tsx
    │   ├── FindingsPanel.test.tsx
    │   ├── constants.ts
    │   ├── helpers.ts
    │   ├── styles.ts
    │   ├── index.ts                 export { FindingsPanel } from "./FindingsPanel";
    │   └── _components/
    │       └── SeverityFilter/      private child, used only by FindingsPanel
    └── VerdictBanner/
```

### Bad: grouped by file type at the top level, everything shared by default

```
src/
├── components/   140 files, route-specific and generic mixed together
├── constants.ts  900 lines, imported by every feature
├── helpers.ts    domain rules + string formatting + date math
├── hooks/        useFindingsPanelState, useAgentEditorTabs, useDebounce
└── utils/        formatVerdict, isRunRetryable, clamp
```

Problems: deleting a feature touches every folder, `constants.ts` couples unrelated features, and the domain rules in `utils/` are invisible to anyone reading the feature [12][16].

## 2. Promote on the second consumer

Before: one route uses the badge, so it stays private.

```
app/agents/_components/AgentCard/ModelChip.tsx
```

After: the PR page also needs it. Promote it to the closest common level, not to the UI kit:

```
components/model-chip/ModelChip.tsx
components/model-chip/index.ts
```

Bad: importing across route folders.

```tsx
import { ModelChip } from "../../agents/_components/AgentCard/ModelChip";
```

## 3. Component doing too much → layered

Bad: the view fetches, maps the DTO, holds a business threshold and renders.

```tsx
export function RunStatus({ runId }: { runId: string }) {
  const [run, setRun] = useState<RunDto | null>(null);
  const [retryable, setRetryable] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3001/runs/${runId}`)
      .then((r) => r.json())
      .then((dto) => setRun(dto));
  }, [runId]);

  useEffect(() => {
    if (run) setRetryable(run.status === "failed" && run.attempts < 3);
  }, [run]);

  if (!run) return null;
  return <Badge>{run.status.toUpperCase()}{retryable && " · retry"}</Badge>;
}
```

Good: the API layer knows the endpoint, the domain owns the rule and the threshold, the hook owns server state, and the view renders.

```ts
export function getRun(id: string) {
  return apiFetch<RunDto>(`/runs/${id}`);
}
```

```ts
export function runQueryOptions(id: string) {
  return queryOptions({ queryKey: ["runs", id], queryFn: () => getRun(id) });
}

export function useRun(id: string) {
  return useQuery(runQueryOptions(id));
}
```

```ts
const MAX_RUN_ATTEMPTS = 3;

export function canRetryRun(run: Pick<RunDto, "status" | "attempts">): boolean {
  return run.status === "failed" && run.attempts < MAX_RUN_ATTEMPTS;
}
```

```tsx
export function RunStatus({ runId }: { runId: string }) {
  const { data: run } = useRun(runId);
  if (!run) return null;
  return <Badge>{formatRunStatus(run.status)}{canRetryRun(run) && " · retry"}</Badge>;
}
```

Why: the retry rule is unit-testable without React [24], the component knows no endpoint [22], the derived flag is computed rather than synced through an effect [3], and the query key carries every variable [26][27].

## 4. Constants: colocated vs not constants at all

Good: a static map used by one component.

```ts
export const MODEL_COLOR = {
  "gpt-4.1": "#3b82f6",
  "gpt-4o": "#10b981",
} as const satisfies Record<string, string>;
```

Bad: these do not belong in `constants.ts`.

```ts
export const EMPTY_STATE_TITLE = "No findings yet";
export const MAX_RUN_ATTEMPTS = 3;
export const API_BASE = "http://localhost:3001";
export const RUN_QUERY_KEY = ["runs"];
```

- `EMPTY_STATE_TITLE` is UI copy, so it goes in the i18n messages file.
- `MAX_RUN_ATTEMPTS` is a business rule, so it goes inside `canRetryRun` in the domain [24].
- `API_BASE` is config, so it is read once in the config / API client module [9].
- `RUN_QUERY_KEY` belongs with the query options that use it [27].

## 5. Helper vs util vs lib

```ts
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
```
Generic and portable, so it is a **util** (`utils/number.ts`).

```ts
export function runLabel(run: Pick<RunDto, "agentName" | "startedAt">) {
  return `${run.agentName} · ${formatRelative(run.startedAt)}`;
}
```
Knows app shapes but has no business rule, so it is a **helper** (`helpers.ts` next to its consumer).

```ts
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
```
A configured third-party instance, so it is **lib** (`lib/query-client.ts`).

```ts
export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.innerWidth < 768, () => false);
}
```
Calls a hook, so it is a **hook**. It stays next to its single consumer until a second one appears [2].

## 6. Headless hook for reusable behavior [21]

```ts
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    toggle: () => setOpen((o) => !o),
    close: () => setOpen(false),
    triggerProps: { "aria-expanded": open, onClick: () => setOpen((o) => !o) },
  };
}
```

```tsx
export function ReviewRunAccordion({ run }: { run: Run }) {
  const { open, triggerProps } = useDisclosure();
  return (
    <section>
      <button {...triggerProps}>{run.agentName}</button>
      {open && <RunDetails run={run} />}
    </section>
  );
}
```

## 7. Variant branching → lookup in the domain [20]

Bad: the same `if` chain repeated in three components.

```tsx
const color = verdict === "approve" ? "green" : verdict === "request_changes" ? "red" : "gray";
```

Good: one domain map, consumed everywhere.

```ts
export const VERDICT_PRESENTATION = {
  approve: { tone: "success", icon: "Check" },
  request_changes: { tone: "danger", icon: "X" },
  comment: { tone: "neutral", icon: "Message" },
} as const satisfies Record<Verdict, { tone: Tone; icon: IconName }>;
```

## 8. Barrels

Bad: an aggregating barrel imported from inside its own folder.

```ts
export * from "./FileCard";
export * from "./CodeLine";
export * from "./CommentCard";
```

```ts
import { CodeLine } from "./index";
```

Good: import siblings directly, and keep `index.ts` as a thin entry for outsiders only [18].

```ts
import { CodeLine } from "../CodeLine/CodeLine";
```

## 9. Lint-enforced boundaries [30][29][9]

```js
"import/no-restricted-paths": ["error", {
  zones: [
    { target: "./src/features/reviews", from: "./src/features", except: ["./reviews"] },
    { target: "./src/features/agents", from: "./src/features", except: ["./agents"] },
    { target: ["./src/components", "./src/hooks", "./src/lib", "./src/utils"], from: ["./src/features", "./src/app"] },
    { target: "./src/features", from: "./src/app" },
  ],
}],
"import/no-cycle": "error",
```

For Next.js `app/<route>/_components`, the equivalent zone forbids `app/<routeA>/**` from importing `app/<routeB>/_components/**`.
