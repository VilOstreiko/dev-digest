import { describe, it, expect } from "vitest";
import { countBySeverity, sortBySeverity } from "./severity";

describe("countBySeverity", () => {
  it("counts each severity from highest to lowest and drops empty levels", () => {
    const counts = countBySeverity([
      { severity: "SUGGESTION" },
      { severity: "CRITICAL" },
      { severity: "SUGGESTION" },
    ]);
    expect(counts).toEqual([
      { severity: "CRITICAL", count: 1 },
      { severity: "SUGGESTION", count: 2 },
    ]);
  });

  it("returns no levels for no findings", () => {
    expect(countBySeverity([])).toEqual([]);
  });
});

describe("sortBySeverity", () => {
  it("orders findings from highest to lowest severity and keeps ties stable", () => {
    const sorted = sortBySeverity([
      { id: "a", severity: "SUGGESTION" },
      { id: "b", severity: "WARNING" },
      { id: "c", severity: "CRITICAL" },
      { id: "d", severity: "WARNING" },
    ]);
    expect(sorted.map((f) => f.id)).toEqual(["c", "b", "d", "a"]);
  });
});
