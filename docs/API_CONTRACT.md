# SORABAN — proposed API contract v0.1
Status: **proposal; not implemented** | Owners: Elif (provider), Zeynep (consumer), Neris (visual requirements).

## Rules
- JSON camelCase; numeric guesses as finite positive JSON numbers, within the shared 1e15 maximum. The client presents locale-aware parsing confirmation before submission. The question fixes its physical unit.
- Never trust client player IDs, score, answer, day/date, completion status or timestamps.
- Only public prompts/units can be fetched before a committed guess; never include correct value, reasoning or answer-source URL in `GET /api/today`.
- All personalized responses use `Cache-Control: no-store`. Errors have a stable code and safe message, no internal details.
- Dates are server-derived in `Europe/Istanbul`; season start not yet chosen.
- Backend may make narrow changes to these **proposals only with Zeynep's agreement**. Frontend mocks must follow the accepted shapes.

## Shared types (design targets, not shipped code)
```ts
type QuestionPublic = {
  id: string; position: number; prompt: string; unit: string;
  state: "unanswered" | "answered" | "void";
};
type RevealedGuess = {
  questionId: string; guess: number; scoreRaw: number;
  correctAnswer: number; reasoning: string; sourceUrl: string;
};
type DailyProgress = { answeredCount: number; totalCount: 6; completed: boolean; scoreRaw: number | null };
type ApiError = { error: { code: string; message: string } };
```

## GET /api/today — planned
Requires an authenticated Supabase session (anonymous Auth users count). The handler may establish the anonymous session in a separately agreed auth flow. Returns public data and **only this player's** progress.
```json
{
  "day": { "id": "day-uuid", "number": 1, "date": "YYYY-MM-DD" },
  "questions": [
    { "id": "question-uuid", "position": 1, "prompt": "Synthetic example question?", "unit": "adet", "state": "unanswered" }
  ],
  "progress": { "answeredCount": 0, "totalCount": 6, "completed": false, "scoreRaw": null }
}
```
Example is illustrative and not season content. The live response contains exactly six questions when a day is published. For already answered questions, previous reveal data may be obtained from an authenticated `GET /api/me/today` call after permission checks, rather than included by default in the public question list.

## POST /api/guesses — planned
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
  "progress": { "answeredCount": 1, "totalCount": 6, "completed": false, "scoreRaw": null }
}
```
These values are synthetic, not real METU facts. Idempotent retry for the same player/question returns the originally stored result, not another attempt. Invalid/unauthorized/closed-day errors do not reveal correct answers.

## GET /api/me/today — planned
Returns caller-only answered submissions (reveal details for that caller only), progress, and public day identifiers. Never exposes other players' answers. Requires session.

## GET /api/leaderboard?scope=daily|season — planned
Returns ranked entries with moderated public nickname, `scoreRaw`, `rank`, and optional `playedDays`/average for season. Only complete daily attempts appear; official leaderboard eligibility requires linked verified identity. **Implementation is deferred** until authentication + identity-linking rules have been agreed. Scores sorted by raw value; ties share the same rank pending final deterministic tie policy. No email/player-private metadata.

## Integration and failure states
- `401 AUTH_REQUIRED`; `400 INVALID_GUESS`; `404 QUESTION_NOT_FOUND`; `409 ALREADY_SUBMITTED` only if a safe idempotent return is impossible; `409 DAY_CLOSED`; `503 DAY_UNAVAILABLE`. API must select and document behavior before implementation.
- `GET /api/health` is already implemented (liveness only, not DB readiness).
- No cross-origin secrets, no live migrations without approval, and no caching of personalized/revealed payloads.
- Zeynep uses typed mock adapters with the same shapes until the backend endpoints are verified; no need to await working Supabase for UI work.
