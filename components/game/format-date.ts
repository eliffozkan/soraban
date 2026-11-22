/** Sunucudan gelen "YYYY-MM-DD" tarihini "22 Kasım 2026 · Pazar" biçiminde yazar. */
export function formatDayDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  // Tarih zaten İstanbul gününe göre; saat dilimi kaymasın diye UTC öğlen kullanılır.
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  const weekday = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" }).format(date);
  return `${day} · ${weekday}`;
}
