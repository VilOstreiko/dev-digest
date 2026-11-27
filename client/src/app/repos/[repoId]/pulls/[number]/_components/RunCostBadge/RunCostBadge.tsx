"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { formatCost, formatTokenCount } from "@/lib/format-cost";
import { formatTokens } from "../RunTraceDrawer/helpers";
import { s } from "./styles";

export type RunCostBadgeVariant = "compact" | "full";

export function RunCostBadge({
  variant,
  costUsd,
  tokensIn,
  tokensOut,
}: {
  variant: RunCostBadgeVariant;
  costUsd: number | null | undefined;
  tokensIn: number | null | undefined;
  tokensOut: number | null | undefined;
}) {
  const t = useTranslations("prReview");
  const tokens = tokensIn != null && tokensOut != null && tokensIn + tokensOut > 0 ? { tokensIn, tokensOut } : null;
  if (!tokens && costUsd == null) return null;

  const cost = formatCost(costUsd);
  let text = cost;
  if (tokens && variant === "compact") {
    text = `${t("cost.tokens", { count: formatTokenCount(tokens.tokensIn + tokens.tokensOut) })} · ${cost}`;
  } else if (tokens) {
    text = `${cost} · ${formatTokens(tokens.tokensIn, tokens.tokensOut)}`;
  }

  return (
    <span className="mono tnum" style={s[variant]} data-testid="run-cost-badge">
      {text}
    </span>
  );
}
