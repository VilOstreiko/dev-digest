"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, SEV } from "@devdigest/ui";
import type { PrFindingPreview } from "@devdigest/shared";
import { countBySeverity } from "@/lib/severity";
import { FindingsHoverCard } from "./FindingsHoverCard";
import { CLOSE_DELAY_MS } from "./constants";
import { cardPosition } from "./helpers";
import { s } from "./styles";

export function SeverityCounters({ findings }: { findings: readonly PrFindingPreview[] }) {
  const t = useTranslations("prReview");
  const cardId = React.useId();
  const [position, setPosition] = React.useState<React.CSSProperties | null>(null);
  const anchorRef = React.useRef<HTMLSpanElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = React.useRef(false);
  const counts = countBySeverity(findings);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const show = () => {
    cancelClose();
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(cardPosition(rect, { width: window.innerWidth, height: window.innerHeight }));
  };
  const hide = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setPosition(null), CLOSE_DELAY_MS);
  };
  const pointerEnter = () => {
    hovered.current = true;
    if (position) cancelClose();
    else show();
  };
  const pointerLeave = () => {
    hovered.current = false;
    if (document.activeElement !== anchorRef.current) hide();
  };
  const blur = () => {
    if (!hovered.current) hide();
  };
  React.useEffect(() => cancelClose, []);
  React.useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const closeOnOuterScroll = (e: Event) => {
      if (e.target instanceof Node && cardRef.current?.contains(e.target)) return;
      close();
    };
    window.addEventListener("scroll", closeOnOuterScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", closeOnOuterScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  if (counts.length === 0) return null;
  const label = counts
    .map((c) =>
      t("severityCount", { count: c.count, label: t(`severity.${c.severity.toLowerCase()}`) }),
    )
    .join(", ");

  return (
    <span
      style={s.root}
      onMouseEnter={pointerEnter}
      onMouseLeave={pointerLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        ref={anchorRef}
        tabIndex={0}
        aria-label={label}
        aria-describedby={position ? cardId : undefined}
        style={s.counters}
        onFocus={show}
        onBlur={blur}
        onKeyDown={(e) => {
          if (e.key === "Escape") setPosition(null);
        }}
      >
        {counts.map(({ severity, count }) => {
          const I = Icon[SEV[severity].icon];
          return (
            <span key={severity} data-severity={severity} style={s.counter(SEV[severity].c)}>
              <I size={13} />
              <span className="tnum">{count}</span>
            </span>
          );
        })}
      </span>
      {position && (
        <FindingsHoverCard
          id={cardId}
          findings={findings}
          position={position}
          cardRef={cardRef}
          onMouseEnter={pointerEnter}
          onMouseLeave={pointerLeave}
        />
      )}
    </span>
  );
}
