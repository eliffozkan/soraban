# Gameplay data boundary

The server-only gameplay repository uses the request-scoped user-authenticated
client and one RPC per operation: soraban_today, soraban_my_today or
soraban_submit_guess. No service key, direct answer query, player ID or score
is accepted from the client. Handlers remain thin and independently authorize.

The DTO parser explicitly selects fields, dropping unexpected private columns.
Missing schema/RPCs, unknown DB errors and malformed responses become safe
503 DAY_UNAVAILABLE failures. Known auth/input/closed-day errors have fixed safe
messages. Responses are private/no-store; guesses accept bounded JSON only and
reveal only after the awaited RPC succeeds.

See docs/API_CONTRACT.md for the wire contract and client-owner checklist,
docs/SCHEMA_REVIEW.md for permissions/locks, and supabase/tests/README.md for the
approval-gated disposable test. SQL remains unapplied and HTTP tests mock Supabase.
Frontend mocks/types and UI primitives stay with Zeynep/Neris. Milestone 1 session
bootstrap/refresh remains, including its process-local (not distributed) limit.
