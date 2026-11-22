import { describe, expect, it } from "vitest";
import { checkNickname, normalizeNickname } from "../../../lib/client/nickname";

describe("checkNickname", () => {
  it("accepts Turkish letters, digits and _ - . with trimmed spaces", () => {
    expect(checkNickname("  Çağrı_06  ")).toEqual({ ok: true, value: "Çağrı_06" });
    expect(checkNickname("Eymir   Koşucusu")).toEqual({ ok: true, value: "Eymir Koşucusu" });
    expect(checkNickname("a.b-c")).toEqual({ ok: true, value: "a.b-c" });
  });

  it("enforces length 3–20", () => {
    expect(checkNickname("ab")).toEqual({ ok: false, reason: "too-short" });
    expect(checkNickname("   ")).toEqual({ ok: false, reason: "too-short" });
    expect(checkNickname("a".repeat(21))).toEqual({ ok: false, reason: "too-long" });
    expect(checkNickname("ş".repeat(20))).toMatchObject({ ok: true });
  });

  it("rejects emails, links and symbols", () => {
    for (const bad of ["ali@metu.edu.tr", "https://x.co", "<script>", "a/b/c", "emoji😀x"]) {
      expect(checkNickname(bad)).toEqual({ ok: false, reason: "bad-chars" });
    }
  });

  it("requires at least one letter", () => {
    expect(checkNickname("12345")).toEqual({ ok: false, reason: "no-letter" });
    expect(checkNickname("___")).toEqual({ ok: false, reason: "no-letter" });
  });

  it("normalizes whitespace", () => {
    expect(normalizeNickname("\t a \n b ")).toBe("a b");
  });
});
