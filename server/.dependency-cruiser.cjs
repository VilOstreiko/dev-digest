const SDKS = 'node_modules/(fastify|fastify-[^/]+|@fastify/[^/]+|drizzle-orm|postgres|octokit|@octokit/[^/]+|openai|@anthropic-ai/[^/]+|simple-git|@vscode/ripgrep|@ast-grep/[^/]+|dependency-cruiser|js-tiktoken)/';
const INNER = '^src/modules/[^/]+/(service\\.ts|ports\\.ts|domain\\.ts|domain/)';
const ROUTE_FORBIDDEN_SDKS = 'node_modules/(postgres|octokit|@octokit/[^/]+|openai|@anthropic-ai/[^/]+|simple-git|@vscode/ripgrep|@ast-grep/[^/]+|dependency-cruiser|js-tiktoken)/';
const DOMAIN = '^src/modules/([^/]+)/(domain\\.ts|domain/)';

module.exports = {
  forbidden: [
    {
      name: 'onion-inner-no-infrastructure',
      severity: 'error',
      comment:
        'Use cases, ports and domain must not import Drizzle, db, adapters, SDKs, Fastify or the Container. Depend on a port and let the container inject it. See .claude/skills/onion-architecture (rule 1).',
      from: { path: INNER },
      to: {
        path: ['^src/db/', '^src/adapters/', '^src/platform/container\\.ts$', SDKS],
      },
    },
    {
      name: 'onion-inner-no-io',
      severity: 'error',
      comment:
        'Use cases, ports and domain must not touch the filesystem or spawn processes. Put it behind a port in src/adapters. See .claude/skills/onion-architecture (rule 1).',
      from: { path: INNER },
      to: {
        dependencyTypes: ['core'],
        path: '^(node:)?(fs|fs/promises|child_process|net|http|https)$',
      },
    },
    {
      name: 'onion-domain-pure',
      severity: 'error',
      comment:
        'Domain code may import only domain code of its own module, src/platform/errors.ts, @devdigest/shared and zod. See .claude/skills/onion-architecture/references/domain.md.',
      from: { path: DOMAIN },
      to: {
        pathNot: ['^src/modules/$1/(domain\\.ts|domain/)', '^src/platform/errors\\.ts$', '^src/vendor/shared/', 'node_modules/zod/'],
      },
    },
    {
      name: 'onion-routes-no-persistence',
      severity: 'error',
      comment:
        'Routes call use cases; they never query Drizzle or import a repository. See .claude/skills/onion-architecture (rule 2).',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: {
        path: ['^src/db/', '^src/modules/[^/]+/repository(\\.ts$|/)', 'node_modules/drizzle-orm/'],
      },
    },
    {
      name: 'onion-routes-no-adapters',
      severity: 'error',
      comment:
        'Routes are the delivery adapter: they call use cases, never other adapters or SDKs. Put the call behind a port used by a service. See .claude/skills/onion-architecture (rule 3).',
      from: { path: '^src/modules/[^/]+/routes(\\.ts$|/)' },
      to: {
        path: ['^src/adapters/', ROUTE_FORBIDDEN_SDKS],
      },
    },
    {
      name: 'onion-adapters-no-modules',
      severity: 'error',
      comment:
        'Adapters point inward to ports only; they must not import feature modules. See .claude/skills/onion-architecture (rule 8).',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'onion-no-cross-module-internals',
      severity: 'error',
      comment:
        'A module may use another module only through its ports.ts or types.ts facade, wired by the container. See .claude/skills/onion-architecture (rule 8).',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/',
        pathNot: ['^src/modules/$1/', '^src/modules/_shared/', '^src/modules/[^/]+/(ports|types)\\.ts$', '^src/modules/index\\.ts$'],
      },
    },
    {
      name: 'onion-db-row-types-stay-in-infrastructure',
      severity: 'error',
      comment:
        'Drizzle row types (src/db/rows.ts) are private to repositories. Map rows to domain types inside the repository. See .claude/skills/onion-architecture/references/drizzle-persistence.md.',
      from: {
        path: '^src/',
        pathNot: ['^src/db/', '^src/modules/[^/]+/repository(\\.ts$|/)', '^src/platform/container\\.ts$'],
      },
      to: { path: '^src/db/rows\\.ts$' },
    },
    {
      name: 'onion-core-no-sdk',
      severity: 'error',
      comment:
        'reviewer-core is the pure core: no vendor SDKs, DB, filesystem or server code. Its only side effect is the injected LLMProvider. See .claude/skills/onion-architecture/references/reviewer-core.md.',
      from: { path: '^\\.\\./reviewer-core/src/' },
      to: {
        path: [SDKS, '^(openai|@anthropic-ai/)', '^src/(db|adapters|modules|platform)/'],
      },
    },
    {
      name: 'onion-core-no-io',
      severity: 'error',
      comment: 'reviewer-core must not touch the filesystem, network or processes.',
      from: { path: '^\\.\\./reviewer-core/src/' },
      to: {
        dependencyTypes: ['core'],
        path: '^(node:)?(fs|fs/promises|child_process|net|http|https)$',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|test)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
