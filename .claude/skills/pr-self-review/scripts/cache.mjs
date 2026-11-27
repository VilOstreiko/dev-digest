#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  SKILL_DIR,
  hashTree,
  packageOf,
  readIfExists,
  readJson,
  repoRoot,
  runDir,
  sha256,
  stateDir,
  writeJson,
} from './lib.mjs';

const [command, ...flags] = process.argv.slice(2);
const root = repoRoot();
const out = runDir(root);
const cacheDir = join(stateDir(root), 'cache');

function contextHash(pkg) {
  if (pkg === 'root') return sha256(readIfExists(join(root, 'CLAUDE.md')));
  return sha256(readIfExists(join(root, pkg, 'CLAUDE.md')), readIfExists(join(root, pkg, 'INSIGHTS.md')));
}

function plan() {
  const noCache = flags.includes('--no-cache');
  const diff = readJson(join(out, 'diff.json'));
  const route = readJson(join(out, 'route.json'));
  const reviewerHash = hashTree(SKILL_DIR);
  const skillHashes = {};
  const ctx = {};
  const result = { noCache, skills: {}, keys: {}, cachedFindings: [] };

  for (const [skill, files] of Object.entries(route.skills)) {
    skillHashes[skill] ??= hashTree(join(root, '.claude', 'skills', skill));
    result.skills[skill] = { review: [], cached: [] };
    result.keys[skill] = {};
    for (const file of files) {
      const pkg = packageOf(file);
      ctx[pkg] ??= contextHash(pkg);
      const key = sha256(skill, skillHashes[skill], reviewerHash, diff.mergeBase, file, readIfExists(join(root, file)), ctx[pkg]);
      result.keys[skill][file] = key;
      const entry = join(cacheDir, `${key}.json`);
      if (!noCache && existsSync(entry)) {
        result.skills[skill].cached.push(file);
        result.cachedFindings.push(...readJson(entry).findings.map((f) => ({ ...f, cached: true })));
      } else {
        result.skills[skill].review.push(file);
      }
    }
  }
  writeJson(join(out, 'plan.json'), result);
  const summary = Object.fromEntries(
    Object.entries(result.skills).map(([s, v]) => [s, { review: v.review.length, cached: v.cached.length }]),
  );
  console.log(JSON.stringify(summary, null, 2));
}

function store() {
  const planned = readJson(join(out, 'plan.json'));
  const dir = join(out, 'findings');
  if (!existsSync(dir)) return console.log('no findings to cache');
  let stored = 0;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const data = readJson(join(dir, name));
    const keys = planned.keys[data.skill] ?? {};
    for (const file of data.files ?? []) {
      if (!keys[file]) continue;
      const findings = (data.findings ?? []).filter((f) => f.file === file);
      writeJson(join(cacheDir, `${keys[file]}.json`), { skill: data.skill, file, findings });
      stored += 1;
    }
  }
  console.log(`cached ${stored} skill/file result(s)`);
}

if (command === 'plan') plan();
else if (command === 'store') store();
else {
  console.error('usage: cache.mjs plan [--no-cache] | cache.mjs store');
  process.exit(1);
}
