import { apiResponse } from "../../../lib/data/http";
import { getEpisodes } from "../../../lib/data/episodes";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export function GET() {
  return apiResponse(async () => getEpisodes(await createSupabaseServerClient()));
}
