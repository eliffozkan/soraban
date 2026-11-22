import { apiResponse, requireSameOrigin } from "../../../lib/data/http";
import { readGuessRequest } from "../../../lib/data/guess-request";
import { submitGuess } from "../../../lib/data/gameplay";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/supabase/session";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const client = await createSupabaseServerClient();
    await requireUser(client);
    return submitGuess(client, await readGuessRequest(request));
  });
}
