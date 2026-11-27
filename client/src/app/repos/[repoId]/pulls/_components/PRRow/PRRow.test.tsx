import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta, PrFindingPreview } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/prReview.json";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { PRRow } from "./PRRow";

afterEach(() => {
  cleanup();
  push.mockReset();
});

const FINDING: PrFindingPreview = {
  id: "f1",
  severity: "WARNING",
  category: "perf",
  title: "N+1 query",
  file: "src/api/users.ts",
  start_line: 45,
  end_line: 52,
  confidence: 0.86,
  rationale: "One query per user.",
};

function pr(o: Partial<PrMeta>): PrMeta {
  return {
    id: "pr-1",
    number: 482,
    title: "Add rate limiting",
    author: "marisa.koch",
    branch: "feat/rl",
    base: "main",
    head_sha: "a1b2c3d4",
    additions: 200,
    deletions: 85,
    files_count: 9,
    status: "needs_review",
    opened_at: null,
    updated_at: null,
    score: 61,
    cost_usd: null,
    findings: null,
    ...o,
  };
}

function renderRow(p: PrMeta) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <PRRow pr={p} repoId="repo-1" />
    </NextIntlClientProvider>,
  );
}

describe("PRRow — findings column", () => {
  it("shows a muted dash when the PR was never reviewed", () => {
    renderRow(pr({ score: null, findings: null }));
    expect(screen.queryByLabelText(/Warning/)).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows a muted dash when the review found nothing", () => {
    renderRow(pr({ findings: [] }));
    expect(screen.queryByLabelText(/Warning/)).not.toBeInTheDocument();
  });

  it("shows severity counters when there are findings", () => {
    renderRow(pr({ findings: [FINDING] }));
    expect(screen.getByLabelText("1 Warning")).toBeInTheDocument();
  });

  it("clicking the counters does not open the PR, clicking the row does", () => {
    renderRow(pr({ findings: [FINDING] }));
    fireEvent.click(screen.getByLabelText("1 Warning"));
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Add rate limiting"));
    expect(push).toHaveBeenCalledWith("/repos/repo-1/pulls/482");
  });
});
