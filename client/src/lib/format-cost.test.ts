import { describe, it, expect } from "vitest";
import { formatCost, formatTokenCount } from "./format-cost";

describe("formatCost", () => {
  it("renders missing cost as a dash, never $0.00", () => {
    expect(formatCost(null)).toBe("—");
    expect(formatCost(undefined)).toBe("—");
    expect(formatCost(Number.NaN)).toBe("—");
  });

  it("keeps two significant digits below a dollar", () => {
    expect(formatCost(0.014)).toBe("$0.014");
    expect(formatCost(0.00132)).toBe("$0.0013");
    expect(formatCost(0.06)).toBe("$0.06");
    expect(formatCost(0.0417)).toBe("$0.042");
  });

  it("uses cents from a dollar up", () => {
    expect(formatCost(1)).toBe("$1.00");
    expect(formatCost(12.345)).toBe("$12.35");
  });

  it("handles zero and sub-0.0001 amounts", () => {
    expect(formatCost(0)).toBe("$0");
    expect(formatCost(0.00001)).toBe("<$0.0001");
  });
});

describe("formatTokenCount", () => {
  it("groups thousands", () => {
    expect(formatTokenCount(9119)).toBe("9,119");
    expect(formatTokenCount(512)).toBe("512");
  });
});
