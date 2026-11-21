# Data access boundary

Future repositories here must import `server-only`. Route Handlers authenticate the
caller and call repositories; UI receives explicit safe DTOs, never answer rows.
Use the request-scoped Supabase server client for RLS-scoped reads.

No queries or privileged client are needed for setup. Before gameplay, review a
transactional submission operation that checks the server's Istanbul date, inserts
the unique guess atomically, computes its score, and only then returns the answer,
reasoning and source. Derive player ID from verified auth, never request JSON.
Do not use an RLS-bypassing credential as a substitute for authorization.
