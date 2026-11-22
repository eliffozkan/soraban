import type { ApiErrorCode } from "./types";

/** Adapter'ların fırlattığı tek hata türü. Ekranlar `code` ile karar verir. */
export class SorabanClientError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP durum kodu; ağ hatası gibi durumlarda yok. */
  readonly status?: number;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "SorabanClientError";
    this.code = code;
    this.status = status;
  }

  /** Kullanıcıya "Tekrar dene" düğmesi gösterilmeli mi? */
  get retryable(): boolean {
    return (
      this.code === "NETWORK_ERROR" ||
      this.code === "RATE_LIMITED" ||
      this.code === "DAY_UNAVAILABLE"
    );
  }
}

export function isSorabanClientError(value: unknown): value is SorabanClientError {
  return value instanceof SorabanClientError;
}
