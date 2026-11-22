import { expect, it } from "vitest";
import { redirect } from "next/navigation";
import { apiResponse, requireSameOrigin } from "../../lib/data/http";

it("preserves Next.js control-flow errors instead of turning them into cached API failures", async () => {
  await expect(apiResponse(async () => redirect("/synthetic"))).rejects.toMatchObject({
    digest: expect.stringContaining("NEXT_REDIRECT"),
  });
});

it("uses the browser target Host when Next reconstructs an internal listener URL", () => {
  const request = new Request("http://localhost:4317/api/session/anonymous", {
    headers: { Host: "127.0.0.1:4317", Origin: "http://127.0.0.1:4317" },
  });
  expect(() => requireSameOrigin(request)).not.toThrow();
});

it("does not accept forwarded-host spoofing or a listener origin with a different Host", () => {
  const headers = { Host: "soraban.test", "X-Forwarded-Host": "evil.test", Origin: "https://evil.test" };
  expect(() => requireSameOrigin(new Request("https://soraban.test/api/session/anonymous", { headers }))).toThrow();
  expect(() => requireSameOrigin(new Request("http://localhost:4317/api/session/anonymous", {
    headers: { Host: "127.0.0.1:4317", Origin: "http://localhost:4317" },
  }))).toThrow();
});

it("rejects mismatched schemes and malformed Host values", () => {
  for (const host of ["soraban.test", "soraban.test/evil", "evil.test,soraban.test", "user@soraban.test"]) {
    expect(() => requireSameOrigin(new Request("https://soraban.test/api/session/anonymous", {
      headers: { Host: host, Origin: "http://soraban.test" },
    }))).toThrow();
  }
});
