/**
 * ÖRNEK (SENTETİK) VERİ — GERÇEK ODTÜ SORUSU VEYA CEVABI DEĞİLDİR.
 *
 * Yalnızca ekranları geliştirmek için uydurulmuş değerler. Sayılar, açıklamalar
 * ve kaynak bağlantıları gerçek bir bilgiye dayanmaz. Gerçek sorular bu depoya
 * veya istemci koduna asla eklenmez.
 */
import type { GameDay } from "./types";

export type MockQuestionFixture = {
  id: string;
  position: number;
  prompt: string;
  unit: string;
  /** ÖRNEK doğru değer (uydurma). */
  correctAnswer: number;
  reasoning: string;
  sourceUrl: string;
  /**
   * ÖRNEK hazır puan. Mock puan HESAPLAMAZ; tahmin ne olursa olsun bu değeri
   * döndürür. Gerçek puanı yalnızca sunucu hesaplar.
   */
  cannedScoreRaw: number;
};

export const MOCK_DAY: GameDay = {
  id: "ornek-gun-1",
  number: 1,
  date: "2000-01-01", // bilerek gerçek dışı tarih; sezon başlangıcı henüz belirlenmedi
};

/** ÖRNEK günlük ham puan (gün tamamlanınca döner). */
export const MOCK_DAILY_SCORE_RAW = 63.0102999566;

export const MOCK_QUESTIONS: readonly MockQuestionFixture[] = [
  {
    id: "ornek-soru-1",
    position: 1,
    prompt: "ÖRNEK SORU 1: Hayali bir kampüste kaç bank vardır?",
    unit: "adet",
    correctAnswer: 2500,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/1",
    cannedScoreRaw: 84.9485002168,
  },
  {
    id: "ornek-soru-2",
    position: 2,
    prompt: "ÖRNEK SORU 2: Hayali bir yurtta bir günde kaç bardak çay içilir?",
    unit: "bardak",
    correctAnswer: 12000,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/2",
    cannedScoreRaw: 76.1439372640,
  },
  {
    id: "ornek-soru-3",
    position: 3,
    prompt: "ÖRNEK SORU 3: Hayali bir koşu yolu kaç metre uzunluğundadır?",
    unit: "metre",
    correctAnswer: 3200,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/3",
    cannedScoreRaw: 100,
  },
  {
    id: "ornek-soru-4",
    position: 4,
    prompt: "ÖRNEK SORU 4: Hayali bir kütüphanede kaç kitap vardır?",
    unit: "kitap",
    correctAnswer: 450000,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/4",
    cannedScoreRaw: 50,
  },
  {
    id: "ornek-soru-5",
    position: 5,
    prompt: "ÖRNEK SORU 5: Hayali bir göl kaç metrekaredir?",
    unit: "m²",
    correctAnswer: 180000,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/5",
    cannedScoreRaw: 26.1439372640,
  },
  {
    id: "ornek-soru-6",
    position: 6,
    prompt: "ÖRNEK SORU 6: Hayali bir ormanda kaç ağaç vardır?",
    unit: "ağaç",
    correctAnswer: 1000000,
    reasoning: "ÖRNEK açıklama: bu değer tamamen uydurmadır.",
    sourceUrl: "https://example.org/ornek/6",
    cannedScoreRaw: 41.0,
  },
];
