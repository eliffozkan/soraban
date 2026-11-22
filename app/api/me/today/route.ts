import { apiResponse } from "../../../../lib/data/http";
import { requireGameplayRepository } from "../../../../lib/data/gameplay";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { requireUser } from "../../../../lib/supabase/session";

export async function GET() {
  return apiResponse(async () => {
    await requireUser(await createSupabaseServerClient());
    return requireGameplayRepository();
  });
}
