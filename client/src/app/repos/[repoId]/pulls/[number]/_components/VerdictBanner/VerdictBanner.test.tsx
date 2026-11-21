import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/en/prReview.json";
import type { RunSummary } from "@devdigest/shared";
import { VerdictBanner } from "./VerdictBanner";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("VerdictBanner (smoke)", () => {
  it("shows verdict label + score + finding/blocker counts", () => {
    renderWithIntl(
      <VerdictBanner
        verdict="request_changes"
        summary="Hardcoded secret introduced."
        score={42}
        findingsCount={1}
        blockers={1}
        agentName="Security Reviewer"
      />,
    );
    expect(screen.getByText("Request changes")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/1 findings · 1 blockers/)).toBeInTheDocument();
  });
});

describe("VerdictBanner — run cost", () => {
  const RUN: RunSummary = {
    run_id: "run-1",
    agent_id: "a1",
    agent_name: "Security Reviewer",
    provider: "openrouter",
    model: "deepseek/deepseek-v4-flash",
    status: "done",
    error: null,
    duration_ms: 8200,
    tokens_in: 8200,
    tokens_out: 1300,
    cost_usd: 0.014,
    findings_count: 1,
    grounding: "1/1 passed",
    ran_at: "2026-06-11T18:44:34.000Z",
    score: 42,
    blockers: 1,
  };

  it("shows cost and tokens of the review's run", () => {
    renderWithIntl(
      <VerdictBanner verdict="comment" summary={null} score={42} findingsCount={1} blockers={0} run={RUN} />,
    );
    expect(screen.getByText("$0.014 · 8k→1.3k")).toBeInTheDocument();
  });

  it("renders no cost line without a run", () => {
    renderWithIntl(<VerdictBanner verdict="comment" summary={null} score={42} findingsCount={1} blockers={0} />);
    expect(screen.queryByTestId("run-cost-badge")).toBeNull();
  });
});
