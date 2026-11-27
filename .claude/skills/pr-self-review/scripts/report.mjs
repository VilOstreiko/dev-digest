#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeFingerprint, readIfExists, readJson, repoRoot, runDir, sha256, stateDir, writeJson } from './lib.mjs';

const SEVERITIES = ['critical', 'major', 'minor'];
const CATEGORIES = [
  'security',
  'layering',
  'boundary',
  'data-integrity',
  'correctness',
  'type-safety',
  'performance',
  'maintainability',
  'testing',
  'convention',
];
const PREFIX = { critical: 'C', major: 'M', minor: 'N' };

const [command, ...args] = process.argv.slice(2);
const root = repoRoot();
const out = runDir(root);
const state = stateDir(root);
const verifyCacheDir = join(state, 'verify-cache');
const waiversPath = join(state, 'waivers.json');
const verdictPath = join(state, 'verdict.json');

function normalize(f, source) {
  const severity = SEVERITIES.includes(f.severity) ? f.severity : 'major';
  const category = CATEGORIES.includes(f.category) ? f.category : 'correctness';
  const line = Number.isInteger(f.line) ? f.line : null;
  const rule = String(f.rule ?? '').trim();
  const skills = f.skills ?? [f.skill ?? source];
  return {
    severity,
    category,
    file: f.file,
    line,
    rule,
    evidence: String(f.evidence ?? '').trim(),
    fix: String(f.fix ?? '').trim(),
    tag: f.tag ?? 'introduced',
    skills,
    mechId: f.skill === 'mechanical' ? f.id : undefined,
    cached: Boolean(f.cached),
    key: f.skill === 'mechanical' ? sha256('mech', f.id.replace(/-\d+$/, ''), f.file) : sha256(f.file, category, rule.toLowerCase()),
  };
}

function rank(s) {
  return SEVERITIES.indexOf(s);
}

const STRUCTURAL = ['layering', 'boundary'];

function absorbMechanical(list) {
  const skillFindings = list.filter((f) => !f.mechId);
  const rest = [];
  for (const f of list) {
    const isMigration = f.mechId?.startsWith('MECH-MIGRATION');
    if (!f.mechId || (!STRUCTURAL.includes(f.category) && !isMigration)) {
      rest.push(f);
      continue;
    }
    const twin = skillFindings.find(
      (s) =>
        s.file === f.file &&
        (isMigration ? /migrat/i.test(`${s.rule} ${s.evidence} ${s.fix}`) : STRUCTURAL.includes(s.category)),
    );
    if (!twin) {
      rest.push(f);
      continue;
    }
    twin.skills = [...new Set([...twin.skills, isMigration ? 'migration-check' : 'lint:arch'])];
    twin.confirmedBy = f.mechId;
    if (rank(f.severity) < rank(twin.severity)) twin.severity = f.severity;
    twin.evidence = `${twin.evidence}\n${f.evidence}`.trim();
  }
  return rest;
}

function dedupe(list) {
  const merged = [];
  for (const f of list) {
    const standalone = (x) => x.mechId || x.skills.includes('api-contract');
    const twin = merged.find(
      (m) =>
        !standalone(m) &&
        !standalone(f) &&
        m.file === f.file &&
        m.category === f.category &&
        (m.line === null || f.line === null ? m.line === f.line : Math.abs(m.line - f.line) <= 3),
    );
    if (!twin) {
      merged.push({ ...f });
      continue;
    }
    twin.skills = [...new Set([...twin.skills, ...f.skills])];
    if (rank(f.severity) < rank(twin.severity)) {
      Object.assign(twin, { severity: f.severity, rule: f.rule, evidence: f.evidence, fix: f.fix, key: f.key, tag: f.tag, line: f.line });
    }
    twin.cached = twin.cached && f.cached;
  }
  return absorbMechanical(merged);
}

function verifyCacheKey(f) {
  return sha256(f.key, String(f.line), readIfExists(join(root, f.file)));
}

function aggregate() {
  const plan = readJson(join(out, 'plan.json'));
  const mech = readJson(join(out, 'mech.json'), { findings: [], checks: [] });
  const raw = [...plan.cachedFindings.map((f) => normalize(f, f.skill))];
  const dir = join(out, 'findings');
  const problems = [];
  const reported = new Set();
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      const data = readJson(join(dir, name));
      reported.add(data.skill);
      for (const f of data.findings ?? []) {
        if (!f.file) {
          problems.push(`${name}: finding without file`);
          continue;
        }
        raw.push(normalize({ ...f, skill: data.skill }, data.skill));
      }
    }
  }
  for (const [skill, v] of Object.entries(plan.skills)) {
    if (v.review.length && !reported.has(skill)) problems.push(`no findings file from ${skill} (expected run/findings/${skill}.json)`);
  }
  raw.push(...mech.findings.map((f) => normalize(f, 'mechanical')));

  const findings = dedupe(raw).sort((a, b) => rank(a.severity) - rank(b.severity) || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
  const counters = { critical: 0, major: 0, minor: 0 };
  for (const f of findings) {
    counters[f.severity] += 1;
    f.id = `${PREFIX[f.severity]}${counters[f.severity]}`;
    if (f.severity === 'critical' && !f.mechId && !f.confirmedBy) {
      const cachedVerdict = join(verifyCacheDir, `${verifyCacheKey(f)}.json`);
      f.verification = existsSync(cachedVerdict) ? { ...readJson(cachedVerdict), cached: true } : null;
    }
  }
  writeJson(join(out, 'report.json'), { findings, problems });
  const pending = findings.filter((f) => f.severity === 'critical' && !f.mechId && !f.confirmedBy && !f.verification);
  console.log(
    JSON.stringify(
      {
        counts: counters,
        problems,
        needsVerification: pending.map((f) => ({ id: f.id, file: f.file, line: f.line, rule: f.rule, evidence: f.evidence, skills: f.skills })),
      },
      null,
      2,
    ),
  );
  if (problems.length) process.exitCode = 13;
}

function verify() {
  const [id, verdict, ...reasonParts] = args;
  const reason = reasonParts.join(' ').trim();
  if (!id || !['CONFIRMED', 'REJECTED'].includes(verdict) || !reason) {
    console.error('usage: report.mjs verify <id> CONFIRMED|REJECTED <reason>');
    process.exit(1);
  }
  const report = readJson(join(out, 'report.json'));
  const f = report.findings.find((x) => x.id === id);
  if (!f) {
    console.error(`no finding ${id}`);
    process.exit(1);
  }
  f.verification = { verdict, reason, at: new Date().toISOString() };
  writeJson(join(verifyCacheDir, `${verifyCacheKey(f)}.json`), f.verification);
  writeJson(join(out, 'report.json'), report);
  console.log(`${id}: ${verdict}`);
}

function evaluate(report, waivers) {
  const findings = report.findings.map((f) => ({ ...f }));
  for (const f of findings) {
    if (f.verification?.verdict === 'REJECTED') {
      f.falsePositive = f.verification.reason;
      f.severity = 'major';
    }
    const w = waivers.find((x) => x.key === f.key);
    if (w) f.waived = w.reason;
  }
  const blocking = findings.filter((f) => f.severity === 'critical' && !f.waived);
  return { findings, blocking };
}

function render(v) {
  const L = [];
  const short = v.fingerprint.slice(0, 12);
  L.push(`## PR self-review — ${v.verdict}`);
  L.push('');
  L.push(`Base \`${v.base}\` @ \`${v.mergeBase.slice(0, 8)}\` · ${v.totals.files} files · ${v.totals.changedLines} lines · fingerprint \`${short}\``);
  if (v.largeDiff) L.push(`Large diff reviewed with --force-large.`);
  L.push('');
  L.push(`Skills: ${Object.entries(v.skillsRun).map(([s, x]) => `${s} (${x.review} reviewed, ${x.cached} cached)`).join(', ') || 'none'}`);
  L.push(`Mechanical: ${v.checks.map((c) => `${c.name} ${c.status}`).join(', ') || 'none needed'}`);
  if (v.stale) L.push('', '**STALE**: the working tree changed during the review. Re-run the review.');
  if (v.problems.length) L.push('', `**Incomplete review**: ${v.problems.join('; ')}`);

  const active = v.findings.filter((f) => !f.waived && !f.falsePositive);
  let n = 0;
  for (const sev of SEVERITIES) {
    const group = active.filter((f) => f.severity === sev);
    if (!group.length) continue;
    L.push('', `### ${sev[0].toUpperCase() + sev.slice(1)} (${group.length})`);
    for (const f of group) {
      n += 1;
      const loc = f.line ? `${f.file}:${f.line}` : f.file;
      const unverified = sev === 'critical' && !f.mechId && !f.confirmedBy && !f.verification ? ' _(unverified)_' : '';
      L.push(`${n}. **${f.id}** [${f.skills.join(', ')}] \`${loc}\` — ${f.rule}${unverified}`);
      if (f.evidence) L.push(`   Evidence: ${f.evidence.split('\n').join('\n   ')}`);
      if (f.fix) L.push(`   Fix: ${f.fix}`);
    }
  }
  const fps = v.findings.filter((f) => f.falsePositive);
  if (fps.length) {
    L.push('', '### False positives (verifier rejected)');
    for (const f of fps) L.push(`- ${f.id} \`${f.file}${f.line ? ':' + f.line : ''}\` — ${f.rule}. Verifier: ${f.falsePositive}`);
  }
  const waived = v.findings.filter((f) => f.waived);
  if (waived.length) {
    L.push('', '### Waived');
    for (const f of waived) L.push(`- ${f.id} \`${f.file}\` — ${f.rule}. Reason: ${f.waived}`);
  }
  if (v.unreviewed.length) L.push('', `### Not covered by any skill`, ...v.unreviewed.map((p) => `- ${p}`));
  L.push('', '### PR description block', '', '```markdown', v.prSection, '```');
  return L.join('\n');
}

function prSection(v) {
  const L = ['## Self-review', '', `Verdict: **${v.verdict}** (fingerprint \`${v.fingerprint.slice(0, 12)}\`)`];
  const c = v.counts;
  L.push(`Findings: ${c.critical} critical, ${c.major} major, ${c.minor} minor`);
  const waived = v.findings.filter((f) => f.waived);
  if (waived.length) {
    L.push('', '### Self-review waivers');
    for (const f of waived) L.push(`- ${f.id} \`${f.file}\` — ${f.rule}. Reason: ${f.waived}`);
  }
  return L.join('\n');
}

function finalize() {
  const diff = readJson(join(out, 'diff.json'));
  const plan = readJson(join(out, 'plan.json'));
  const route = readJson(join(out, 'route.json'));
  const mech = readJson(join(out, 'mech.json'), { checks: [], findings: [] });
  const report = readJson(join(out, 'report.json'));
  const waivers = readJson(waiversPath, []);
  const { findings, blocking } = evaluate(report, waivers);
  const current = computeFingerprint(root, diff.mergeBase);
  const stale = current !== diff.fingerprint;
  const counts = { critical: 0, major: 0, minor: 0 };
  for (const f of findings) if (!f.waived && !f.falsePositive) counts[f.severity] += 1;
  const verdict = stale || report.problems.length ? 'INCOMPLETE' : blocking.length ? 'BLOCK' : 'PASS';
  const v = {
    verdict,
    fingerprint: diff.fingerprint,
    base: diff.base,
    mergeBase: diff.mergeBase,
    createdAt: new Date().toISOString(),
    totals: diff.totals,
    largeDiff: Boolean(diff.sizeLimitExceeded && diff.forceLarge),
    stale,
    problems: report.problems,
    skillsRun: Object.fromEntries(Object.entries(plan.skills).map(([s, x]) => [s, { review: x.review.length, cached: x.cached.length }])),
    checks: mech.checks,
    unreviewed: route.unreviewed,
    counts,
    blocking: blocking.map((f) => f.id),
    findings,
  };
  v.prSection = prSection(v);
  writeJson(verdictPath, v);
  console.log(render(v));
  if (verdict !== 'PASS') process.exitCode = 20;
}

function waive() {
  const [id, ...reasonParts] = args;
  const reason = reasonParts.join(' ').trim();
  if (!id || reason.length < 10) {
    console.error('usage: report.mjs waive <id> <reason of at least 10 characters>');
    process.exit(1);
  }
  const report = readJson(join(out, 'report.json'));
  const f = report.findings.find((x) => x.id === id);
  if (!f) {
    console.error(`no finding ${id} in the current run`);
    process.exit(1);
  }
  const waivers = readJson(waiversPath, []).filter((w) => w.key !== f.key);
  waivers.push({ key: f.key, id, file: f.file, rule: f.rule, reason, waivedAt: new Date().toISOString() });
  writeJson(waiversPath, waivers);
  finalize();
}

const commands = { aggregate, verify, finalize, waive };
if (!commands[command]) {
  console.error('usage: report.mjs aggregate | verify <id> CONFIRMED|REJECTED <reason> | finalize | waive <id> <reason>');
  process.exit(1);
}
commands[command]();
