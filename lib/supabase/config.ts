/** Lazy validation keeps placeholder pages/builds independent of credentials. */
export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set the public URL and publishable key.");
  }
  return { url, key };
}
