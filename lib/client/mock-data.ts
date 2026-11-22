/**
 * MOCK_QUESTIONS / MOCK_DAY: ÖRNEK (SENTETİK) VERİ — GERÇEK ODTÜ SORUSU VEYA CEVABI DEĞİLDİR.
 * (İstisna: dosyanın sonundaki MOCK_EPISODE_QUESTIONS, bkz. oradaki not.)
 *
 * Yalnızca ekranları geliştirmek için uydurulmuş değerler. Sayılar, açıklamalar
 * ve kaynak bağlantıları gerçek bir bilgiye dayanmaz. Gerçek sorular bu depoya
 * veya istemci koduna asla eklenmez.
 */
import type { CategoryKey } from "../../components/ui/categories";
import type { EpisodeSlug, GameDay } from "./types";

export type MockQuestionFixture = {
  id: string;
  position: number;
  prompt: string;
  unit: string;
  /** ÖRNEK kategori. */
  category: CategoryKey;
  /** ÖRNEK doğru değer (uydurma). */
  correctAnswer: number;
  reasoning: string;
  /** Boş olabilir (kaynak bağlantısı yok); arayüz o zaman bağlantı göstermez. */
  sourceUrl: string;
};

export const MOCK_DAY: GameDay = {
  id: "ornek-gun-1",
  number: 1,
  date: "2000-01-01", // bilerek gerçek dışı tarih; sezon başlangıcı henüz belirlenmedi
};

export const MOCK_QUESTIONS: readonly MockQuestionFixture[] = [
  {
    id: "ornek-soru-1",
    position: 1,
    prompt: "ÖRNEK SORU 1: Hayali bir kampüste kaç bank vardır?",
    unit: "adet",
    category: "kampus",
    correctAnswer: 2500,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/1",
  },
  {
    id: "ornek-soru-2",
    position: 2,
    prompt: "ÖRNEK SORU 2: Hayali bir yurtta bir günde kaç bardak çay içilir?",
    unit: "bardak",
    category: "yurt-yemek",
    correctAnswer: 12000,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/2",
  },
  {
    id: "ornek-soru-3",
    position: 3,
    prompt: "ÖRNEK SORU 3: Hayali bir koşu yolu kaç metre uzunluğundadır?",
    unit: "metre",
    category: "kampus",
    correctAnswer: 3200,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/3",
  },
  {
    id: "ornek-soru-4",
    position: 4,
    prompt: "ÖRNEK SORU 4: Hayali bir kütüphanede kaç kitap vardır?",
    unit: "kitap",
    category: "akademik",
    correctAnswer: 450000,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/4",
  },
  {
    id: "ornek-soru-5",
    position: 5,
    prompt: "ÖRNEK SORU 5: Hayali bir göl kaç metrekaredir?",
    unit: "m²",
    category: "eymir-doga",
    correctAnswer: 180000,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/5",
  },
];

/**
 * SUNUM İÇİN BİLİNÇLİ İSTİSNA (Elif'in isteği, 22 Kasım 2026): Demo ve 22 Kasım
 * bölümlerinin GERÇEK soruları ve cevapları. Yalnızca mock modunda kullanılır;
 * gerçek (HTTP) modda sorular Supabase'den gelir. Sunumdan sonra kaldırılmalı.
 * Demo cevapları etkinlik organizasyonunun verdiği bilgidir (bağımsız doğrulanmadı).
 */
export const MOCK_EPISODE_QUESTIONS: Record<EpisodeSlug, readonly MockQuestionFixture[]> = {
  "demo": [
  {
    id: "demo-1",
    position: 1,
    prompt: "Bugünkü The Egg Club etkinliğinde koordinatör dahil toplam kaç kişi var?",
    unit: "kişi",
    category: "bilim-topluluklar",
    correctAnswer: 38,
    reasoning: "Etkinlik katılımcı sayısı, koordinatör dahil: 38. Kaynak: Etkinlik organizasyonundan verilen bilgi (Elif, 22 Kasım 2026).",
    sourceUrl: "",
  },
  {
    id: "demo-2",
    position: 2,
    prompt: "Bugünkü etkinlik için kaç pizza sipariş edildi?",
    unit: "pizza",
    category: "yurt-yemek",
    correctAnswer: 46,
    reasoning: "Etkinlik için verilen pizza siparişi: 46 adet. Kaynak: Etkinlik organizasyonundan verilen bilgi (Elif, 22 Kasım 2026).",
    sourceUrl: "",
  },
  {
    id: "demo-3",
    position: 3,
    prompt: "Bugünkü etkinlik alanında toplam kaç masa var?",
    unit: "masa",
    category: "kampus",
    correctAnswer: 25,
    reasoning: "Etkinlik alanında toplam 25 masa var. Kaynak: Etkinlik organizasyonundan verilen bilgi (Elif, 22 Kasım 2026).",
    sourceUrl: "",
  },
  {
    id: "demo-4",
    position: 4,
    prompt: "Bulunduğumuz etkinlik alanından ODTÜ A1 Kapısı’na yaklaşık kaç metre uzaklıktayız?",
    unit: "metre",
    category: "kampus",
    correctAnswer: 1600,
    reasoning: "Yaklaşık 1,6 km, yani 1.600 metre. Kaynak: Etkinlik organizasyonundan verilen bilgi (Elif, 22 Kasım 2026).",
    sourceUrl: "",
  },
  {
    id: "demo-5",
    position: 5,
    prompt: "Geçen haftaki The Egg Club etkinliğinde kaç proje geliştirildi?",
    unit: "proje",
    category: "bilim-topluluklar",
    correctAnswer: 7,
    reasoning: "Geçen haftaki etkinlikte 7 proje geliştirildi. Kaynak: Etkinlik organizasyonundan verilen bilgi (Elif, 22 Kasım 2026).",
    sourceUrl: "",
  },
  ],
  "2026-11-22": [
  {
    id: "2026-11-22-1",
    position: 1,
    prompt: "1960'tan 2025'e kadar ODTÜ'den toplam kaç kişi mezun oldu?",
    unit: "mezun",
    category: "tarih-kultur",
    correctAnswer: 158675,
    reasoning: "İlk Bakışta ODTÜ: 1960–2025 arasında toplam 158.675 mezun.",
    sourceUrl: "https://ilkbakista.metu.edu.tr/english/",
  },
  {
    id: "2026-11-22-2",
    position: 2,
    prompt: "ODTÜ'de kaç laboratuvar var?",
    unit: "laboratuvar",
    category: "akademik",
    correctAnswer: 549,
    reasoning: "İlk Bakışta ODTÜ (2025 verisi): 549 laboratuvar ve 374 derslik/amfi.",
    sourceUrl: "https://ilkbakista.metu.edu.tr/english/",
  },
  {
    id: "2026-11-22-3",
    position: 3,
    prompt: "ODTÜ ormanı kaç km²'lik alanı kaplar?",
    unit: "km²",
    category: "eymir-doga",
    correctAnswer: 33,
    reasoning: "İlk Bakışta ODTÜ: 33 km² ormanlık alan. Orman 1961'den beri öğrenci ve çalışanların emeğiyle bozkırda yetiştirildi.",
    sourceUrl: "https://ilkbakista.metu.edu.tr/english/",
  },
  {
    id: "2026-11-22-4",
    position: 4,
    prompt: "2025–2026 güz döneminde ODTÜ'de kaç uluslararası öğrenci var?",
    unit: "öğrenci",
    category: "akademik",
    correctAnswer: 1510,
    reasoning: "İlk Bakışta ODTÜ: 2025–2026 güz döneminde 1.510 uluslararası öğrenci.",
    sourceUrl: "https://ilkbakista.metu.edu.tr/english/",
  },
  {
    id: "2026-11-22-5",
    position: 5,
    prompt: "ODTÜ Bilim ve Teknoloji Müzesi 2025'te kaç ziyaretçi ağırladı?",
    unit: "ziyaretçi",
    category: "bilim-topluluklar",
    correctAnswer: 19047,
    reasoning: "İlk Bakışta ODTÜ (2025 faaliyet raporları): Bilim ve Teknoloji Müzesi 19.047 ziyaretçi.",
    sourceUrl: "https://ilkbakista.metu.edu.tr/english/",
  },
  ],
};
