#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { addedText, readJson, repoRoot, runDir, writeJson } from './lib.mjs';

const root = repoRoot();
const out = runDir(root);
const diff = readJson(join(out, 'diff.json'));
const touched = new Set(diff.files.map((f) => f.package));
const changed = new Set(diff.files.map((f) => f.path));
const deleted = diff.skipped.filter((s) => s.reason === 'deleted').map((s) => s.path);
const findings = [];
const checks = [];

const SCHEMA = [/^server\/src\/db\/schema\.ts$/, /^server\/src\/db\/schema\//];
const MIGRATION = /^server\/src\/db\/migrations\/[^/]+\.sql$/;
const VENDOR = /^(server|client)\/src\/vendor\/shared\/(.+)$/;

function finding(id, severity, file, rule, evidence, fix, line = null) {
  findings.push({ id, skill: 'mechanical', severity, category: 'correctness', file, line, rule, evidence, fix, tag: 'introduced' });
}

function serverRelative(p) {
  return p.startsWith('../reviewer-core/') ? p.slice(3) : `server/${p}`;
}

function lintArchByFile(output) {
  const map = new Map();
  for (const raw of output.split('\n')) {
    const m = /^\s*error (\S+): (\S+) (→|calls) (.*)$/.exec(raw);
    if (!m) continue;
    const file = serverRelative(m[2]);
    const at = /at lines (\d+)/.exec(m[4]);
    const entry = map.get(file) ?? { rules: new Set(), lines: [], line: null };
    entry.rules.add(m[1]);
    entry.lines.push(raw.trim());
    if (at && entry.line === null) entry.line = Number(at[1]);
    map.set(file, entry);
  }
  return map;
}

function walkTs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'node_modules') walkTs(p, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function normalizeApiPath(p) {
  return p
    .split('?')[0]
    .replace(/\$\{[^}]*\}/g, ':p')
    .replace(/\/:[A-Za-z_]\w*/g, '/:p')
    .replace(/\/+$/, '') || '/';
}

function pathsMatch(a, b) {
  const x = a.split('/');
  const y = b.split('/');
  return x.length === y.length && x.every((s, i) => s === y[i] || s === ':p' || y[i] === ':p');
}

function checkApiContract() {
  const clientFiles = diff.files.filter((f) => f.package === 'client' && /\.tsx?$/.test(f.path));
  if (!clientFiles.length) return;
  const routes = [];
  const routeRe = /\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*['"`](\/[^'"`]*)['"`]/g;
  for (const file of walkTs(join(root, 'server', 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(routeRe)) routes.push({ method: m[1].toUpperCase(), path: normalizeApiPath(m[2]) });
  }
  if (!routes.length) return;
  const callRes = [
    { re: /\bapi\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*['"`]((?:\/|\$\{API_BASE\})[^'"`]*)['"`]/g, method: (m) => m[1].toUpperCase() },
    { re: /\bapiFetch(?:<[^>]*>)?\(\s*['"`](\/[^'"`]*)['"`]/g, method: () => null, path: 1 },
    { re: /\bfetch\(\s*['"`](?:https?:\/\/[^/'"`]+|\$\{API_BASE\})(\/[^'"`]*)['"`]/g, method: () => null, path: 1 },
  ];
  for (const f of clientFiles) {
    const lines = readFileSync(join(root, f.path), 'utf8').split('\n');
    const added = new Set(addedText(root, diff.mergeBase, f).split('\n'));
    lines.forEach((text, idx) => {
      if (!added.has(text)) return;
      for (const c of callRes) {
        for (const m of text.matchAll(c.re)) {
          const rawPath = (c.path ? m[c.path] : m[2]).replace('${API_BASE}', '');
          const path = normalizeApiPath(rawPath);
          const method = c.method(m);
          const samePath = routes.filter((r) => pathsMatch(path, r.path));
          const ok = samePath.some((r) => !method || r.method === method);
          if (ok) continue;
          const known = samePath.length ? `the server has ${[...new Set(samePath.map((r) => r.method))].join('/')} for this path` : 'no server route matches this path';
          findings.push({
            id: 'API-CONTRACT',
            skill: 'api-contract',
            severity: 'critical',
            category: 'correctness',
            file: f.path,
            line: idx + 1,
            rule: `client calls ${method ?? 'any method'} ${rawPath}, but ${known}`,
            evidence: text.trim(),
            fix: 'call an existing route (see server/src/modules/*/routes.ts), or add the route and its contract to both vendor/shared copies in the same PR',
            tag: 'introduced',
          });
        }
      }
    });
  }
}

function run(name, cmd, args, cwd) {
  return new Promise((resolvePromise) => {
    const started = Date.now();
    if (!existsSync(join(cwd, 'node_modules'))) {
      checks.push({ name, cwd, status: 'not-run', reason: 'node_modules missing' });
      finding(
        `MECH-ENV-${name}`,
        'critical',
        cwd.slice(root.length + 1) || '.',
        `${name} could not run`,
        `node_modules is missing in ${cwd.slice(root.length + 1)}; the check was not executed`,
        `install dependencies in ${cwd.slice(root.length + 1)} (${cmd} install) and re-run the review`,
      );
      return resolvePromise();
    }
    const child = spawn(cmd, args, { cwd, env: { ...process.env, CI: '1', FORCE_COLOR: '0' } });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const timer = setTimeout(() => child.kill('SIGTERM'), 10 * 60 * 1000);
    child.on('close', (code) => {
      clearTimeout(timer);
      const status = code === 0 ? 'pass' : 'fail';
      checks.push({ name, cwd, cmd: [cmd, ...args].join(' '), status, durationMs: Date.now() - started });
      if (status === 'fail') {
        const perFile = name === 'server-lint-arch' ? lintArchByFile(output) : new Map();
        if (perFile.size) {
          for (const [file, v] of perFile) {
            findings.push({
              id: 'MECH-LINT-ARCH',
              skill: 'mechanical',
              severity: 'critical',
              category: 'layering',
              file,
              line: v.line,
              rule: `lint:arch ${[...v.rules].join(', ')}`,
              evidence: v.lines.join('\n'),
              fix: 'move the dependency behind a port/repository as the onion-architecture skill describes; never regenerate a lint:arch baseline to silence it',
              tag: 'introduced',
            });
          }
        } else {
          const tail = output.trim().split('\n').slice(-40).join('\n');
          finding(`MECH-${name}`, 'critical', cwd.slice(root.length + 1), `${name} failed`, tail, `fix the reported errors; never regenerate a lint:arch baseline to silence them`);
        }
      }
      resolvePromise();
    });
  });
}

const jobs = [];
const serverSide = touched.has('server') || touched.has('reviewer-core');
if (serverSide) {
  jobs.push(run('server-typecheck', 'pnpm', ['-s', 'typecheck'], join(root, 'server')));
  jobs.push(run('server-lint-arch', 'pnpm', ['-s', 'lint:arch'], join(root, 'server')));
}
if (touched.has('reviewer-core')) jobs.push(run('reviewer-core-typecheck', 'npm', ['run', '-s', 'typecheck'], join(root, 'reviewer-core')));
if (touched.has('client')) jobs.push(run('client-typecheck', 'pnpm', ['-s', 'typecheck'], join(root, 'client')));

const schemaChanged = [...changed].filter((p) => SCHEMA.some((r) => r.test(p)));
const newMigrations = diff.files.filter((f) => MIGRATION.test(f.path) && f.status === 'added').map((f) => f.path);
const editedMigrations = diff.files.filter((f) => MIGRATION.test(f.path) && f.status === 'modified').map((f) => f.path);
const deletedMigrations = deleted.filter((p) => MIGRATION.test(p));

if (schemaChanged.length && !newMigrations.length) {
  finding(
    'MECH-MIGRATION-MISSING',
    'critical',
    schemaChanged[0],
    'schema changed without a migration',
    `changed schema files: ${schemaChanged.join(', ')}; no new file in server/src/db/migrations/`,
    'run `pnpm db:generate` (drizzle-kit generate) in server/ and commit the new migration with its meta snapshot',
  );
}
if (newMigrations.length && !schemaChanged.length) {
  finding(
    'MECH-MIGRATION-HANDWRITTEN',
    'major',
    newMigrations[0],
    'migration added without a schema change',
    `new migrations: ${newMigrations.join(', ')}; server/src/db/schema* unchanged`,
    'confirm the migration is intentional (data migration, extension, index) or update the schema to match',
  );
}
for (const p of [...editedMigrations, ...deletedMigrations]) {
  finding(
    'MECH-MIGRATION-EDITED',
    'critical',
    p,
    'existing migration modified or deleted',
    `${p} exists on ${diff.base}; databases that already applied it will diverge`,
    'revert the edit and add a new migration instead',
  );
}

for (const p of changed) {
  const m = VENDOR.exec(p);
  if (!m) continue;
  const other = `${m[1] === 'server' ? 'client' : 'server'}/src/vendor/shared/${m[2]}`;
  if (existsSync(join(root, other)) && !changed.has(other)) {
    finding(
      `MECH-VENDOR-MIRROR`,
      'major',
      p,
      '@devdigest/shared copy not mirrored',
      `${p} changed but ${other} did not`,
      `apply the same contract change to ${other}, or state why the copies differ`,
    );
  }
}

checkApiContract();
await Promise.all(jobs);
const seen = new Map();
for (const f of findings) {
  const n = (seen.get(f.id) ?? 0) + 1;
  seen.set(f.id, n);
  if (n > 1) f.id = `${f.id}-${n}`;
}
writeJson(join(out, 'mech.json'), { checks, findings });
console.log(JSON.stringify({ checks, findings: findings.map((f) => `${f.severity} ${f.id} ${f.file}`) }, null, 2));
