import { apiResponse } from "../../../../lib/data/http";
import { getProfile } from "../../../../lib/data/episodes";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { requireUser } from "../../../../lib/supabase/session";

export function GET() {
  return apiResponse(async () => {
    const client = await createSupabaseServerClient();
    await requireUser(client);
    return getProfile(client);
  });
}
