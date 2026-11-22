# SORABAN — API contract v0.3 (presentation episodes; legacy season API retained)
Status: backend implemented; SQL unapplied and database integration unverified. Elif owns the confirmed MVP update; Zeynep reviews the client migration and Neris reviews category/display impact before merge. Frontend-owned files are unchanged in this backend PR.

## Presentation MVP — additive contract for Zeynep

Two independent published episodes: `demo` (`date: null`) and `2026-11-22`
(`date: "2026-11-22"`). Each has five different questions. Both remain playable
regardless of the calendar and do not belong to the 30-day season. An identity has
one saved attempt per question; Demo is reusable for new audiences, not a reset of
an existing player's scores. Reloads resume that identity's progress.

| Endpoint | Session | Response |
| --- | --- | --- |
| `GET /api/episodes` | Optional | `{ episodes: Episode[] }`, published episodes only |
| `GET /api/episodes/{slug}` | Required | `{ episode, questions: QuestionPublic[], progress }` |
| `GET /api/me/episodes/{slug}` | Required | `{ episode, guesses: RevealedGuess[], progress }` |
| `POST /api/guesses` | Required | Unchanged `{ questionId, guess }` → `{ guess, progress }`; the question determines its episode |
| `GET /api/me/profile` | Required | `Profile`, private to the caller |
| `POST /api/me/nickname` | Required, same Origin | `{ nickname: string }` → `Profile` |
| `GET /api/episodes/{slug}/leaderboard?limit=50&offset=0` | Optional | `{ episode, status: "ready", entries, me, totalPlayers, limit, offset }` |

```ts
type Episode = { id: string; slug: "demo" | "2026-11-22"; title: string; date: string | null; totalCount: number };
type Profile = { nickname: string | null; displayName: string; nicknameApproved: boolean;
  nicknameLocked: boolean; leaderboardHidden: boolean };
type EpisodeRank = { rank: number; nickname: string; scoreRaw: number };
```

Episode `id` is public content metadata, never a player ID. Rankings expose only
`EpisodeRank` fields. `me` is the caller's entry even outside the current page,
or null when incomplete, hidden or logged out. Complete anonymous players qualify
for these presentation boards without Google linking. Same raw score shares rank
(1,1,3); ordering is raw score descending, completion time ascending, then private
player UUID. Pagination limit is 1–100, offset 0–10000. Scores and ranks never mix
between episodes or with the future official season board.

Nicknames use NFKC, trimmed/collapsed spaces, 2–24 ASCII/Turkish letters, digits,
spaces, `_` or `-`, with a letter/digit first; controls/markup are rejected. SQL
adds basic profanity/impersonation filtering. Changes are limited in the database
to one per minute and five per hour per identity. Repeating the same normalized
name is idempotent. Names start unapproved; public display is `Anonim oyuncu`
until owner approval. Changes revoke name approval but never clear a hide/lock.
Hidden players are absent from boards. Nicknames are not globally unique accounts.

New safe errors: `400 INVALID_NICKNAME`, `400 INVALID_PAGINATION`,
`403 NICKNAME_LOCKED`, `404 EPISODE_NOT_FOUND`, `429 RATE_LIMITED` (Retry-After: 60).
Missing migrations/RPCs still return safe 503. All new responses remain no-store.
The old calendar endpoints below remain season-only with unchanged envelopes.
Zeynep owns the new adapter/selector/profile/leaderboard integration; no frontend
types or files are edited by this backend change. Runtime verification and ten
privately verified questions are required before calling either episode live.

## Rules
- JSON camelCase; numeric guesses as finite positive JSON numbers, within the shared 1e15 maximum. The client presents locale-aware parsing confirmation before submission. The question fixes its physical unit.
- Never trust client player IDs, score, answer, day/date, completion status or timestamps.
- Only public prompts/units and optional category can be fetched before a committed guess; never include correct value, reasoning or answer-source URL in `GET /api/today`, even for answered questions.
- All personalized responses use `Cache-Control: no-store`. Errors have a stable code and safe message, no internal details.
- Dates are server-derived in `Europe/Istanbul`; season start not yet chosen.
- Backend may make narrow changes to these **proposals only with Zeynep's agreement**. Frontend mocks must follow the accepted shapes.

## Shared wire types
```ts
type QuestionPublic = {
  id: string; position: number; prompt: string; unit: string;
  state: "unanswered" | "answered" | "void";
  category?: CategoryKey; // optional; see "Question category" below
};
type RevealedGuess = {
  questionId: string; guess: number; scoreRaw: number;
  correctAnswer: number; reasoning: string; sourceUrl: string;
};
type DailyProgress = { answeredCount: number; totalCount: 5; completed: boolean; scoreRaw: number | null };
type ApiError = { error: { code: string; message: string } };
```

## Question category — accepted 22 Nov 2026
`category` is optional on `QuestionPublic`. Allowed values are the six keys in `components/ui/categories.ts` (`CategoryKey`: `kampus`, `akademik`, `yurt-yemek`, `tarih-kultur`, `eymir-doga`, `bilim-topluluklar`); do not keep a second application category list. It reveals nothing about the answer. When missing, the UI shows no category. Backend validation uses that existing registry; the unapplied SQL CHECK mirrors it for database validation.

## Questions per day — accepted 22 Nov 2026
Each day has **five** fixed question positions (`position` 1–5, 1-based; UI progress uses the same numbering). `totalCount` is 5.
Backend counts/aggregation derive from actual rows rather than a fixed denominator. A future publication-count change requires coordinated SQL/contract/client changes; this MVP preserves the accepted literal-five client type.

## POST /api/session/anonymous
Elif owns this endpoint. If an authenticated Supabase session exists, preserve it and return its anonymity status; otherwise establish a new anonymous Supabase Auth session with secure SSR cookies. Zeynep calls it through a single client adapter before `GET /api/today`; Neris supplies only UI states. The endpoint is idempotent with respect to an existing valid session; do not replace a linked identity. No tokens or raw identifiers are returned. No-store response example: `{ "status": "ready", "isAnonymous": true }`. Fail safely on auth-service errors or rate limits. See `docs/INTEGRATION_DECISIONS.md` for ownership and tests.

## GET /api/today
Requires an authenticated Supabase session (anonymous Auth users count). The handler NEVER creates an account; call `POST /api/session/anonymous` first. Returns public data and **only this player's** progress.
```json
{
  "day": { "id": "day-uuid", "number": 1, "date": "YYYY-MM-DD" },
  "questions": [
    { "id": "question-uuid", "position": 1, "prompt": "Synthetic example question?", "unit": "adet", "state": "unanswered", "category": "kampus" }
  ],
  "progress": { "answeredCount": 0, "totalCount": 5, "completed": false, "scoreRaw": null }
}
```
The one-question excerpt above is illustrative, not season content. A published day has five ordered positions; `totalCount` comes from their actual count. Category is omitted when absent, never a made-up fallback. `answeredCount` and completion exclude void questions; a completed voided day may have `answeredCount < totalCount`. `scoreRaw` is null until complete, then the unrounded nonvoid mean (including a legitimate zero). Reveals are available only through authenticated `/api/me/today` or committed submission responses.

## POST /api/guesses
```json
{ "questionId": "question-uuid", "guess": 1250 }
```
Server validates identity, question, clock, bounds and single immutable guess; the database transaction computes/stores the score. Only **after transaction commit**, return:
```json
{
  "guess": {
    "questionId": "question-uuid", "guess": 1250, "scoreRaw": 84.9485002168,
    "correctAnswer": 2500, "reasoning": "Synthetic example reasoning",
    "sourceUrl": "https://example.org/synthetic"
  },
  "progress": { "answeredCount": 1, "totalCount": 5, "completed": false, "scoreRaw": null }
}
```
These values are synthetic, not real METU facts. Idempotent retry for the same player/question returns the originally stored result, not another attempt. Invalid/unauthorized/closed-day errors do not reveal correct answers.
The body permits only these two fields, is limited to 1024 UTF-8 bytes, and must be JSON. A changed-guess retry returns the first guess; a malformed retry is still rejected. A committed retry remains readable after midnight or voiding. New past/future/unpublished/void guesses cannot score. Submission progress belongs to the question's day, including retries after midnight.

## GET /api/me/today
Adopts the envelope proposed in Zeynep's merged adapter:
```ts
type MyTodayResponse = { day: GameDay; guesses: RevealedGuess[]; progress: DailyProgress };
```
Requires session; returns only this caller's committed submissions in position order, including previously answered void positions. Never returns an unanswered question's reveal. `progress` excludes void positions. Both GET endpoints derive one current day from the database's Europe/Istanbul clock, then check it again after lock waits; they create no Auth accounts.

## GET /api/leaderboard?scope=daily|season — planned
Returns ranked entries with moderated public nickname, `scoreRaw`, `rank`, and optional `playedDays`/average for season. Only complete daily attempts appear; official leaderboard eligibility requires linked verified identity. **Implementation is deferred** until authentication + identity-linking rules have been agreed. Scores sorted by raw value; ties share the same rank pending final deterministic tie policy. No email/player-private metadata.

## Integration and failure states
- `401 AUTH_REQUIRED`: no valid identity. `400 INVALID_GUESS`: malformed JSON/UUID, extra fields, invalid number, wrong content type or oversized body. `403 ORIGIN_FORBIDDEN`: POST lacks a matching browser Origin or is cross-site.
- `404 QUESTION_NOT_FOUND`: unknown, unpublished or future question. `409 DAY_CLOSED`: a new guess for a past or void question. Valid duplicate requests return 200 with the saved result; no `ALREADY_SUBMITTED` error is currently needed.
- `503 DAY_UNAVAILABLE`: no published day, missing schema/RPC, incomplete publication, DB failure or malformed RPC result. `503 SERVICE_UNAVAILABLE`: missing public configuration or unexpected server failure. `503 AUTH_UNAVAILABLE` and `429 AUTH_RATE_LIMITED` are the existing session failures (`Retry-After: 60` on 429). Zeynep's proposed `RATE_LIMITED` client mapping needs adapter review; no frontend file is silently changed here.
- `GET /api/health` is already implemented (liveness only, not DB readiness).
- No cross-origin secrets, no live migrations without approval, and no caching of personalized/revealed payloads.
- Zeynep uses typed mock adapters with the same shapes until the backend endpoints are verified; no need to await working Supabase for UI work.
- Client integration checklist: five positions/category are already merged in PR #8 and remain unchanged. This backend accepts Zeynep's `MyTodayResponse`; review void-completion semantics and map the documented HTTP failures in her real adapter. All client/UI test edits remain with Zeynep. Do not switch adapters before approved DB/Auth/HTTP verification.
