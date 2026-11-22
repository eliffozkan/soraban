/** Keep normalized server input consistent with the authoritative SQL setter. */
export function normalizeNickname(value: unknown): string | null {
  if (typeof value !== "string" || new TextEncoder().encode(value).length > 256) return null;
  const name = value.normalize("NFC").trim().replace(/\s+/g, " ");
  const length = Array.from(name).length;
  return length >= 3 && length <= 20 && /^[\p{L}\p{N} _.-]+$/u.test(name) && /\p{L}/u.test(name) ? name : null;
}
