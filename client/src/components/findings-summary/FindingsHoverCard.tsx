"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Icon, SeverityBadge, CategoryTag, ConfidenceNum } from "@devdigest/ui";
import type { PrFindingPreview } from "@devdigest/shared";
import { sortBySeverity } from "@/lib/severity";
import { lineLabel } from "@/lib/finding-location";
import { s } from "./styles";

export function FindingsHoverCard({
  id,
  findings,
  position,
  cardRef,
  onMouseEnter,
  onMouseLeave,
}: {
  id?: string;
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
      id={id}
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
          <SeverityBadge severity={f.severity} compact />
          <div style={s.itemBody}>
            <div style={s.itemHeader}>
              <span style={s.itemTitle}>{f.title}</span>
              <CategoryTag category={f.category} />
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
