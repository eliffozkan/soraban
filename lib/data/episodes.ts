import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeNickname } from "../game/nickname";
import { ApiFailure } from "./http";
import { gameplayRpc } from "./gameplay";
import { episodeDto, episodesDto, myEpisodeDto, leaderboardDto, profileDto } from "./gameplay-dto";
import { readJsonBody } from "./json-body";

function slug(value: string): string {
  if (value !== "demo" && value !== "2026-11-22") throw new ApiFailure(404, "EPISODE_NOT_FOUND", "Episode not found.");
  return value;
}
export function getEpisodes(client: SupabaseClient) {
  return gameplayRpc(client, "soraban_episodes", {}, episodesDto);
}
export function getEpisode(client: SupabaseClient, key: string) {
  return gameplayRpc(client, "soraban_episode", { p_slug: slug(key), p_reveal: false }, episodeDto);
}
export function getMyEpisode(client: SupabaseClient, key: string) {
  return gameplayRpc(client, "soraban_episode", { p_slug: slug(key), p_reveal: true }, myEpisodeDto);
}
export function getProfile(client: SupabaseClient) {
  return gameplayRpc(client, "soraban_profile", {}, profileDto);
}
export async function setNickname(client: SupabaseClient, request: Request) {
  const invalid = () => new ApiFailure(400, "INVALID_NICKNAME", "Provide one valid nickname of 2–24 characters.");
  const body = await readJsonBody(request, 512, invalid);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1
    || !Object.hasOwn(body, "nickname")) throw invalid();
  const name = normalizeNickname((body as Record<string, unknown>).nickname);
  if (name === null) throw invalid();
  return gameplayRpc(client, "soraban_set_nickname", { p_nickname: name }, profileDto);
}
export function getLeaderboard(client: SupabaseClient, key: string, url: string) {
  const params = new URL(url).searchParams;
  const invalid = () => new ApiFailure(400, "INVALID_PAGINATION", "Use a limit of 1–100 and offset of 0–10000.");
  for (const name of params.keys()) if ((name !== "limit" && name !== "offset") || params.getAll(name).length !== 1) throw invalid();
  const parse = (value: string, min: number, max: number) => {
    if (!/^(0|[1-9][0-9]{0,4})$/.test(value)) throw invalid();
    const result = Number(value);
    if (result < min || result > max) throw invalid();
    return result;
  };
  return gameplayRpc(client, "soraban_episode_leaderboard", { p_slug: slug(key),
    p_limit: parse(params.get("limit") ?? "50", 1, 100),
    p_offset: parse(params.get("offset") ?? "0", 0, 10000) }, leaderboardDto);
}
