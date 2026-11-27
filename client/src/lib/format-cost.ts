const MIN_SHOWN_USD = 0.0001;

export function formatCost(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return "—";
  if (usd === 0) return "$0";
  if (usd < MIN_SHOWN_USD) return "<$0.0001";
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${Number(usd.toPrecision(2))}`;
}

export function formatTokenCount(count: number): string {
  return count.toLocaleString("en-US");
}
