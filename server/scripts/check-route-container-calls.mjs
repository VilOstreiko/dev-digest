import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MODULES_DIR = join(ROOT, 'src/modules');
const BASELINE = join(ROOT, '.route-container-calls-baseline.json');
const FORBIDDEN = ['db', 'github', 'git', 'llm', 'secrets', 'auth', 'codeIndex', 'embedder', 'depgraph', 'tokenizer', 'agentsRepo', 'reviewRepo', 'jobs'];
const PATTERN = new RegExp(`\\bcontainer\\s*\\??\\.\\s*(${FORBIDDEN.join('|')})\\b`, 'g');

function routeFiles() {
  const files = [];
  for (const mod of readdirSync(MODULES_DIR)) {
    const dir = join(MODULES_DIR, mod);
    if (!statSync(dir).isDirectory()) continue;
    const file = join(dir, 'routes.ts');
    if (existsSync(file)) files.push(file);
    const sub = join(dir, 'routes');
    if (existsSync(sub) && statSync(sub).isDirectory()) {
      for (const f of readdirSync(sub)) if (f.endsWith('.ts')) files.push(join(sub, f));
    }
  }
  return files.sort();
}

function scan() {
  const counts = {};
  const locations = [];
  for (const file of routeFiles()) {
    const rel = relative(ROOT, file);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(PATTERN)) {
        counts[rel] ??= {};
        counts[rel][m[1]] = (counts[rel][m[1]] ?? 0) + 1;
        locations.push({ file: rel, line: i + 1, member: m[1] });
      }
    });
  }
  return { counts, locations };
}

const { counts, locations } = scan();

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
  const total = locations.length;
  console.log(`route-container-calls: baseline written (${total} known calls).`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const errors = [];
const shrunk = [];

for (const [file, members] of Object.entries(counts)) {
  for (const [member, n] of Object.entries(members)) {
    const known = baseline[file]?.[member] ?? 0;
    if (n > known) {
      const lines = locations.filter((l) => l.file === file && l.member === member).map((l) => l.line);
      errors.push(`  error onion-routes-no-container-ports: ${file} calls container.${member} ${n}x (baseline ${known}) at lines ${lines.join(', ')}`);
    }
  }
}
for (const [file, members] of Object.entries(baseline)) {
  for (const [member, known] of Object.entries(members)) {
    const n = counts[file]?.[member] ?? 0;
    if (n < known) shrunk.push(`${file} container.${member}: ${known} -> ${n}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(
    `\nx ${errors.length} route(s) reach adapters/ports/db through the container. Routes may take services from the container and call getContext; move the call into a use case. See .claude/skills/onion-architecture (rule 3).`,
  );
  process.exit(1);
}

const known = locations.length;
console.log(`✔ route-container-calls: no new violations (${known} known calls in baseline).`);
if (shrunk.length > 0) {
  console.log(`‼ baseline can shrink — run pnpm lint:arch:baseline:\n  ${shrunk.join('\n  ')}`);
}
