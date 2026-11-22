/** Display-only Turkish number formatting. Never feeds back into game logic. */
export function formatNumber(value: number, maximumFractionDigits = 3): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits }).format(value);
}

/** Returns the URL only if it is an absolute http(s) link; otherwise null. */
export function safeExternalUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
