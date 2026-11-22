# SORABAN UI primitives — props

Status: **v0.3, follows Zeynep's "Oyun ekranları için UI bileşen listesi" (22 Nov 2026)**
Owner: Neris (`components/ui/**`) | Visual source: team-selected v4 mockups

Presentation only: no fetching, Supabase, auth, scoring, parsing or routing.
Everything comes in through props; user actions call callbacks. Scores arrive
raw (`scoreRaw`) and are rounded only on screen.

## Answers to Zeynep's open questions

1. **Single entry point:** yes. `import { Button } from "@/components/ui"`.
2. **ConfirmPanel and StatusState:** on the UI side, both are in `components/ui`.
3. **Rounding (proposal, Elif signs off as product owner):** a single question
   shows a whole number (84,948 → **85**); the daily mean shows one decimal
   (**84,9**); leaderboard scores show one decimal. `ScoreDisplay` and
   `LeaderboardTable` take `fractionDigits` so this can change in one place.
4. **Temporary plain HTML first:** fine. The props below match your list, so the
   swap should be mostly import changes.

Prop names follow your list. Where I changed or added something, it is marked
**(changed)** or **(added)**.

## Which screen uses what

| Screen | Components |
| --- | --- |
| Giriş `/` | `Card`, `Button`, `StatusState`, plus v4 extras: `Logo`, `Sticker`, `Badge`, `CategoryTile`, `TimerDisplay` |
| Soru `/play` | `Progress`, `Card`, `NumericInput`, `Button`, `StatusState`, `CategoryTag`, `Keypad` (phone), `IconButton` |
| Onay `/play` | `ConfirmPanel` |
| Sonuç `/play` | `RevealCard` (contains `ScoreDisplay`), `Button` |
| Günlük özet `/results` | `DailySummary` (contains `ScoreDisplay`), `ShareButton` |
| Liderlik `/leaderboard` | `LeaderboardTable`, `StatusState` |

`components/ui/ui-preview.tsx` composes each of these screens with synthetic data.

## Priority components

### Button

```ts
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "ink"; // ink (navy) (added)
  size?: "md" | "lg";       // (added) lg = big display capitals (KİLİTLE, OYNA)
  loading?: boolean;
  loadingLabel?: string;    // (added) screen-reader text, default "Yükleniyor"
  fullWidth?: boolean;      // (added)
  leadingIcon?: ReactNode;  // (added)
  trailingIcon?: ReactNode; // (added)
};
```
`children`, `onClick`, `disabled`, `type` come from the button attributes;
`type` defaults to `"button"`.

### Card

```ts
type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  as?: "div" | "section" | "article";
  title?: ReactNode;
  tone?: "yellow" | "paper" | "white" | "pink" | "green" | "blue"; // (added)
  padding?: "sm" | "md" | "lg";                                    // (added)
  shadow?: "none" | "sm" | "md";                                   // (added)
  description?: ReactNode; headingLevel?: 2 | 3 | 4; footer?: ReactNode; // (added)
};
```

## Next-stage components (all included now)

### NumericInput

```ts
type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "size"> & {
  value: string;
  onChange: (value: string) => void;  // raw text on every edit
  unit?: string;
  label: string;
  error?: ReactNode;                  // aria-invalid + message
  // disabled, id, placeholder, inputMode … pass through
  hint?: ReactNode;                   // (added)
  confirmation?: ReactNode;           // (added) optional live preview; the real step is ConfirmPanel
  locked?: boolean;                   // (added) read-only with lock icon after commit
  shortcuts?: ReadonlyArray<{ label: string; value: string }>; // (added) "× bin" chips
  onShortcut?: (value: string) => void;                        // (added)
  trailingAction?: ReactNode;         // (added) calculator IconButton
  tone?: "white" | "yellow";          // (added) desktop / phone
  size?: "md" | "lg";                 // (added)
};
```
`inputMode="decimal"` by default, paste is never blocked. With the on-screen
`Keypad`, pass `inputMode="none"`.

### ConfirmPanel

```ts
type ConfirmPanelProps = {
  formattedValue: string;   // "1.500"
  spokenValue?: string;     // "bin beş yüz"
  unit: string;
  onConfirm: () => void;
  onEdit: () => void;
  loading?: boolean;        // confirm spins, edit disabled
  title?: ReactNode;        // (added) default "Şunu mu demek istedin?"
  confirmLabel?: string;    // (added) default "Evet, kilitle"
  editLabel?: string;       // (added) default "Düzelt"
  className?: string;
};
```

### Progress (changed to your shape)

```ts
type ProgressState = "unanswered" | "answered" | "void";
type ProgressProps = {
  states: readonly ProgressState[];
  current?: number;      // 1-based, same as QuestionPublic.position; omit on summary screens
  total?: number;        // default states.length (6)
  variant?: "bar" | "chips";            // (added) header bar / chips under the card
  labels?: readonly (string | undefined)[]; // (added) short category per position, chips only
  showCount?: boolean;   // (added) "Soru 2/6"
  onSelect?: (position: number) => void;   // (added) 1-based, makes positions buttons
  label?: string; className?: string;
};
```
**Note:** `current` is **1-based** on purpose so it matches `position` from the
API. Please check this against your types.

### ScoreDisplay

```ts
type ScoreDisplayProps = {
  scoreRaw: number | null; // null = not available yet
  max?: number;            // default 100
  label?: string;          // default "Puan"
  size?: "sm" | "md" | "lg";
  fractionDigits?: 0 | 1;  // (added) see rounding answer above
  caption?: ReactNode;     // (added) e.g. "1,5 kat az", computed by the caller
  loading?: boolean;       // (added)
  className?: string;
};
function scoreTier(scoreRaw: number): "high" | "good" | "fair" | "low"; // colour only
```

### StatusState

```ts
type StatusStateProps = {
  kind: "loading" | "error" | "empty";
  title: ReactNode;
  message?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;     // default "Tekrar dene"
  retrying?: boolean;      // (added) retry button spinner
  action?: ReactNode;      // (added) extra control in the empty state, e.g. "Arşive bak"
  className?: string;
};
```
loading → `role="status"`, error → `role="alert"`, empty → centred block with logo.
Covers guest-session initialization from `docs/INTEGRATION_DECISIONS.md`.

### RevealCard

```ts
type RevealCardProps = {
  guess: number;
  correctAnswer: number;
  unit: string;
  scoreRaw: number;
  reasoning?: ReactNode;
  sourceUrl?: string;      // shown as "Kaynak" only if it is an absolute http(s) URL
  sourceLabel?: string;    // (added) default "Kaynak"
  caption?: ReactNode;     // (added) under the score
  prompt?: ReactNode;      // (added) question text above the result
  className?: string;
};
```
Numbers are formatted for display (`8.500`); the link opens in a new tab with
`rel="noopener noreferrer"`. Other URL schemes are ignored on purpose.

### DailySummary

```ts
type DailySummaryItem = { position: number; scoreRaw: number | null; void?: boolean; label?: string };
type DailySummaryProps = {
  dayNumber: number;
  scoreRaw: number | null;   // daily mean, shown with one decimal
  items: readonly DailySummaryItem[];
  date?: ReactNode;          // (added) "22 Kasım 2026 · Pazar"
  title?: ReactNode;         // (added) default "Günün özeti"
  footer?: ReactNode;        // (added) slot for ShareButton
  className?: string;
};
```
**(changed)** void is `void: true` on the item instead of a special score value.

### ShareButton

```ts
type ShareButtonProps = {
  text: string;                                  // you build the spoiler-free text
  onShare: (text: string) => void | Promise<void>; // you call navigator.share / clipboard; throw on failure
  copiedLabel?: string;     // default "Kopyalandı"
  label?: string;           // (added) default "Sonucu paylaş"
  failedLabel?: string;     // (added)
  showPreview?: boolean;    // (added) shows the text above the button, default true
  className?: string;
};
```
It only keeps the short "copied / failed" UI state; the actual sharing is yours.

### LeaderboardTable

```ts
type LeaderboardEntry = { rank: number; nickname: string; scoreRaw: number; playedDays?: number };
type LeaderboardTableProps = {
  entries: readonly LeaderboardEntry[];
  highlightRank?: number;
  fractionDigits?: 0 | 1;   // (added) default 1
  caption?: ReactNode;      // (added) screen-reader caption, default "Sıralama"
  emptyTitle?: ReactNode;   // (added) default "Sıralama henüz açılmadı"
  emptyMessage?: ReactNode; // (added) default mentions nickname approval
  className?: string;
};
```
Equal ranks are shown as given (two "2"s). An empty `entries` array renders the
empty state, so the table is safe to show before nickname moderation exists.
`highlightRank` highlights every row with that rank.

## v4 extras (from the mockups)

| Component | Props |
| --- | --- |
| `Logo` | `size?`, `withWordmark?` |
| `IconButton` | `label` (required), `icon`, `shape?: "square" \| "circle"` |
| `Sticker` | `children`, `tone?`, `tilt?`, `shape?: "tag" \| "circle"` |
| `Badge` | `tone?`, `size?`, `icon?`, `children` |
| `CategoryTag` / `CategoryTile` | `category: CategoryKey`, `tone?` |
| `TimerDisplay` | `label`, `value` (pre-formatted), `layout?` |
| `Keypad` | `onKey(key)`, `disabled?` |
| `Notice`, `Skeleton`, `Spinner` | small helpers |

Icons: `IconPin`, `IconCap`, `IconBowl`, `IconMuseum`, `IconWaves`, `IconAtom`,
`IconLock`, `IconCalculator`, `IconTrophy`, `IconClose`, `IconBack`,
`IconArrowRight`, `IconBackspace`, `IconCheck` (decorative, `aria-hidden`).

## Open question for Elif + Zeynep

`QuestionPublic` in `docs/API_CONTRACT.md` has no category, but the question
card, chips and summary show one. Suggest adding `category: CategoryKey`
(`"kampus" | "akademik" | "yurt-yemek" | "tarih-kultur" | "eymir-doga" |
"bilim-topluluklar"`) to the public question DTO; it reveals nothing about the
answer. The contract change is yours; Neris only reviews display fields.

## Tests

Component tests go in `tests/ui/components/**` once Elif's shared Vitest/DOM
tooling PR is merged. This branch adds no test tooling.

## Preview

`UiPreview` needs a route to be visible. The proposed `app/ui-preview/page.tsx`
is Zeynep's path, so it ships separately for Zeynep to accept or move.
