export type RecordingSource = "record" | "upload";

export type RecordingStatus =
  | "uploaded"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "failed";

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export interface ExampleSentence {
  expression: string;
  korean: string;
}

export interface Recording {
  id: string;
  userId: string;
  title: string | null;
  source: RecordingSource;
  audioPath: string;
  status: RecordingStatus;
  transcript: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface LearningSentence {
  id: string;
  recordingId: string;
  userId: string;
  originalText: string;
  localExpression: string | null;
  koreanMeaning: string | null;
  context: string | null;
  examples: ExampleSentence[];
  position: number;
  saved: boolean;
  createdAt: string;
}

export interface ReviewCard {
  id: string;
  sentenceId: string;
  userId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  sentence: LearningSentence;
}

export interface RecordingDetail {
  recording: Recording;
  sentences: LearningSentence[];
}

export interface CreateRecordingInput {
  title?: string;
  source: RecordingSource;
  audioPath: string;
}

export interface UpdateSentenceInput {
  saved: boolean;
}

export interface GradeReviewInput {
  grade: ReviewGrade;
}

export interface ExtractedSentence {
  originalText: string;
  localExpression: string;
  koreanMeaning: string;
  context: string;
  examples: ExampleSentence[];
}
