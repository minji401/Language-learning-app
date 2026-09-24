import { HttpError } from "../http";
import { getSupabaseAdmin } from "../lib/supabase";
import { toSentence } from "./mappers";
import type { SentenceRow } from "./rows";

const sentenceColumns =
  "id, recording_id, user_id, original_text, local_expression, korean_meaning, context, examples, position, saved, created_at";

export async function getSentence(userId: string, sentenceId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("sentences")
    .select(sentenceColumns)
    .eq("user_id", userId)
    .eq("id", sentenceId)
    .single();

  if (error?.code === "PGRST116") throw new HttpError(404, "Sentence not found");
  if (error) throw new HttpError(500, error.message);
  return toSentence(data as SentenceRow);
}

export async function setSentenceSaved(userId: string, sentenceId: string, saved: boolean) {
  const { data, error } = await getSupabaseAdmin()
    .from("sentences")
    .update({ saved })
    .eq("user_id", userId)
    .eq("id", sentenceId)
    .select(sentenceColumns)
    .single();

  if (error?.code === "PGRST116") throw new HttpError(404, "Sentence not found");
  if (error) throw new HttpError(500, error.message);
  return toSentence(data as SentenceRow);
}
