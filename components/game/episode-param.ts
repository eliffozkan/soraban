/** URL'deki bölüm parametresinin adı: /play?bolum=demo (sunucu ve istemci ortak). */
export const EPISODE_PARAM = "bolum";

/** Next.js sayfa parametresinden tek değer alır (`?bolum=a&bolum=b` → "a"). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
