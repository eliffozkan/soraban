/** Keep normalized server input consistent with the authoritative SQL setter. */
export function normalizeNickname(value: unknown): string | null {
  if (typeof value !== "string" || new TextEncoder().encode(value).length > 256 || /[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const name = value.normalize("NFKC").replace(/ +/g, " ").trim();
  return /^[A-Za-zÇĞİÖŞÜçğıöşü0-9][A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]{1,23}$/.test(name) ? name : null;
}
