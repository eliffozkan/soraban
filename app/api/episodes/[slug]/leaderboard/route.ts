import { apiResponse } from "../../../../../lib/data/http";
import { getLeaderboard } from "../../../../../lib/data/episodes";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { verifiedUser } from "../../../../../lib/supabase/session";

export function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return apiResponse(async () => {
    const client = await createSupabaseServerClient();
    await verifiedUser(client); // Missing session is public; invalid sessions fail closed.
    return getLeaderboard(client, (await context.params).slug, request.url);
  });
}
