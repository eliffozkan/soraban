"use client";

import { useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  CategoryTag,
  CategoryTile,
  ConfirmPanel,
  DailySummary,
  IconArrowRight,
  IconBack,
  IconButton,
  IconCalculator,
  IconClose,
  IconLock,
  IconTrophy,
  Keypad,
  LeaderboardTable,
  Logo,
  Notice,
  NumericInput,
  Progress,
  RevealCard,
  ScoreDisplay,
  ShareButton,
  Skeleton,
  StatusState,
  Sticker,
  TimerDisplay,
  type CategoryKey,
  type KeypadKey,
  type ProgressState,
} from "./index";

/*
 * Component preview for review. Every text and number is a synthetic
 * placeholder (the sample question echoes the v4 mockup), not season content.
 * Screens are composed here only to show how the parts fit; the real screens
 * are Zeynep's (components/game, app routes).
 */

const categories: CategoryKey[] = ["kampus", "akademik", "yurt-yemek", "tarih-kultur", "eymir-doga", "bilim-topluluklar"];
const states: ProgressState[] = ["answered", "unanswered", "unanswered", "unanswered", "unanswered", "unanswered"];
const labels = ["Kampüs", "Yurt & yemek", "Akademik", "Tarih", "Eymir", "Bilim"];
const shortcuts = [
  { label: "× bin", value: "bin" },
  { label: "× milyon", value: "milyon" },
  { label: "× milyar", value: "milyar" },
];

function Section({ title, lang, children }: { title: string; lang?: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 lang={lang} className="eyebrow border-b-2 border-ink pb-2">{title}</h2>
      {children}
    </section>
  );
}

function StepDot({ n, tone }: { n: number; tone: string }) {
  return <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink font-extrabold ${tone}`}>{n}</span>;
}

export function UiPreview() {
  const [desk, setDesk] = useState("8.500");
  const [phone, setPhone] = useState("8.500");
  const [locking, setLocking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lbEmpty, setLbEmpty] = useState(false);

  const onKey = (k: KeypadKey) => setPhone((v) => (k === "backspace" ? v.slice(0, -1) : `${v}${k}`));
  const fakeWait = (set: (b: boolean) => void) => {
    set(true);
    setTimeout(() => set(false), 1500);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Logo withWordmark />
        <p className="font-medium text-ink-muted">UI önizleme · tüm metin ve sayılar sentetik örnektir</p>
      </header>

      <Section title="Giriş ( / )">
        <StatusState kind="loading" title="Oyun hazırlanıyor…" message="Misafir oturumun açılıyor." />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <Card tone="yellow" padding="lg">
              <Sticker tone="pink" tilt={8} className="absolute -top-4 right-6">×10</Sticker>
              <p className="eyebrow text-ink-muted">Günün bulmacası · Sezon 1</p>
              <p className="display mt-2 text-8xl sm:text-9xl">#07</p>
              <p className="mt-2 text-xl font-extrabold">22 Kasım 2026 · Pazar</p>
              <Sticker tone="green" shape="circle" tilt={0} className="absolute bottom-6 right-6">%</Sticker>
            </Card>
            <div className="flex flex-wrap gap-3">
              <Badge tone="ink">6 soru</Badge>
              <Badge tone="ink">Tek hak</Badge>
              <Badge>0–100 puan</Badge>
              <Badge>Gün 7 / 30</Badge>
            </div>
            <div className="flex flex-wrap items-end gap-5">
              <Button size="lg" className="flex-1" trailingIcon={<IconArrowRight size={30} />}>Oyna</Button>
              <TimerDisplay label="Yeni sorulara" value="09:28:14" />
            </div>
          </div>
          <div className="space-y-5">
            <h3 className="display text-3xl">Bugünün kategorileri</h3>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((c) => <CategoryTile key={c} category={c} />)}
            </div>
            <Card tone="paper" shadow="none" title="Nasıl oynanır?" headingLevel={3}>
              <ol className="grid gap-4 sm:grid-cols-3">
                <li className="flex gap-3"><StepDot n={1} tone="bg-pink" /><span><b>Tahmin et.</b> Soruya bir sayı yaz.</span></li>
                <li className="flex gap-3"><StepDot n={2} tone="bg-green" /><span><b>Kilitle.</b> Her soruda tek hakkın var.</span></li>
                <li className="flex gap-3"><StepDot n={3} tone="bg-blue text-white" /><span><b>Puanı gör.</b> Ne kadar yakınsan o kadar puan.</span></li>
              </ol>
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Soru ( /play ) · masaüstü">
        <div className="flex items-center justify-between gap-4">
          <Progress states={states} current={2} />
          <IconButton label="Kapat" icon={<IconClose size={22} />} />
        </div>
        <div className="mx-auto max-w-3xl space-y-4">
          <Card tone="yellow" padding="lg">
            <Sticker tone="blue" tilt={6} className="absolute -top-5 right-6">Tek hak!</Sticker>
            <div className="flex items-center gap-3">
              <span className="eyebrow">S2 / 6</span>
              <CategoryTag category="yurt-yemek" />
            </div>
            <h3 className="display mt-4 text-4xl text-balance sm:text-5xl">Yemekhanede bir günde kaç tepsi yemek çıkıyor?</h3>
            <NumericInput
              className="mt-6"
              label="Tahminin"
              value={desk}
              onChange={setDesk}
              unit="tepsi"
              shortcuts={shortcuts}
              onShortcut={(v) => setDesk((d) => `${d.trim()} ${v}`.trim())}
              trailingAction={<IconButton shape="circle" label="Hesap makinesi" icon={<IconCalculator size={20} />} />}
            />
            <Button size="lg" fullWidth leadingIcon={<IconLock size={26} />}>Kilitle</Button>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium text-ink-muted">Klavyeden yaz, <b className="text-ink">Enter</b> ile kilitle.</p>
            <Progress states={states} current={2} variant="chips" labels={labels} />
          </div>
        </div>
      </Section>

      <Section title="Soru ( /play ) · telefon">
        <div className="mx-auto w-full max-w-sm space-y-4 rounded-lg border-2 border-dashed border-ink/30 p-4">
          <div className="flex items-center gap-3">
            <IconButton label="Geri" icon={<IconBack size={22} />} />
            <Progress states={states} current={2} className="min-w-0" />
          </div>
          <CategoryTag category="yurt-yemek" />
          <h3 className="display text-3xl">Yemekhanede bir günde kaç tepsi yemek çıkıyor?</h3>
          <NumericInput label="Tahminin" value={phone} onChange={setPhone} unit="tepsi" tone="yellow" inputMode="none" shortcuts={shortcuts} onShortcut={(v) => setPhone((d) => `${d.trim()} ${v}`.trim())} />
          <Keypad onKey={onKey} />
          <Button size="lg" fullWidth leadingIcon={<IconLock size={26} />}>Kilitle</Button>
        </div>
      </Section>

      <Section title="Onay ( /play )">
        <div className="mx-auto max-w-2xl">
          <ConfirmPanel
            formattedValue="1.500"
            spokenValue="bin beş yüz"
            unit="adet"
            loading={locking}
            onConfirm={() => fakeWait(setLocking)}
            onEdit={() => {}}
          />
        </div>
      </Section>

      <Section title="Sonuç ( /play )">
        <div className="mx-auto max-w-3xl space-y-4">
          <RevealCard
            prompt="Örnek soru: yemekhanede bir günde kaç tepsi yemek çıkıyor?"
            guess={8500}
            correctAnswer={12000}
            unit="tepsi"
            scoreRaw={92.5}
            caption="1,4 kat az"
            reasoning="Örnek açıklama: burada cevabın nasıl bulunduğunu anlatan kısa bir metin yer alır."
            sourceUrl="https://example.org/sentetik-kaynak"
          />
          <div className="flex justify-end">
            <Button size="lg" trailingIcon={<IconArrowRight size={28} />}>Sonraki soru</Button>
          </div>
        </div>
      </Section>

      <Section title="Günlük özet ( /results )">
        <div className="mx-auto max-w-3xl">
          <DailySummary
            dayNumber={7}
            date="22 Kasım 2026 · Pazar"
            scoreRaw={73.46}
            items={[
              { position: 1, scoreRaw: 96.2, label: "Kampüs" },
              { position: 2, scoreRaw: 81.4, label: "Yurt" },
              { position: 3, scoreRaw: null, void: true, label: "Akademik" },
              { position: 4, scoreRaw: 57.9, label: "Tarih" },
              { position: 5, scoreRaw: 12, label: "Eymir" },
              { position: 6, scoreRaw: 88.1, label: "Bilim" },
            ]}
            footer={
              <ShareButton
                text={"SORABAN #07 · 73,5/100\n🟩🟦⬜🟨🟥🟦"}
                onShare={async (t) => {
                  await navigator.clipboard.writeText(t);
                }}
              />
            }
          />
        </div>
      </Section>

      <Section title="Liderlik ( /leaderboard )">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex gap-3">
            <Button variant={lbEmpty ? "secondary" : "ink"} onClick={() => setLbEmpty(false)}>Dolu</Button>
            <Button variant={lbEmpty ? "ink" : "secondary"} onClick={() => setLbEmpty(true)}>Boş</Button>
          </div>
          <LeaderboardTable
            highlightRank={4}
            entries={
              lbEmpty
                ? []
                : [
                    { rank: 1, nickname: "ornek_oyuncu_1", scoreRaw: 512.34, playedDays: 6 },
                    { rank: 2, nickname: "ornek_oyuncu_2", scoreRaw: 498.9, playedDays: 6 },
                    { rank: 2, nickname: "ornek_oyuncu_3", scoreRaw: 498.9, playedDays: 7 },
                    { rank: 4, nickname: "ornek_oyuncu_4_cok_uzun_bir_takma_ad", scoreRaw: 401.05, playedDays: 5 },
                    { rank: 5, nickname: "ornek_oyuncu_5", scoreRaw: 377.7 },
                  ]
            }
          />
          <p className="text-sm text-ink-muted">Örnekte eşit puanlı iki oyuncu aynı sırayı (2) paylaşıyor; vurgulanan satır 4. sıra (örneğin oyuncunun kendisi).</p>
        </div>
      </Section>

      <Section title="Button · IconButton" lang="en">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Birincil</Button>
          <Button variant="secondary">Giriş yap</Button>
          <Button variant="ghost">Vazgeç</Button>
          <Button variant="ink">Koyu</Button>
          <Button loading>Gönderiliyor</Button>
          <Button disabled>Devre dışı</Button>
          <IconButton label="Sıralama" icon={<IconTrophy size={22} />} />
          <IconButton shape="circle" label="Hesap makinesi" icon={<IconCalculator size={20} />} />
        </div>
      </Section>

      <Section title="NumericInput states" lang="en">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <NumericInput label="Hatalı" value="abc" onChange={() => {}} unit="km" size="md" error="Bu sayıyı anlayamadım." />
          <NumericInput label="Kilitli" value="1.200" onChange={() => {}} unit="ton" size="md" locked />
          <NumericInput label="Devre dışı" value="" onChange={() => {}} unit="kişi" size="md" disabled hint="Gün kapandı." />
        </div>
      </Section>

      <Section title="ScoreDisplay" lang="en">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ScoreDisplay scoreRaw={96.2} caption="1,1 kat fazla" size="sm" />
          <ScoreDisplay scoreRaw={84.948} caption="2 kat az" size="sm" />
          <ScoreDisplay scoreRaw={57.9} caption="7 kat fazla" size="sm" />
          <ScoreDisplay scoreRaw={12} caption="200 kat az" size="sm" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ScoreDisplay scoreRaw={84.948} fractionDigits={1} label="Günün puanı" size="lg" />
          <ScoreDisplay scoreRaw={null} label="Henüz yok" />
          <ScoreDisplay scoreRaw={null} label="Yükleniyor" loading />
        </div>
      </Section>

      <Section title="StatusState · Notice · Skeleton" lang="en">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatusState kind="loading" title="Sorular yükleniyor…" />
          <StatusState
            kind="error"
            title="Bağlanamadık"
            message="Örnek: çok fazla deneme, biraz bekleyip tekrar dene."
            retrying={retrying}
            onRetry={() => fakeWait(setRetrying)}
          />
          <Notice title="Bilgi">Bu gün 00:00&apos;da kapanır.</Notice>
          <Notice tone="success" title="Kaydedildi">Tahminin kilitlendi.</Notice>
          <Notice tone="warning" title="Uyarı">Bağlantı yavaş.</Notice>
          <Notice tone="danger" title="Hata">Tahmin gönderilemedi.</Notice>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card shadow="sm">
            <div className="space-y-3">
              <Skeleton width="40%" height="1.25rem" />
              <Skeleton height="3.5rem" />
              <Skeleton width="70%" />
            </div>
          </Card>
          <Card shadow="sm" padding="sm">
            <StatusState
              kind="empty"
              title="Bugünün soruları henüz yayında değil"
              message="Yeni sorular her gün 00:00'da açılır."
              action={<Button variant="secondary">Arşive bak</Button>}
            />
          </Card>
        </div>
      </Section>
    </div>
  );
}
