import type { Session } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";

export async function currentSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function requireSession(): Promise<Session> {
  const existing = await currentSession();
  if (existing) return existing;

  const { data, error } = await getSupabase().auth.signInAnonymously();
  if (error || !data.session) {
    const message = error?.message ?? "";
    if (message.toLowerCase().includes("anonymous")) {
      throw new Error(
        "Turn on Anonymous sign-ins in the Supabase dashboard under Authentication, then record again.",
      );
    }
    throw new Error(message || "Sign-in is required before uploading audio.");
  }

  return data.session;
}
