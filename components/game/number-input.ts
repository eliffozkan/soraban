/**
 * Tahmin kutusuna yazılan metni sayıya çevirir ve sayıyı Türkçe okur.
 *
 * Saf (pure) yardımcılar: React, ağ veya puan hesabı yok. Sadece ekranın
 * "Şunu mu demek istedin?" adımı için kullanılır. Asıl doğrulamayı sunucu yapar.
 *
 * Türkçe yazım kuralı: nokta binlik ayırıcı ("1.500" = bin beş yüz),
 * virgül ondalık ayırıcı ("1,5" = bir buçuk).
 */
import { MAX_NUMERIC_VALUE } from "../../lib/client/types";

export type ParseFailure = "empty" | "invalid" | "not-positive" | "too-large" | "too-precise";

export type ParseResult = { ok: true; value: number } | { ok: false; reason: ParseFailure };

/** Ondalık kısımda izin verilen en fazla basamak. */
export const MAX_FRACTION_DIGITS = 6;

const MULTIPLIERS: Record<string, number> = {
  bin: 3,
  milyon: 6,
  milyar: 9,
  trilyon: 12,
};

/** Kullanıcıya gösterilecek hata metinleri. */
export const PARSE_ERROR_MESSAGES: Record<ParseFailure, string> = {
  empty: "Önce bir tahmin yaz.",
  invalid: "Bu sayıyı anlayamadım. Örnek: 1.500 veya 1,5 milyon",
  "not-positive": "Tahmin sıfırdan büyük olmalı.",
  "too-large": "Bu sayı çok büyük.",
  "too-precise": `Virgülden sonra en fazla ${MAX_FRACTION_DIGITS} basamak yazabilirsin.`,
};

type Decimal = { int: string; frac: string };

/** "1.500", "1500", "1 500", "1,5", "0,25" gibi tek bir sayıyı okur. */
function parsePlainNumber(token: string): Decimal | null {
  const commaCount = (token.match(/,/g) ?? []).length;
  if (commaCount > 1) return null;
  let [intPart, fracPart = ""] = token.split(",");

  if (intPart.includes(".")) {
    const groups = intPart.split(".");
    const thousands = groups.length > 1 && /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((g) => /^\d{3}$/.test(g));
    if (thousands) {
      intPart = groups.join("");
    } else if (groups.length === 2 && commaCount === 0 && /^\d+$/.test(groups[0]) && /^\d+$/.test(groups[1])) {
      // "1.5" gibi (İngilizce klavye alışkanlığı): ondalık olarak oku.
      // Onay adımı sayıyı tekrar gösterdiği için yanlış anlama fark edilir.
      [intPart, fracPart] = groups;
    } else {
      return null;
    }
  }

  if (intPart === "" && fracPart === "") return null;
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (token.endsWith(",")) return null;
  return { int: intPart || "0", frac: fracPart };
}

/** Ondalık sayıyı 10^power ile çarpar (virgülü kaydırarak, kayan nokta hatası olmadan). */
function shift({ int, frac }: Decimal, power: number): Decimal {
  const padded = frac.padEnd(power, "0");
  return { int: int + padded.slice(0, power), frac: padded.slice(power) };
}

function toNumber({ int, frac }: Decimal): number {
  const trimmedFrac = frac.replace(/0+$/, "");
  return Number(trimmedFrac ? `${int}.${trimmedFrac}` : int);
}

/**
 * Yazılan metni sayıya çevirir.
 *
 * Desteklenen örnekler: "1500", "1.500", "1 500", "1,5", "2 bin", "1,5 milyon",
 * "1 milyon 200 bin", "milyon" (= 1 milyon).
 */
export function parseGuessInput(raw: string): ParseResult {
  const text = raw
    .toLocaleLowerCase("tr-TR")
    .replace(/[  ]/g, " ")
    .trim();
  if (text === "") return { ok: false, reason: "empty" };
  if (/^[-−]/.test(text)) return { ok: false, reason: "not-positive" };

  // "1 500" gibi boşluklu binlikleri birleştir: rakam + boşluk + tam 3 rakam.
  const spaced = text.replace(/(\d)(?=[a-zçğıöşü])/g, "$1 ");
  const joined = spaced.replace(/(\d) (?=\d{3}(?!\d))/g, "$1");
  const tokens = joined.split(/\s+/);

  const parts: Decimal[] = [];
  let pending: Decimal | null = null;
  let lastPower = Infinity;

  for (const token of tokens) {
    const power = MULTIPLIERS[token];
    if (power !== undefined) {
      // Çarpanlar büyükten küçüğe gelmeli: "1 milyon 200 bin" olur, "200 bin 1 milyon" olmaz.
      if (power >= lastPower) return { ok: false, reason: "invalid" };
      parts.push(shift(pending ?? { int: "1", frac: "" }, power));
      pending = null;
      lastPower = power;
      continue;
    }
    if (pending) return { ok: false, reason: "invalid" };
    const number = parsePlainNumber(token);
    if (!number) return { ok: false, reason: "invalid" };
    pending = number;
  }
  if (pending) {
    if (lastPower !== Infinity && pending.frac !== "") return { ok: false, reason: "invalid" };
    parts.push(pending);
  }

  if (parts.some((p) => p.frac.replace(/0+$/, "").length > MAX_FRACTION_DIGITS)) {
    return { ok: false, reason: "too-precise" };
  }

  const value = parts.reduce((sum, p) => sum + toNumber(p), 0);
  if (!Number.isFinite(value)) return { ok: false, reason: "too-large" };
  if (value <= 0) return { ok: false, reason: "not-positive" };
  if (value > MAX_NUMERIC_VALUE) return { ok: false, reason: "too-large" };
  return { ok: true, value };
}

/** Ekranda gösterim: 1500 → "1.500", 1.5 → "1,5". */
export function formatGuess(value: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: MAX_FRACTION_DIGITS }).format(value);
}

const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
const SCALES = ["", "bin", "milyon", "milyar", "trilyon", "katrilyon"];

/** 0–999 arası sayıyı okur. */
function readHundreds(n: number): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) words.push(hundreds === 1 ? "yüz" : `${ONES[hundreds]} yüz`);
  if (rest >= 10) words.push(TENS[Math.floor(rest / 10)]);
  if (rest % 10 > 0) words.push(ONES[rest % 10]);
  return words;
}

/** Rakam dizisi olarak verilen tam sayıyı okur: "1500" → "bin beş yüz". */
function readIntegerDigits(digits: string): string {
  const clean = digits.replace(/^0+/, "");
  if (clean === "") return "sıfır";
  const groups: number[] = [];
  for (let end = clean.length; end > 0; end -= 3) {
    groups.unshift(Number(clean.slice(Math.max(0, end - 3), end)));
  }
  const words: string[] = [];
  groups.forEach((group, i) => {
    if (group === 0) return;
    const scale = SCALES[groups.length - 1 - i];
    // Türkçede "bir bin" denmez, sadece "bin".
    if (scale === "bin" && group === 1) words.push("bin");
    else words.push(...readHundreds(group), ...(scale ? [scale] : []));
  });
  return words.join(" ");
}

/**
 * Sayıyı Türkçe yazıyla okur: 1500 → "bin beş yüz", 1.5 → "bir virgül beş",
 * 0.05 → "sıfır virgül sıfır beş".
 */
export function readNumberTr(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  const fixed = value.toFixed(MAX_FRACTION_DIGITS).replace(/0+$/, "").replace(/\.$/, "");
  const [int, frac = ""] = fixed.split(".");
  const intWords = readIntegerDigits(int);
  if (!frac) return intWords;
  const leadingZeros = frac.match(/^0*/)?.[0].length ?? 0;
  const fracWords = [...Array(leadingZeros).fill("sıfır"), readIntegerDigits(frac.slice(leadingZeros))];
  return `${intWords} virgül ${fracWords.join(" ")}`;
}
