/** Liveness only. No Supabase connection or configuration disclosure. */
export function GET() {
  return Response.json(
    { status: "ok", service: "soraban" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
