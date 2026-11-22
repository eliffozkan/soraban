# SORABAN — API contract v0.2 (five-question MVP)
Status: backend implemented; SQL unapplied and database integration unverified. Elif owns the confirmed MVP update; Zeynep reviews the client migration and Neris reviews category/display impact before merge. Frontend-owned files are unchanged in this backend PR.

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
  category?: "kampus" | "akademik" | "yurt-yemek" | "tarih-kultur" | "eymir-doga" | "bilim-topluluklar";
  state: "unanswered" | "answered" | "void";
};
type RevealedGuess = {
  questionId: string; guess: number; scoreRaw: number;
  correctAnswer: number; reasoning: string; sourceUrl: string;
};
type DailyProgress = { answeredCount: number; totalCount: number; completed: boolean; scoreRaw: number | null };
type ApiError = { error: { code: string; message: string } };
```

## POST /api/session/anonymous
Elif owns this endpoint. If an authenticated Supabase session exists, preserve it and return its anonymity status; otherwise establish a new anonymous Supabase Auth session with secure SSR cookies. Zeynep calls it through a single client adapter before `GET /api/today`; Neris supplies only UI states. The endpoint is idempotent with respect to an existing valid session; do not replace a linked identity. No tokens or raw identifiers are returned. No-store response example: `{ "status": "ready", "isAnonymous": true }`. Fail safely on auth-service errors or rate limits. See `docs/INTEGRATION_DECISIONS.md` for ownership and tests.

## GET /api/today
Requires an authenticated Supabase session (anonymous Auth users count). The handler NEVER creates an account; call `POST /api/session/anonymous` first. Returns public data and **only this player's** progress.
```json
{
  "day": { "id": "day-uuid", "number": 1, "date": "YYYY-MM-DD" },
  "questions": [
    { "id": "question-uuid", "position": 1, "prompt": "Synthetic example question?", "unit": "adet", "state": "unanswered" }
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
- Client migration checklist: replace literal-six progress counts with `number`, use five mock positions, add optional category, keep the proposed `MyTodayResponse`, and map the documented HTTP failures. All `lib/client/**` and UI/mock test edits remain with Zeynep. Do not switch the real UI adapter before approved DB/Auth/HTTP verification.
