import { describe, expect, it } from "vitest";
import { formatDayDate } from "../../../components/game/format-date";

describe("formatDayDate", () => {
  it("Türkçe gün adıyla yazar", () => {
    expect(formatDayDate("2026-11-22")).toBe("22 Kasım 2026 · Pazar");
  });

  it("beklenmeyen biçimi olduğu gibi bırakır", () => {
    expect(formatDayDate("bugün")).toBe("bugün");
  });
});
