import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PACKAGES = ['client', 'server', 'reviewer-core', 'e2e'];

export function git(args, cwd, opts = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: opts.buffer ? undefined : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function repoRoot(cwd = process.cwd()) {
  return git(['rev-parse', '--show-toplevel'], cwd).trim();
}

export function stateDir(root) {
  const dir = join(git(['rev-parse', '--absolute-git-dir'], root).trim(), 'pr-self-review');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function runDir(root) {
  const dir = join(stateDir(root), 'run');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function sha256(...parts) {
  const h = createHash('sha256');
  for (const p of parts) {
    h.update(p);
    h.update('\0');
  }
  return h.digest('hex');
}

export function readJson(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

export function loadRouting() {
  return readJson(join(SKILL_DIR, 'routing.json'));
}

export function globToRegExp(glob) {
  let re = '';
  let i = 0;
  let inBrace = false;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
        continue;
      }
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      inBrace = true;
      re += '(?:';
    } else if (c === '}' && inBrace) {
      inBrace = false;
      re += ')';
    } else if (c === ',' && inBrace) {
      re += '|';
    } else if ('\\^$+.()|[]'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
    i += 1;
  }
  return new RegExp('^' + re + '$');
}

export function matchesAny(path, globs = []) {
  return globs.some((g) => globToRegExp(g).test(path));
}

export function packageOf(path) {
  const first = path.split('/')[0];
  return PACKAGES.includes(first) ? first : 'root';
}

export function resolveBase(root, routing) {
  const baseFile = join(stateDir(root), 'base');
  const fileBase = existsSync(baseFile) ? readFileSync(baseFile, 'utf8').trim() : '';
  const candidates = [process.env.PR_SELF_REVIEW_BASE, fileBase, routing.base, 'main'].filter(Boolean);
  for (const ref of candidates) {
    try {
      const mergeBase = git(['merge-base', ref, 'HEAD'], root).trim();
      return { base: ref, mergeBase };
    } catch {}
  }
  throw new Error(`cannot resolve a merge base against any of: ${candidates.join(', ')}`);
}

export function untrackedFiles(root) {
  return git(['ls-files', '--others', '--exclude-standard', '-z'], root)
    .split('\0')
    .filter(Boolean)
    .sort();
}

function isBinaryBuffer(buf) {
  return buf.subarray(0, 8000).includes(0);
}

export function computeFingerprint(root, mergeBase) {
  const diff = git(['diff', '--binary', '--no-color', '--no-ext-diff', mergeBase], root, { buffer: true });
  const parts = [mergeBase, diff];
  for (const file of untrackedFiles(root)) {
    const abs = join(root, file);
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    parts.push(file, readFileSync(abs));
  }
  return sha256(...parts);
}

export function collect(root, routing) {
  const { base, mergeBase } = resolveBase(root, routing);
  const files = [];
  const skipped = [];

  const nameStatus = git(['diff', '--name-status', '--no-renames', '-z', mergeBase], root).split('\0').filter(Boolean);
  const numstat = new Map();
  for (const line of git(['diff', '--numstat', '--no-renames', mergeBase], root).split('\n').filter(Boolean)) {
    const [a, d, ...rest] = line.split('\t');
    numstat.set(rest.join('\t'), { added: a, removed: d });
  }
  for (let i = 0; i < nameStatus.length; i += 2) {
    const status = nameStatus[i];
    const path = nameStatus[i + 1];
    const n = numstat.get(path) ?? { added: '0', removed: '0' };
    if (status.startsWith('D')) {
      skipped.push({ path, reason: 'deleted' });
      continue;
    }
    if (n.added === '-') {
      skipped.push({ path, reason: 'binary' });
      continue;
    }
    if (matchesAny(path, routing.ignore)) {
      skipped.push({ path, reason: 'ignored' });
      continue;
    }
    files.push({
      path,
      status: status[0] === 'A' ? 'added' : 'modified',
      untracked: false,
      package: packageOf(path),
      added: Number(n.added),
      removed: Number(n.removed),
    });
  }

  for (const path of untrackedFiles(root)) {
    const abs = join(root, path);
    if (!statSync(abs).isFile()) continue;
    const buf = readFileSync(abs);
    if (isBinaryBuffer(buf)) {
      skipped.push({ path, reason: 'binary' });
      continue;
    }
    if (matchesAny(path, routing.ignore)) {
      skipped.push({ path, reason: 'ignored' });
      continue;
    }
    const text = buf.toString('utf8');
    files.push({
      path,
      status: 'added',
      untracked: true,
      package: packageOf(path),
      added: text.length === 0 ? 0 : text.split('\n').length,
      removed: 0,
    });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  const changedLines = files.reduce((s, f) => s + f.added + f.removed, 0);
  const byPackage = {};
  for (const f of files) {
    byPackage[f.package] ??= { files: 0, lines: 0 };
    byPackage[f.package].files += 1;
    byPackage[f.package].lines += f.added + f.removed;
  }
  const { maxFiles, maxChangedLines } = routing.limits;
  return {
    base,
    mergeBase,
    fingerprint: computeFingerprint(root, mergeBase),
    files,
    skipped,
    totals: { files: files.length, changedLines },
    byPackage,
    sizeLimitExceeded: files.length > maxFiles || changedLines > maxChangedLines,
    limits: routing.limits,
  };
}

export function addedText(root, mergeBase, file) {
  if (file.untracked) return readFileSync(join(root, file.path), 'utf8');
  const patch = git(['diff', '--no-color', '--no-ext-diff', '-U0', mergeBase, '--', file.path], root);
  return patch
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1))
    .join('\n');
}

export function listSkillDirs(root) {
  const dir = join(root, '.claude', 'skills');
  return readdirSync(dir).filter((name) => existsSync(join(dir, name, 'SKILL.md'))).sort();
}

export function hashTree(dir) {
  if (!existsSync(dir)) return sha256('missing');
  const entries = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        if (name === 'evals' || name.endsWith('-workspace')) continue;
        walk(p);
      } else {
        entries.push(p.slice(dir.length), readFileSync(p));
      }
    }
  };
  walk(dir);
  return sha256(...entries);
}

export function readIfExists(path) {
  return existsSync(path) ? readFileSync(path) : Buffer.from('');
}
