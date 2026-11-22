import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { FindingsPanel } from "./FindingsPanel";

afterEach(cleanup);

const FINDINGS: FindingRecord[] = [
  {
    id: "f1",
    severity: "CRITICAL",
    category: "security",
    title: "Hardcoded secret",
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    rationale: "A secret is committed.",
    suggestion: null,
    confidence: 0.95,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FindingsPanel (smoke)", () => {
  it("renders the toolbar + a finding card", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    expect(screen.getByText("Hide low confidence")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded secret")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });
});

function rec(o: Partial<FindingRecord>): FindingRecord {
  return { ...FINDINGS[0]!, ...o };
}

const MIXED: FindingRecord[] = [
  rec({ id: "c1", severity: "CRITICAL", title: "Unauthenticated endpoints", confidence: 0.95 }),
  rec({ id: "w1", severity: "WARNING", title: "Inclusive date range", confidence: 0.85 }),
  rec({ id: "w2", severity: "WARNING", title: "Rounding drift", confidence: 0.4 }),
];

function pill(name: RegExp) {
  return screen.getByRole("button", { name });
}

describe("FindingsPanel — severity pills", () => {
  it("shows a pill only for severities that have findings, highest first", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    const pills = screen.getAllByRole("button", { pressed: false });
    expect(pills.map((p) => p.getAttribute("data-severity"))).toEqual(["CRITICAL", "WARNING"]);
    expect(pill(/1\s*Critical/)).toBeInTheDocument();
    expect(pill(/2\s*Warning/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Suggestion/ })).not.toBeInTheDocument();
  });

  it("shows no pills when there are no findings", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.queryByRole("group", { name: "Filter by severity" })).not.toBeInTheDocument();
  });

  it("selecting a pill keeps only that severity", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(pill(/Warning/));
    expect(pill(/Warning/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Unauthenticated endpoints")).not.toBeInTheDocument();
    expect(screen.getByText("Inclusive date range")).toBeInTheDocument();
    expect(screen.getByText("Rounding drift")).toBeInTheDocument();
  });

  it("selecting another pill switches the filter (single choice)", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(pill(/Warning/));
    fireEvent.click(pill(/Critical/));
    expect(pill(/Critical/)).toHaveAttribute("aria-pressed", "true");
    expect(pill(/Warning/)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Unauthenticated endpoints")).toBeInTheDocument();
    expect(screen.queryByText("Inclusive date range")).not.toBeInTheDocument();
  });

  it("clicking the selected pill again removes the filter", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(pill(/Critical/));
    fireEvent.click(pill(/Critical/));
    expect(pill(/Critical/)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Unauthenticated endpoints")).toBeInTheDocument();
    expect(screen.getByText("Inclusive date range")).toBeInTheDocument();
  });

  it("combines with Hide low confidence: only findings passing both stay", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(pill(/Warning/));
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Inclusive date range")).toBeInTheDocument();
    expect(screen.queryByText("Rounding drift")).not.toBeInTheDocument();
    expect(screen.queryByText("Unauthenticated endpoints")).not.toBeInTheDocument();
  });

  it("pill counts follow Hide low confidence, not the severity filter", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(pill(/Critical/));
    expect(pill(/2\s*Warning/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    expect(pill(/1\s*Warning/)).toBeInTheDocument();
    expect(pill(/1\s*Critical/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    expect(pill(/2\s*Warning/)).toBeInTheDocument();
  });

  it("keeps a pill at 0 and its selection when Hide low confidence hides all of its findings", () => {
    const findings = [
      rec({ id: "c1", severity: "CRITICAL", title: "Unauthenticated endpoints", confidence: 0.95 }),
      rec({ id: "w2", severity: "WARNING", title: "Rounding drift", confidence: 0.4 }),
    ];
    renderWithIntl(<FindingsPanel findings={findings} prId="pr1" />);
    fireEvent.click(pill(/Warning/));
    fireEvent.click(screen.getByRole("switch"));
    expect(pill(/0\s*Warning/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });

  it("switching filters logs no React style warning", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(pill(/Warning/));
    fireEvent.click(pill(/Critical/));
    fireEvent.click(pill(/Critical/));
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("paints the selected pill in its severity colour", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(pill(/Critical/));
    expect(pill(/Critical/)).toHaveStyle({ color: "var(--crit)", background: "var(--crit-bg)" });
  });
});
