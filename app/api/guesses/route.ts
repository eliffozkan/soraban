import { apiResponse, requireSameOrigin } from "../../../lib/data/http";
import { readGuessRequest } from "../../../lib/data/guess-request";
import { requireGameplayRepository } from "../../../lib/data/gameplay";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/supabase/session";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    await requireUser(await createSupabaseServerClient());
    await readGuessRequest(request);
    return requireGameplayRepository();
  });
}
