#!/usr/bin/env node
import { join } from 'node:path';
import { addedText, listSkillDirs, loadRouting, matchesAny, readJson, repoRoot, runDir, writeJson } from './lib.mjs';

const root = repoRoot();
const routing = loadRouting();
const out = runDir(root);
const diff = readJson(join(out, 'diff.json'));

const installed = listSkillDirs(root);
const known = new Set([...Object.keys(routing.skills), ...Object.keys(routing.excluded)]);
const unmapped = installed.filter((s) => !known.has(s));
const missing = Object.keys(routing.skills).filter((s) => !installed.includes(s));
if (unmapped.length || missing.length) {
  if (unmapped.length) {
    console.error(`unmapped skill(s): ${unmapped.join(', ')}`);
    console.error('add each one to "skills" (with paths) or "excluded" (with a reason) in routing.json');
  }
  if (missing.length) console.error(`routing.json routes skill(s) that do not exist: ${missing.join(', ')}`);
  process.exit(12);
}

const primary = Object.entries(routing.skills).filter(([, r]) => !r.fallback);
const fallback = Object.entries(routing.skills).filter(([, r]) => r.fallback);
const skills = {};
const fileSkills = {};
const unreviewed = [];

for (const file of diff.files) {
  const hits = [];
  for (const [name, rule] of primary) {
    if (!matchesAny(file.path, rule.paths)) continue;
    if (rule.contentPattern && !new RegExp(rule.contentPattern).test(addedText(root, diff.mergeBase, file))) continue;
    hits.push(name);
  }
  if (hits.length === 0) {
    for (const [name, rule] of fallback) {
      if (matchesAny(file.path, rule.paths)) hits.push(name);
    }
  }
  if (hits.length === 0) {
    unreviewed.push(file.path);
    continue;
  }
  fileSkills[file.path] = hits;
  for (const name of hits) (skills[name] ??= []).push(file.path);
}

const result = { skills, fileSkills, unreviewed };
writeJson(join(out, 'route.json'), result);
console.log(JSON.stringify(result, null, 2));
