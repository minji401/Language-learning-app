import { HttpError } from "../http";
import { getSupabaseAdmin } from "../lib/supabase";
import type { SrsState } from "../services/srs";
import { toReviewCard } from "./mappers";
import type { ReviewCardRow } from "./rows";

const reviewSelect = `
  id, sentence_id, user_id, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at,
  sentences!inner (
    id, recording_id, user_id, original_text, local_expression, korean_meaning, context, examples, position, saved, created_at
  )
`;

export async function listDueReviews(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("review_cards")
    .select(reviewSelect)
    .eq("user_id", userId)
    .eq("sentences.saved", true)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true });

  if (error) throw new HttpError(500, error.message);
  return ((data ?? []) as unknown as ReviewCardRow[]).map(toReviewCard);
}

export async function getReviewCard(userId: string, cardId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("review_cards")
    .select(reviewSelect)
    .eq("user_id", userId)
    .eq("id", cardId)
    .single();

  if (error?.code === "PGRST116") throw new HttpError(404, "Review card not found");
  if (error) throw new HttpError(500, error.message);
  return toReviewCard(data as unknown as ReviewCardRow);
}

export async function saveReviewSchedule(userId: string, cardId: string, next: SrsState) {
  const { error } = await getSupabaseAdmin()
    .from("review_cards")
    .update({
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      next_review_at: next.nextReviewAt,
      last_reviewed_at: next.lastReviewedAt,
    })
    .eq("user_id", userId)
    .eq("id", cardId);

  if (error) throw new HttpError(500, error.message);
  return getReviewCard(userId, cardId);
}
