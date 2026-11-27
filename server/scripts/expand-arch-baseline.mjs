import { readFileSync, writeFileSync } from 'node:fs';

const BASELINE = new URL('../.dependency-cruiser-known-violations.json', import.meta.url);
const CORE_FROM = '../reviewer-core/';
const CORE_NODE_MODULES = '../reviewer-core/node_modules/';

const violations = JSON.parse(readFileSync(BASELINE, 'utf8'));

const unresolved = violations.filter(
  (v) => v.from.startsWith(CORE_FROM) && v.unresolvedTo !== undefined && !v.to.startsWith('.'),
);
if (unresolved.length > 0) {
  const list = unresolved.map((v) => `  ${v.from} -> ${v.to}`).join('\n');
  console.error(
    `expand-arch-baseline: reviewer-core imports are unresolved:\n${list}\n` +
      'Run `npm ci` in reviewer-core/ and regenerate, so the baseline records the resolved path and its bare form.',
  );
  process.exit(1);
}

const toBare = (to) =>
  to
    .slice(CORE_NODE_MODULES.length)
    .replace(/\.(d\.ts|d\.mts|d\.cts|js|mjs|cjs)$/, '')
    .replace(/\/index$/, '');

const key = (v) => `${v.rule.name}|${v.from}|${v.to}`;
const seen = new Set(violations.map(key));
const added = [];

for (const v of violations) {
  if (!v.from.startsWith(CORE_FROM) || !v.to.startsWith(CORE_NODE_MODULES)) continue;
  const bare = toBare(v.to);
  const twin = {
    type: v.type,
    from: v.from,
    to: bare,
    unresolvedTo: bare,
    dependencyTypes: ['unknown'],
    rule: v.rule,
  };
  if (!seen.has(key(twin))) {
    seen.add(key(twin));
    added.push(twin);
  }
}

writeFileSync(BASELINE, JSON.stringify([...violations, ...added], null, 2) + '\n');
console.log(`expand-arch-baseline: ${violations.length} violations, ${added.length} bare-name twins added for reviewer-core.`);
