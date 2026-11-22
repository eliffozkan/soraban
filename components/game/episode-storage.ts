/**
 * Tarayıcıda yalnızca küçük kolaylıklar saklanır: son seçilen bölüm ve
 * "takma adsız devam et" seçimi. İlerleme, puan ve takma adın kendisi
 * SUNUCUDADIR; burası silinse bile oyun kaldığı yerden devam eder.
 * Gizli pencere vb. durumlarda depolama hata verebilir: her erişim try/catch içinde.
 */
import { isEpisodeSlug, type EpisodeSlug } from "@/lib/client";

const EPISODE_KEY = "soraban.episode";
const SKIP_KEY = "soraban.nicknameSkipped";
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Depolama kapalıysa sessizce geçilir; oyun yine çalışır.
  }
  listeners.forEach((l) => l());
}

export function readStoredEpisode(): EpisodeSlug | null {
  const value = read(EPISODE_KEY);
  return isEpisodeSlug(value) ? value : null;
}

export function storeEpisode(slug: EpisodeSlug) {
  if (read(EPISODE_KEY) !== slug) write(EPISODE_KEY, slug);
}

export function readNicknameSkipped(): boolean {
  return read(SKIP_KEY) === "1";
}

export function storeNicknameSkipped(skipped: boolean) {
  write(SKIP_KEY, skipped ? "1" : "0");
}

/** useSyncExternalStore için abonelik (aynı sekmedeki değişiklikler + diğer sekmeler). */
export function subscribeStorage(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
