/**
 * Takma ad kuralları (istemci tarafı ön kontrol). Asıl kontrol ve uygunsuz
 * kelime filtresi SUNUCUDADIR; buradaki kontrol yalnızca kullanıcıya hızlı geri
 * bildirim içindir. Takma ad isteğe bağlıdır, gerçek ad istenmez.
 */

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;

export type NicknameProblem = "too-short" | "too-long" | "bad-chars" | "no-letter";

export type NicknameCheck = { ok: true; value: string } | { ok: false; reason: NicknameProblem };

export const NICKNAME_PROBLEM_MESSAGES: Record<NicknameProblem, string> = {
  "too-short": `En az ${NICKNAME_MIN_LENGTH} karakter yaz.`,
  "too-long": `En fazla ${NICKNAME_MAX_LENGTH} karakter olabilir.`,
  "bad-chars": "Yalnızca harf, rakam, boşluk ve _ - . kullanabilirsin.",
  "no-letter": "En az bir harf olmalı.",
};

// Harf (Türkçe dahil), rakam, boşluk, alt çizgi, tire, nokta. @, / ve : yok:
// e-posta veya bağlantı takma ad olamaz.
const ALLOWED = /^[\p{L}\p{N} _.-]+$/u;
const HAS_LETTER = /\p{L}/u;

/** Boşlukları sadeleştirir: baş/son boşluk silinir, ardışık boşluk teke iner. */
export function normalizeNickname(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function checkNickname(raw: string): NicknameCheck {
  const value = normalizeNickname(raw);
  const length = Array.from(value).length;
  if (length < NICKNAME_MIN_LENGTH) return { ok: false, reason: "too-short" };
  if (length > NICKNAME_MAX_LENGTH) return { ok: false, reason: "too-long" };
  if (!ALLOWED.test(value)) return { ok: false, reason: "bad-chars" };
  if (!HAS_LETTER.test(value)) return { ok: false, reason: "no-letter" };
  return { ok: true, value };
}
