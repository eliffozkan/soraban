import { getSorabanClient, isSorabanClientError, type SorabanClient } from "@/lib/client";

let sessionPromise: Promise<void> | null = null;

/**
 * Misafir oturumunu sayfa ömrü boyunca bir kez açar (docs/INTEGRATION_DECISIONS.md).
 * Başarılı olursa sonraki ekranlar aynı sonucu kullanır; hata olursa bir sonraki
 * deneme ("Tekrar dene") yeni istek atar.
 */
export function ensureSessionOnce(client: SorabanClient = getSorabanClient()): Promise<void> {
  sessionPromise ??= client.ensureGuestSession().then(
    () => undefined,
    (error: unknown) => {
      sessionPromise = null;
      throw error;
    },
  );
  return sessionPromise;
}

/** Hata için kullanıcıya gösterilecek kısa Türkçe metin. Sunucu ayrıntısı göstermez. */
export function errorMessage(error: unknown): string {
  if (!isSorabanClientError(error)) return "Beklenmeyen bir sorun oldu. Tekrar dene.";
  switch (error.code) {
    case "NETWORK_ERROR":
      return "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.";
    case "RATE_LIMITED":
      return "Çok fazla deneme oldu. Biraz bekleyip tekrar dene.";
    case "SERVICE_UNAVAILABLE":
      return "Servis şu an yanıt vermiyor. Biraz sonra tekrar dene.";
    case "DAY_UNAVAILABLE":
      return "Bugünün soruları henüz hazır değil.";
    case "DAY_CLOSED":
      return "Bu günün süresi doldu.";
    case "AUTH_REQUIRED":
      return "Oturumun bulunamadı. Sayfayı yenileyip tekrar dene.";
    case "INVALID_GUESS":
      return "Tahmin geçersiz. Pozitif bir sayı gir.";
    case "QUESTION_NOT_FOUND":
      return "Bu soru artık geçerli değil.";
    case "ALREADY_SUBMITTED":
      return "Bu soruya zaten cevap verdin.";
    default:
      return "Bir sorun oldu. Tekrar dene.";
  }
}
