import { HttpError } from "../http";
import { getSupabaseAdmin } from "../lib/supabase";
import type { CreateRecordingInput, ExtractedSentence, RecordingStatus } from "../shared";
import { toRecording, toSentence } from "./mappers";
import type { RecordingRow, SentenceRow } from "./rows";

const recordingColumns =
  "id, user_id, title, source, audio_path, status, transcript, error_message, created_at";

function assertNoError(error: { message: string; code?: string } | null, notFoundMessage?: string) {
  if (!error) return;
  if (error.code === "PGRST116" && notFoundMessage) {
    throw new HttpError(404, notFoundMessage);
  }
  throw new HttpError(500, error.message);
}

export async function listRecordings(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("recordings")
    .select(recordingColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  assertNoError(error);
  return ((data ?? []) as RecordingRow[]).map(toRecording);
}

export async function getRecording(userId: string, recordingId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("recordings")
    .select(recordingColumns)
    .eq("user_id", userId)
    .eq("id", recordingId)
    .single();

  assertNoError(error, "Recording not found");
  return toRecording(data as RecordingRow);
}

export async function createRecording(userId: string, input: CreateRecordingInput) {
  const { data, error } = await getSupabaseAdmin()
    .from("recordings")
    .insert({
      user_id: userId,
      title: input.title ?? null,
      source: input.source,
      audio_path: input.audioPath,
      status: "uploaded",
    })
    .select(recordingColumns)
    .single();

  assertNoError(error);
  return toRecording(data as RecordingRow);
}

export async function updateRecordingStatus(
  userId: string,
  recordingId: string,
  patch: { status: RecordingStatus; transcript?: string | null; errorMessage?: string | null },
) {
  const changes: Record<string, string | null> = { status: patch.status };
  if (patch.transcript !== undefined) changes.transcript = patch.transcript;
  if (patch.errorMessage !== undefined) changes.error_message = patch.errorMessage;

  const { error } = await getSupabaseAdmin()
    .from("recordings")
    .update(changes)
    .eq("user_id", userId)
    .eq("id", recordingId);

  assertNoError(error);
}

export async function listSentencesForRecording(userId: string, recordingId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("sentences")
    .select(
      "id, recording_id, user_id, original_text, local_expression, korean_meaning, context, examples, position, saved, created_at",
    )
    .eq("user_id", userId)
    .eq("recording_id", recordingId)
    .order("position", { ascending: true });

  assertNoError(error);
  return ((data ?? []) as SentenceRow[]).map(toSentence);
}

export async function replaceSentences(userId: string, recordingId: string, sentences: ExtractedSentence[]) {
  const supabase = getSupabaseAdmin();

  const { error: deleteError } = await supabase
    .from("sentences")
    .delete()
    .eq("user_id", userId)
    .eq("recording_id", recordingId);
  assertNoError(deleteError);

  if (sentences.length === 0) return [];

  const { data, error } = await supabase
    .from("sentences")
    .insert(
      sentences.map((sentence, position) => ({
        recording_id: recordingId,
        user_id: userId,
        original_text: sentence.originalText,
        local_expression: sentence.localExpression,
        korean_meaning: sentence.koreanMeaning,
        context: sentence.context,
        examples: sentence.examples,
        position,
        saved: true,
      })),
    )
    .select("id");

  assertNoError(error);
  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);

  const { error: cardError } = await supabase.from("review_cards").insert(
    ids.map((sentenceId) => ({
      sentence_id: sentenceId,
      user_id: userId,
    })),
  );
  assertNoError(cardError);

  return listSentencesForRecording(userId, recordingId);
}
