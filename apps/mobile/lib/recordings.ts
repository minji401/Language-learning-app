import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import { Platform } from "react-native";

import { apiFetch } from "@/lib/api";
import { currentSession, requireSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";
import type { LearningSentence, Recording, RecordingDetail, RecordingSource, ReviewCard, ReviewGrade } from "@/lib/types";

function createFileId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const contentTypes: Record<string, string> = {
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
  aac: "audio/aac",
  caf: "audio/x-caf",
  "3gp": "audio/3gpp",
};

export function contentTypeForExtension(extension: string, fallback?: string) {
  return contentTypes[extension.toLowerCase()] ?? fallback ?? "application/octet-stream";
}

export function extensionFromName(name: string, fallback: string) {
  const match = name.split("?")[0]?.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? fallback;
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function readAudio(uri: string, file?: Blob): Promise<ArrayBuffer> {
  if (file) {
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0) throw new Error("The recording file was empty.");
    return bytes;
  }

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Could not read the browser recording.");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) throw new Error("The recording file was empty.");
    return bytes;
  }

  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  const bytes = decodeBase64(base64);
  if (bytes.byteLength === 0) throw new Error("The recording file was empty.");
  return bytes;
}

export async function listMyRecordings(): Promise<Recording[]> {
  const session = await currentSession();
  if (!session) return [];

  const body = await apiFetch<{ recordings: Recording[] }>("/recordings", session.access_token);
  return body.recordings;
}

export async function getRecordingDetail(recordingId: string): Promise<RecordingDetail> {
  const session = await requireSession();
  return apiFetch<RecordingDetail>(`/recordings/${recordingId}`, session.access_token);
}

export function sentencesIncludeEnglish(sentences: LearningSentence[]) {
  return sentences.some((sentence) => /[A-Za-z]/.test(sentence.localExpression ?? ""));
}

export function sentencesUseLocalVoice(sentences: LearningSentence[]) {
  return sentences.some((sentence) => /[가-힣]/.test(sentence.context ?? ""));
}

export async function reanalyzeRecording(recordingId: string): Promise<RecordingDetail> {
  const session = await requireSession();
  return apiFetch<RecordingDetail>(`/recordings/${recordingId}/reanalyze`, session.access_token, {
    method: "POST",
  });
}

export async function getLearningSentence(sentenceId: string): Promise<LearningSentence> {
  const session = await requireSession();
  const body = await apiFetch<{ sentence: LearningSentence }>(`/sentences/${sentenceId}`, session.access_token);
  return body.sentence;
}

export async function listNotebookSentences(): Promise<LearningSentence[]> {
  const session = await currentSession();
  if (!session) return [];

  const body = await apiFetch<{ sentences: LearningSentence[] }>("/sentences", session.access_token);
  return body.sentences;
}

export async function listDueReviews(): Promise<ReviewCard[]> {
  const session = await currentSession();
  if (!session) return [];

  const body = await apiFetch<{ cards: ReviewCard[] }>("/reviews/due", session.access_token);
  return body.cards;
}

export async function gradeReview(cardId: string, grade: ReviewGrade): Promise<ReviewCard> {
  const session = await requireSession();
  const body = await apiFetch<{ card: ReviewCard }>(`/reviews/${cardId}/grade`, session.access_token, {
    method: "POST",
    body: JSON.stringify({ grade }),
  });
  return body.card;
}

export async function setLearningSentenceSaved(sentenceId: string, saved: boolean): Promise<LearningSentence> {
  const session = await requireSession();
  const body = await apiFetch<{ sentence: LearningSentence }>(`/sentences/${sentenceId}`, session.access_token, {
    method: "PATCH",
    body: JSON.stringify({ saved }),
  });
  return body.sentence;
}

export async function submitAudio(input: {
  uri: string;
  file?: Blob;
  source: RecordingSource;
  extension: string;
  contentType: string;
  onPhase?: (phase: "uploading" | "analyzing") => void;
}): Promise<string> {
  const session = await requireSession();
  const fileName = `${createFileId()}.${input.extension}`;
  const audioPath = `${session.user.id}/${fileName}`;

  input.onPhase?.("uploading");
  const bytes = await readAudio(input.uri, input.file);
  const { error } = await getSupabase().storage.from("recordings").upload(audioPath, bytes, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const created = await apiFetch<{ recording: Recording }>("/recordings", session.access_token, {
    method: "POST",
    body: JSON.stringify({
      source: input.source,
      audioPath,
      title: input.source === "record" ? "Recorded conversation" : "Uploaded audio",
    }),
  });

  input.onPhase?.("analyzing");
  await apiFetch(`/recordings/${created.recording.id}/process`, session.access_token, {
    method: "POST",
  });

  return created.recording.id;
}
