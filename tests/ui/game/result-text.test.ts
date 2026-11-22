import { describe, expect, it } from "vitest";
import { buildShareText, ratioCaption } from "../../../components/game/result-text";

describe("ratioCaption", () => {
  it("tahminin kaç kat az ya da fazla olduğunu yazar", () => {
    expect(ratioCaption(1000, 2500)).toBe("2,5 kat az");
    expect(ratioCaption(5000, 2500)).toBe("2 kat fazla");
    expect(ratioCaption(2500, 2500)).toBe("Tam isabet!");
    expect(ratioCaption(2501, 2500)).toBe("Neredeyse tam isabet!");
  });

  it("geçersiz değerlerde metin üretmez", () => {
    expect(ratioCaption(0, 10)).toBeUndefined();
    expect(ratioCaption(10, NaN)).toBeUndefined();
  });
});

describe("buildShareText", () => {
  it("gün, tek ondalıklı puan ve kareler içerir", () => {
    const text = buildShareText({
      dayNumber: 7,
      dailyScoreRaw: 73.46,
      marks: ["high", "good", "void", "fair", "low", "none"],
    });
    expect(text).toBe("SORABAN #07 · 73,5/100\n🟩🟦⬜🟨🟥⬛");
  });

  it("puan yoksa tire gösterir", () => {
    expect(buildShareText({ dayNumber: 12, dailyScoreRaw: null, marks: [] })).toBe("SORABAN #12 · —/100\n");
  });

  it("soru veya cevap içermez (yalnızca kareler)", () => {
    const text = buildShareText({ dayNumber: 1, dailyScoreRaw: 50, marks: ["high"] });
    expect(text.split("\n")[1]).toMatch(/^[🟩🟦🟨🟥⬜⬛]*$/u);
  });
});
