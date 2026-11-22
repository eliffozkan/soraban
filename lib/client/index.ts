/**
 * Ekranlar veri katmanını yalnızca buradan içe aktarır:
 *   import { getSorabanClient } from "@/lib/client";
 *
 * Şu an ÖRNEK veriyle çalışan mock döner. Backend uç noktaları doğrulanınca
 * yalnızca bu dosyada HTTP adapter'a geçilir.
 */
import type { SorabanClient } from "./adapter";
import { createMockClient } from "./mock-adapter";

let client: SorabanClient | null = null;

export function getSorabanClient(): SorabanClient {
  client ??= createMockClient({ latencyMs: 300 });
  return client;
}

export type { SorabanClient } from "./adapter";
export { SorabanClientError, isSorabanClientError } from "./errors";
export { createMockClient, type MockClientOptions, type MockScenario } from "./mock-adapter";
export * from "./types";
