import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { config } from "../config";
import { HttpError } from "../http";

let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new HttpError(503, "Supabase is not configured on the API");
  }

  client ??= createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
