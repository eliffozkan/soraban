import { apiResponse } from "../../../../../lib/data/http";
import { getMyEpisode } from "../../../../../lib/data/episodes";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { requireUser } from "../../../../../lib/supabase/session";

export function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  return apiResponse(async () => {
    const client = await createSupabaseServerClient();
    await requireUser(client);
    return getMyEpisode(client, (await context.params).slug);
  });
}
