import type { CSSProperties } from "react";
import { CARD_GAP, CARD_MAX_HEIGHT, CARD_WIDTH, VIEWPORT_MARGIN } from "./constants";

export function cardPosition(
  anchor: Pick<DOMRect, "left" | "top" | "bottom">,
  viewport: { width: number; height: number },
): CSSProperties {
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchor.left, viewport.width - CARD_WIDTH - VIEWPORT_MARGIN),
  );
  const roomBelow = viewport.height - anchor.bottom - CARD_GAP - VIEWPORT_MARGIN;
  const roomAbove = anchor.top - CARD_GAP - VIEWPORT_MARGIN;
  if (roomBelow >= CARD_MAX_HEIGHT || roomBelow >= roomAbove) {
    return { left, top: anchor.bottom + CARD_GAP, maxHeight: Math.min(CARD_MAX_HEIGHT, roomBelow) };
  }
  return {
    left,
    bottom: viewport.height - anchor.top + CARD_GAP,
    maxHeight: Math.min(CARD_MAX_HEIGHT, roomAbove),
  };
}
