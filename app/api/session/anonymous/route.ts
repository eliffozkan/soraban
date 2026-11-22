import { apiResponse, requireSameOrigin } from "../../../../lib/data/http";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { ensureAnonymousSession } from "../../../../lib/supabase/session";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    return ensureAnonymousSession(await createSupabaseServerClient());
  });
}
