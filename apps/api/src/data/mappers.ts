import type { LearningSentence, Recording, ReviewCard } from "../shared";
import type { RecordingRow, ReviewCardRow, SentenceRow } from "./rows";

function examplesOf(value: SentenceRow["examples"]): LearningSentence["examples"] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is LearningSentence["examples"][number] =>
      typeof item?.expression === "string" && typeof item?.korean === "string",
  );
}

export function toRecording(row: RecordingRow): Recording {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    source: row.source,
    audioPath: row.audio_path,
    status: row.status,
    transcript: row.transcript,
    speakerTranscript: row.speaker_transcript,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export function toSentence(row: SentenceRow): LearningSentence {
  return {
    id: row.id,
    recordingId: row.recording_id,
    userId: row.user_id,
    speaker: row.speaker === "A" || row.speaker === "B" ? row.speaker : null,
    originalText: row.original_text,
    localExpression: row.local_expression,
    koreanMeaning: row.korean_meaning,
    context: row.context,
    examples: examplesOf(row.examples),
    position: row.position,
    saved: row.saved,
    createdAt: row.created_at,
  };
}

export function toReviewCard(row: ReviewCardRow): ReviewCard {
  return {
    id: row.id,
    sentenceId: row.sentence_id,
    userId: row.user_id,
    easeFactor: Number(row.ease_factor),
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
    sentence: toSentence(row.sentences),
  };
}
