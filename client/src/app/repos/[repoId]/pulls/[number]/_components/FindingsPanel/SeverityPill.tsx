"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, SEV, type Severity } from "@devdigest/ui";
import { s } from "./styles";

export function SeverityPill({
  severity,
  count,
  selected,
  onClick,
}: {
  severity: Severity;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("prReview");
  const sev = SEV[severity];
  const I = Icon[sev.icon];
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-severity={severity}
      onClick={onClick}
      style={s.pill(selected, sev.c, sev.bg)}
    >
      <I size={13} style={{ color: sev.c }} />
      <span className="tnum">{count}</span>
      {t(`severity.${severity.toLowerCase()}`)}
    </button>
  );
}
