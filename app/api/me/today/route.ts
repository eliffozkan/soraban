import { apiResponse } from "../../../../lib/data/http";
import { getMyToday } from "../../../../lib/data/gameplay";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { requireUser } from "../../../../lib/supabase/session";

export async function GET() {
  return apiResponse(async () => {
    const client = await createSupabaseServerClient();
    await requireUser(client);
    return getMyToday(client);
  });
}
