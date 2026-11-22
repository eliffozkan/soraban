/**
 * Ekranlar veri katmanını yalnızca buradan içe aktarır:
 *   import { getSorabanClient } from "@/lib/client";
 *
 * Hangi adapter'ın kullanılacağını `NEXT_PUBLIC_SORABAN_CLIENT` belirler:
 * - yok / "mock" (varsayılan): ÖRNEK veriyle çalışan sahte adapter
 * - "http": Elif'in gerçek uç noktaları (lib/client/http-adapter.ts)
 * Backend doğrulanana kadar varsayılan mock kalır (docs/API_CONTRACT.md).
 * Değeri .env.local'e yazıp `npm run dev`i yeniden başlatmak gerekir.
 */
import type { SorabanClient } from "./adapter";
import { createHttpClient } from "./http-adapter";
import { createMockClient } from "./mock-adapter";

export type ClientMode = "mock" | "http";

/** Ortam değişkenini güvenli şekilde okur. Tanınmayan değer → "mock". */
export function resolveClientMode(value: string | undefined): ClientMode {
  return value?.trim().toLowerCase() === "http" ? "http" : "mock";
}

let client: SorabanClient | null = null;

export function getSorabanClient(): SorabanClient {
  // Next.js NEXT_PUBLIC_ değerlerini derleme sırasında koda gömer; bu yüzden tam adıyla okunur.
  client ??=
    resolveClientMode(process.env.NEXT_PUBLIC_SORABAN_CLIENT) === "http"
      ? createHttpClient()
      : createMockClient({ latencyMs: 300 });
  return client;
}

export type { SorabanClient } from "./adapter";
export { SorabanClientError, isSorabanClientError } from "./errors";
export { createHttpClient, type HttpClientOptions } from "./http-adapter";
export { createMockClient, type MockClientOptions, type MockScenario } from "./mock-adapter";
export * from "./types";
