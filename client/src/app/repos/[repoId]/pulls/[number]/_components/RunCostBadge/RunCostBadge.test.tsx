import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/en/prReview.json";
import { RunCostBadge } from "./RunCostBadge";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("RunCostBadge", () => {
  it("compact: total tokens and cost", () => {
    renderWithIntl(<RunCostBadge variant="compact" costUsd={0.0013} tokensIn={8000} tokensOut={1119} />);
    expect(screen.getByText("9,119 tok · $0.0013")).toBeInTheDocument();
  });

  it("full: cost then in→out tokens", () => {
    renderWithIntl(<RunCostBadge variant="full" costUsd={0.014} tokensIn={8200} tokensOut={1300} />);
    expect(screen.getByText("$0.014 · 8k→1.3k")).toBeInTheDocument();
  });

  it("shows a dash for unknown cost when tokens exist", () => {
    renderWithIntl(<RunCostBadge variant="compact" costUsd={null} tokensIn={100} tokensOut={50} />);
    expect(screen.getByText("150 tok · —")).toBeInTheDocument();
  });

  it("renders nothing without tokens or cost", () => {
    renderWithIntl(<RunCostBadge variant="compact" costUsd={null} tokensIn={0} tokensOut={0} />);
    expect(screen.queryByTestId("run-cost-badge")).toBeNull();
  });
});
