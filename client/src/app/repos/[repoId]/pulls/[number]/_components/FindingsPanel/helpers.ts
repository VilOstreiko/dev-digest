import type { FindingRecord, Severity } from "@devdigest/shared";
import { countBySeverity, sortBySeverity } from "../../../../../../../lib/severity";
import { LOW_CONFIDENCE_THRESHOLD } from "./constants";

export function confidentFindings(findings: FindingRecord[], hideLow: boolean): FindingRecord[] {
  return hideLow ? findings.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD) : findings;
}

export function severityPillCounts(
  findings: FindingRecord[],
  hideLow: boolean,
): { severity: Severity; count: number }[] {
  const confident = confidentFindings(findings, hideLow);
  return countBySeverity(findings).map(({ severity }) => ({
    severity,
    count: confident.filter((f) => f.severity === severity).length,
  }));
}

/** Optionally drop low-confidence findings, keep one severity, and sort by severity. */
export function visibleFindings(
  findings: FindingRecord[],
  hideLow: boolean,
  severity: Severity | null = null,
): FindingRecord[] {
  let shown = confidentFindings(findings, hideLow);
  if (severity) shown = shown.filter((f) => f.severity === severity);
  return sortBySeverity(shown);
}
