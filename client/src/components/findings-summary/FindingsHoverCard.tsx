"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  Icon,
  SeverityBadge,
  CategoryTag,
  ConfidenceNum,
  type Severity,
  type Category,
} from "@devdigest/ui";
import type { PrFindingPreview } from "@devdigest/shared";
import { sortBySeverity } from "@/lib/severity";
import { s } from "./styles";

function lineLabel(f: PrFindingPreview): string {
  return f.start_line === f.end_line ? `${f.start_line}` : `${f.start_line}-${f.end_line}`;
}

export function FindingsHoverCard({
  findings,
  position,
  cardRef,
  onMouseEnter,
  onMouseLeave,
}: {
  findings: readonly PrFindingPreview[];
  position: React.CSSProperties;
  cardRef?: React.Ref<HTMLDivElement>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const t = useTranslations("prReview");
  const sorted = sortBySeverity(findings);
  return createPortal(
    <div
      ref={cardRef}
      role="tooltip"
      style={{ ...s.card, ...position }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={s.cardTitle}>
        <Icon.Info size={13} />
        {t("findingsHover.title", { count: findings.length })}
      </div>
      {sorted.map((f, i) => (
        <div key={f.id} style={s.item(i === 0)}>
          <SeverityBadge severity={f.severity as Severity} compact />
          <div style={s.itemBody}>
            <div style={s.itemHeader}>
              <span style={s.itemTitle}>{f.title}</span>
              <CategoryTag category={f.category as Category} />
            </div>
            <div style={s.itemMeta}>
              <span className="mono" style={s.itemFile}>
                {f.file}:{lineLabel(f)}
              </span>
              <ConfidenceNum value={f.confidence} />
            </div>
            <div style={s.itemRationale}>{f.rationale}</div>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
