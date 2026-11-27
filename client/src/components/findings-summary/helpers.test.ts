import { describe, it, expect } from "vitest";
import { cardPosition } from "./helpers";

const viewport = { width: 1400, height: 900 };

describe("cardPosition", () => {
  it("opens below the counters when there is room", () => {
    expect(cardPosition({ left: 200, top: 100, bottom: 120 }, viewport)).toEqual({ left: 200, top: 126, maxHeight: 420 });
  });

  it("opens above the counters near the bottom of the viewport", () => {
    expect(cardPosition({ left: 200, top: 800, bottom: 820 }, viewport)).toEqual({ left: 200, bottom: 106, maxHeight: 420 });
  });

  it("stays inside the right edge of the viewport", () => {
    expect(cardPosition({ left: 1300, top: 100, bottom: 120 }, viewport).left).toBe(964);
  });
});
