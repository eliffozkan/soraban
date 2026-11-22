# SORABAN design system

Owner: Neris | Status: v0.3, 22 November 2026 | Source: team-selected v4 mockups
(web/mobile "Giriş" and "Tahmin" screens)

Bold, friendly and printed-looking: cream ground, navy ink, thick 2 px outlines,
hard offset shadows, flat yellow / blue / pink / green fields, tilted stickers and
heavy expanded type. Original work: no fermi.tr colours, layout, copy or assets.
The mockups still say "GAUSS"; the code uses the current name, SORABAN.

## Principles

- **Mobile first.** Everything works at 360 px. Touch targets are at least 44 px.
- **One blue action per screen.** Blue is the primary button (OYNA, KİLİTLE).
- **Outline + shadow = interactive or important.** Inputs, buttons and the main
  card get the hard shadow; plain tiles get only the outline.
- **Colour never carries meaning alone.** Errors are pink **and** worded; score
  colours always sit next to the number.
- **Numbers are the hero.** Display type, tabular figures, Turkish formatting
  (`8.500`, `73,5`), the unit always beside the value.
- **Presentation only.** Components take data through props;
  see [components.md](components.md).

## Tokens

Defined in `app/globals.css` under `@theme`, so Tailwind generates `bg-cream`,
`text-ink`, `border-ink`, `rounded-lg`, `shadow-hard`, and so on.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `cream` | `#fff6e5` | Page background | ink 15.9:1 |
| `paper` | `#fffdf6` | Tiles, secondary buttons, keypad | ink 16.8:1 |
| `surface` | `#ffffff` | Desktop input field | ink 17.1:1 |
| `ink` | `#161a33` | Text, outlines, shadows | |
| `ink-muted` | `#4b4f6a` | Secondary text | 7.5:1 on cream |
| `yellow` | `#ffc800` | Main card, phone input | ink 11.0:1 |
| `blue` | `#2e4bff` | Primary action, current step | **white text only**, 5.9:1 |
| `blue-strong` | `#1f37d6` | Primary hover | white 7.6:1 |
| `pink` | `#ff3d7f` | Category tag, errors, stickers | ink 5.1:1 |
| `green` | `#00c27a` | Shortcut chips, success | ink 7.3:1 |
| `focus` | `#2e4bff` | 3 px focus ring, 3 px offset | 5.5:1 on cream |

Ink on blue is 2.9:1, so blue surfaces always use white text.

| Shape | Value |
| --- | --- |
| Outline | `border-2 border-ink` everywhere |
| `shadow-hard` / `-sm` / `-xs` | 6 / 4 / 2 px offset, no blur, ink |
| `rounded-sm` / `-md` / `-lg` | 10 / 16 / 24 px; pills use `rounded-full` |
| Pressed button | moves by its shadow offset and the shadow disappears |

## Type

**Archivo** (variable weight and width, SIL OFL 1.1) is self-hosted from
`public/brand/fonts/` so builds still need no font download. Two subsets
(latin + latin-ext) cover Turkish (ç ğ ı İ ö ş ü).

- `display` utility: weight 850, width 112 %, tight leading. Titles, numbers,
  big buttons, stickers.
- `eyebrow` utility: 13 px, weight 800, 0.12 em tracking, capitals
  ("TAHMİNİN", "GÜNÜN BULMACASI"). Relies on `<html lang="tr">` so `i → İ`.
- Body: Archivo regular/medium 16 px.

Font choice was read from the mockups. If the mockup file names another font,
swap the two woff2 files and the `@font-face` rules; nothing else changes.

## Categories

Six display entries in `CATEGORIES` (`components/ui/categories.ts`): label,
short phone label, icon and default tile colour, as in the home mockup. The API
DTO does not yet carry a category; see the open question in components.md.

## Accessibility checklist

- Visible 3 px blue focus ring on every control.
- Inputs have visible labels; hint, confirmation and error linked with
  `aria-describedby`; errors set `aria-invalid`.
- Confirmation is `aria-live="polite"`; danger notices and `StatusState` errors use
  `role="alert"`; the share result is announced politely.
- `RevealCard` renders the source link only for absolute http(s) URLs and opens it
  with `rel="noopener noreferrer"`.
- `LeaderboardTable` is a real `<table>` with a caption and column headers.
- Progress is a `nav` + ordered list with `aria-current="step"` and spoken state
  for each question.
- Icon-only buttons require a `label`. Keypad keys for "," and backspace have
  spoken names.
- Motion (button press, chip press, spinner, skeleton, score pop) is disabled
  under `prefers-reduced-motion`.

## Not yet decided

- Dark theme.
- Share image design.
- Final icon set review (current icons are simple original line drawings).
