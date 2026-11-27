#!/usr/bin/env node
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { collect, loadRouting, repoRoot, runDir, stateDir, writeJson } from './lib.mjs';

const root = repoRoot();
const routing = loadRouting();
rmSync(join(stateDir(root), 'run'), { recursive: true, force: true });
const out = runDir(root);
const result = collect(root, routing);
result.forceLarge = process.argv.includes('--force-large');
writeJson(join(out, 'diff.json'), result);

const summary = {
  runDir: out,
  base: result.base,
  mergeBase: result.mergeBase,
  fingerprint: result.fingerprint,
  totals: result.totals,
  byPackage: result.byPackage,
  skipped: result.skipped.length,
  sizeLimitExceeded: result.sizeLimitExceeded,
  forceLarge: result.forceLarge,
};
console.log(JSON.stringify(summary, null, 2));
if (result.totals.files === 0) {
  console.error('nothing to review: no reviewable changes against ' + result.base);
  process.exit(10);
}
if (result.sizeLimitExceeded && !result.forceLarge) {
  console.error(
    `diff too large: ${result.totals.files} files / ${result.totals.changedLines} lines ` +
      `(limits ${result.limits.maxFiles} / ${result.limits.maxChangedLines})`,
  );
  process.exit(11);
}
