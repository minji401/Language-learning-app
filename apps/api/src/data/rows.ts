import type { ExampleSentence, RecordingSource, RecordingStatus } from "../shared";

export interface RecordingRow {
  id: string;
  user_id: string;
  title: string | null;
  source: RecordingSource;
  audio_path: string;
  status: RecordingStatus;
  transcript: string | null;
  speaker_transcript: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SentenceRow {
  id: string;
  recording_id: string;
  user_id: string;
  speaker: "A" | "B" | null;
  original_text: string;
  local_expression: string | null;
  korean_meaning: string | null;
  context: string | null;
  examples: ExampleSentence[] | null;
  position: number;
  saved: boolean;
  created_at: string;
}

export interface ReviewCardRow {
  id: string;
  sentence_id: string;
  user_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  sentences: SentenceRow;
}
