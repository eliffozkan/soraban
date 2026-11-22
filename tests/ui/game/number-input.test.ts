import { describe, expect, it } from "vitest";
import { formatGuess, parseGuessInput, readNumberTr } from "../../../components/game/number-input";

const value = (raw: string) => {
  const result = parseGuessInput(raw);
  if (!result.ok) throw new Error(`"${raw}" okunamadı: ${result.reason}`);
  return result.value;
};

const reason = (raw: string) => {
  const result = parseGuessInput(raw);
  if (result.ok) throw new Error(`"${raw}" hata vermeliydi, ${result.value} döndü`);
  return result.reason;
};

describe("parseGuessInput", () => {
  it.each([
    ["1500", 1500],
    ["1.500", 1500],
    ["1.500.000", 1_500_000],
    ["1 500", 1500],
    ["1 500 000", 1_500_000],
    ["1 500", 1500],
    ["1,5", 1.5],
    ["0,25", 0.25],
    [",5", 0.5],
    ["1.500,75", 1500.75],
    ["  42  ", 42],
  ])("Türkçe yazımı okur: %s → %d", (raw, expected) => {
    expect(value(raw)).toBe(expected);
  });

  it.each([
    ["2 bin", 2000],
    ["bin", 1000],
    ["1,5 milyon", 1_500_000],
    ["1,5milyon", 1_500_000],
    ["0,1 milyon", 100_000],
    ["2,75 milyar", 2_750_000_000],
    ["3 trilyon", 3e12],
    ["1 milyon 200 bin", 1_200_000],
    ["1 milyon 200 bin 50", 1_200_050],
    ["8.500 bin", 8_500_000],
    ["1,5 MİLYON", 1_500_000],
    ["Bin", 1000],
  ])("çarpan kelimelerini okur: %s → %d", (raw, expected) => {
    expect(value(raw)).toBe(expected);
  });

  it("İngilizce klavyeyle yazılan tek noktalı ondalığı kabul eder", () => {
    expect(value("1.5")).toBe(1.5);
    expect(value("12.25")).toBe(12.25);
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["abc", "invalid"],
    ["1,2,3", "invalid"],
    ["1.50.0", "invalid"],
    ["1,", "invalid"],
    ["bin milyon", "invalid"],
    ["200 bin 1 milyon", "invalid"],
    ["2 3", "invalid"],
    ["1e5", "invalid"],
    ["0", "not-positive"],
    ["0,0", "not-positive"],
    ["-5", "not-positive"],
    ["1001 trilyon", "too-large"],
    ["1,1234567", "too-precise"],
  ])("geçersiz girişi reddeder: %j → %s", (raw, expected) => {
    expect(reason(raw)).toBe(expected);
  });

  it("üst sınırı (1e15) kabul eder", () => {
    expect(value("1000 trilyon")).toBe(1e15);
  });
});

describe("readNumberTr", () => {
  it.each([
    [0, "sıfır"],
    [1, "bir"],
    [10, "on"],
    [11, "on bir"],
    [100, "yüz"],
    [101, "yüz bir"],
    [250, "iki yüz elli"],
    [1000, "bin"],
    [1500, "bin beş yüz"],
    [2000, "iki bin"],
    [11_000, "on bir bin"],
    [100_000, "yüz bin"],
    [101_000, "yüz bir bin"],
    [1_000_000, "bir milyon"],
    [1_200_050, "bir milyon iki yüz bin elli"],
    [2_750_000_000, "iki milyar yedi yüz elli milyon"],
    [1e15, "bir katrilyon"],
    [1.5, "bir virgül beş"],
    [0.05, "sıfır virgül sıfır beş"],
    [12.25, "on iki virgül yirmi beş"],
  ])("%d → %s", (n, expected) => {
    expect(readNumberTr(n)).toBe(expected);
  });
});

describe("formatGuess", () => {
  it("Türkçe binlik ve ondalık ayırıcı kullanır", () => {
    expect(formatGuess(1500)).toBe("1.500");
    expect(formatGuess(1.5)).toBe("1,5");
    expect(formatGuess(1_200_050)).toBe("1.200.050");
  });
});
