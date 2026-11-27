#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeFingerprint, loadRouting, readJson, repoRoot, resolveBase, stateDir } from './lib.mjs';

const GATED = /(^|[\s;&|(])gh\s+pr\s+create(\s|$)/;

function evaluateGate(cwd) {
  let root;
  try {
    root = repoRoot(cwd);
  } catch {
    return { ok: true, reason: 'not a git repository' };
  }
  const verdictPath = join(stateDir(root), 'verdict.json');
  if (!existsSync(verdictPath)) return { ok: false, reason: 'no self-review verdict for this worktree' };
  const v = readJson(verdictPath);
  const { mergeBase } = resolveBase(root, loadRouting());
  if (mergeBase !== v.mergeBase) return { ok: false, reason: `the merge base moved since the review (${v.mergeBase.slice(0, 8)} → ${mergeBase.slice(0, 8)})` };
  if (computeFingerprint(root, mergeBase) !== v.fingerprint) return { ok: false, reason: 'the code changed since the last review' };
  if (v.verdict !== 'PASS') {
    const ids = v.blocking?.length ? `: unwaived critical ${v.blocking.join(', ')}` : '';
    return { ok: false, reason: `last verdict is ${v.verdict}${ids}` };
  }
  return { ok: true, reason: `PASS (fingerprint ${v.fingerprint.slice(0, 12)})` };
}

if (process.argv.includes('--status')) {
  const r = evaluateGate(process.cwd());
  console.log(`${r.ok ? 'OPEN' : 'CLOSED'}: ${r.reason}`);
  process.exit(r.ok ? 0 : 1);
}

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const command = input?.tool_input?.command ?? '';
if (input.tool_name !== 'Bash' || !GATED.test(command)) process.exit(0);

const r = evaluateGate(input.cwd || process.cwd());
if (r.ok) process.exit(0);
console.error(
  `PR creation blocked by pr-self-review: ${r.reason}.\n` +
    'Run /pr-self-review, fix or explicitly waive every critical finding, then retry.',
);
process.exit(2);
