import type { LearningSentence, Recording, ReviewCard } from "@/lib/types";

const userId = "sample-user";

export const sampleRecordings: Recording[] = [
  {
    id: "rec-station",
    userId,
    title: "Asking for the station",
    source: "record",
    audioPath: `${userId}/rec-station.m4a`,
    status: "ready",
    transcript: "Excuse me, could you tell me how to get to the station? It's just two stops ahead.",
    errorMessage: null,
    createdAt: "2026-09-23T10:15:00.000Z",
  },
  {
    id: "rec-cafe",
    userId,
    title: "Cafe order",
    source: "upload",
    audioPath: `${userId}/rec-cafe.m4a`,
    status: "ready",
    transcript: "Can I get an iced latte for here? Do you have oat milk?",
    errorMessage: null,
    createdAt: "2026-09-22T08:40:00.000Z",
  },
];

export const sampleSentences: LearningSentence[] = [
  {
    id: "sent-station",
    recordingId: "rec-station",
    userId,
    originalText: "Could you tell me how to get to the station?",
    localExpression: "How do I get to the station?",
    koreanMeaning: "역까지 어떻게 가요?",
    context: "Asked a passerby while looking for the train.",
    examples: [
      { expression: "How do I get to the night market?", korean: "야시장까지 어떻게 가요?" },
      { expression: "Which way is the station?", korean: "역은 어느 쪽이에요?" },
    ],
    position: 0,
    saved: true,
    createdAt: "2026-09-23T10:16:00.000Z",
  },
  {
    id: "sent-stops",
    recordingId: "rec-station",
    userId,
    originalText: "It's just two stops ahead.",
    localExpression: "It's two stops from here.",
    koreanMeaning: "여기서 두 정거장이에요.",
    context: "The passerby described a short ride.",
    examples: [{ expression: "It's one stop from here.", korean: "여기서 한 정거장이에요." }],
    position: 1,
    saved: true,
    createdAt: "2026-09-23T10:16:00.000Z",
  },
  {
    id: "sent-latte",
    recordingId: "rec-cafe",
    userId,
    originalText: "Can I get an iced latte for here?",
    localExpression: "I'll have an iced latte for here.",
    koreanMeaning: "아이스 라떼 한 잔 먹고 갈게요.",
    context: "Ordering at a counter.",
    examples: [{ expression: "I'll have a tea to go.", korean: "차는 포장해 주세요." }],
    position: 0,
    saved: true,
    createdAt: "2026-09-22T08:41:00.000Z",
  },
];

export const sampleReviews: ReviewCard[] = sampleSentences.map((sentence) => ({
  id: `card-${sentence.id}`,
  sentenceId: sentence.id,
  userId,
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  nextReviewAt: "2026-09-24T00:00:00.000Z",
  lastReviewedAt: null,
  sentence,
}));

export function sentencesForRecording(recordingId: string) {
  return sampleSentences.filter((sentence) => sentence.recordingId === recordingId);
}

export function findSentence(sentenceId: string) {
  return sampleSentences.find((sentence) => sentence.id === sentenceId);
}

export function findRecording(recordingId: string) {
  return sampleRecordings.find((recording) => recording.id === recordingId);
}
