import { apiResponse, requireSameOrigin } from "../../../../lib/data/http";
import { setNickname } from "../../../../lib/data/episodes";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { requireUser } from "../../../../lib/supabase/session";
export { GET } from "../profile/route";

export function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const client = await createSupabaseServerClient();
    await requireUser(client);
    return setNickname(client, request);
  });
}
