import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrFindingPreview } from "@devdigest/shared";
import messages from "../../../messages/en/prReview.json";
import { SeverityCounters } from "./SeverityCounters";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function finding(o: Partial<PrFindingPreview>): PrFindingPreview {
  return {
    id: "f",
    severity: "WARNING",
    category: "bug",
    title: "A finding",
    file: "src/a.ts",
    start_line: 1,
    end_line: 1,
    confidence: 0.9,
    rationale: "Because.",
    ...o,
  };
}

const FINDINGS: PrFindingPreview[] = [
  finding({ id: "s1", severity: "SUGGESTION", title: "Extract magic number" }),
  finding({ id: "w1", severity: "WARNING", title: "N+1 query" }),
  finding({ id: "c1", severity: "CRITICAL", title: "Hardcoded secret", start_line: 12, end_line: 14 }),
  finding({ id: "s2", severity: "SUGGESTION", title: "Rename variable" }),
];

function renderCounters(findings: PrFindingPreview[], onParentClick = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <div onClick={onParentClick}>
        <SeverityCounters findings={findings} />
      </div>
    </NextIntlClientProvider>,
  );
  return onParentClick;
}

describe("SeverityCounters", () => {
  it("shows one counter per present severity, from highest to lowest", () => {
    renderCounters(FINDINGS);
    const trigger = screen.getByLabelText("1 Critical, 1 Warning, 2 Suggestion");
    const counters = trigger.querySelectorAll("[data-severity]");
    expect([...counters].map((c) => c.getAttribute("data-severity"))).toEqual([
      "CRITICAL",
      "WARNING",
      "SUGGESTION",
    ]);
    expect([...counters].map((c) => c.textContent)).toEqual(["1", "1", "2"]);
  });

  it("skips severities that have no findings", () => {
    renderCounters([finding({ id: "c1", severity: "CRITICAL" }), finding({ id: "s1", severity: "SUGGESTION" })]);
    const trigger = screen.getByLabelText("1 Critical, 1 Suggestion");
    expect(trigger.querySelector('[data-severity="WARNING"]')).toBeNull();
  });

  it("uses a help cursor on the counters", () => {
    renderCounters(FINDINGS);
    expect(screen.getByLabelText(/Critical/)).toHaveStyle({ cursor: "help" });
  });

  it("on hover lists every finding sorted from highest to lowest severity", () => {
    renderCounters(FINDINGS);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByLabelText(/Critical/));
    const card = screen.getByRole("tooltip");
    expect(within(card).getByText("4 findings")).toBeInTheDocument();
    const titles = ["Hardcoded secret", "N+1 query", "Extract magic number", "Rename variable"];
    const positions = titles.map((title) => card.textContent!.indexOf(title));
    expect(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]!))).toBe(true);
    expect(within(card).getByText("src/a.ts:12-14")).toBeInTheDocument();
  });

  it("stays open while the list itself scrolls, and closes when the page scrolls", () => {
    renderCounters(FINDINGS);
    fireEvent.mouseEnter(screen.getByLabelText(/Critical/));
    const card = screen.getByRole("tooltip");
    fireEvent.scroll(card);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("stays open when focus leaves the counters while the pointer is on the list", () => {
    vi.useFakeTimers();
    try {
      renderCounters(FINDINGS);
      const trigger = screen.getByLabelText(/Critical/);
      fireEvent.mouseEnter(trigger);
      fireEvent.focus(trigger);
      fireEvent.mouseEnter(screen.getByRole("tooltip"));
      fireEvent.blur(trigger);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens on keyboard focus too", () => {
    renderCounters(FINDINGS);
    fireEvent.focus(screen.getByLabelText(/Critical/));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("a click does not bubble to the row and sends no request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const onParentClick = renderCounters(FINDINGS);
    fireEvent.click(screen.getByLabelText(/Critical/));
    expect(onParentClick).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders nothing without findings", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
        <SeverityCounters findings={[]} />
      </NextIntlClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
