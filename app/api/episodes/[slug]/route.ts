import { apiResponse } from "../../../../lib/data/http";
import { getEpisode } from "../../../../lib/data/episodes";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { requireUser } from "../../../../lib/supabase/session";

export function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  return apiResponse(async () => {
    const client = await createSupabaseServerClient();
    await requireUser(client);
    return getEpisode(client, (await context.params).slug);
  });
}
