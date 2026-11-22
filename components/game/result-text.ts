/**
 * Sonuç ekranları için saf metin yardımcıları. Puan HESAPLAMAZ: puanlar sunucudan
 * gelir, burada yalnızca gösterim metni üretilir.
 */

/** Tahmin ile doğru değer arasındaki oran: "1,5 kat az", "Tam isabet!". Sadece bilgi amaçlı. */
export function ratioCaption(guess: number, correctAnswer: number): string | undefined {
  if (!(guess > 0) || !(correctAnswer > 0)) return undefined;
  if (guess === correctAnswer) return "Tam isabet!";
  const ratio = Math.max(guess, correctAnswer) / Math.min(guess, correctAnswer);
  const text = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(ratio);
  if (text === "1") return "Neredeyse tam isabet!";
  return `${text} kat ${guess > correctAnswer ? "fazla" : "az"}`;
}

/** Paylaşım karesinin rengi. "void" iptal edilen, "none" cevaplanmayan soru. */
export type ShareMark = "high" | "good" | "fair" | "low" | "void" | "none";

const SQUARES: Record<ShareMark, string> = {
  high: "🟩",
  good: "🟦",
  fair: "🟨",
  low: "🟥",
  void: "⬜",
  none: "⬛",
};

/**
 * Spoiler içermeyen paylaşım metni: gün numarası, günlük puan ve renkli kareler.
 * Soru, tahmin veya doğru cevap ASLA eklenmez.
 */
export function buildShareText(options: {
  dayNumber: number;
  dailyScoreRaw: number | null;
  marks: readonly ShareMark[];
  /** Bölüm adı ("Demo", "22 Kasım"). Verilirse gün numarası yerine yazılır. */
  label?: string;
}): string {
  const day = options.label ?? `#${String(options.dayNumber).padStart(2, "0")}`;
  const score =
    options.dailyScoreRaw === null
      ? "—"
      : new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
          options.dailyScoreRaw,
        );
  return `SORABAN ${day} · ${score}/100\n${options.marks.map((m) => SQUARES[m]).join("")}`;
}
