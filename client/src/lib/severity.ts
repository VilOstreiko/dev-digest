import type { Severity } from "@devdigest/shared";

const SEVERITY_RANK = {
  CRITICAL: 0,
  WARNING: 1,
  SUGGESTION: 2,
} as const satisfies Record<Severity, number>;

export const SEVERITIES = (Object.keys(SEVERITY_RANK) as Severity[]).sort(
  (a, b) => SEVERITY_RANK[a] - SEVERITY_RANK[b],
);

export function sortBySeverity<T extends { severity: Severity }>(findings: readonly T[]): T[] {
  return [...findings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function countBySeverity(
  findings: readonly { severity: Severity }[],
): { severity: Severity; count: number }[] {
  return SEVERITIES.map((severity) => ({
    severity,
    count: findings.filter((f) => f.severity === severity).length,
  })).filter((c) => c.count > 0);
}
