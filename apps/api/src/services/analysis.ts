import { z } from "zod";

import { config } from "../config";
import { HttpError } from "../http";
import type { ExtractedSentence } from "../shared";

const extractedSchema = z.object({
  sentences: z
    .array(
      z.object({
        originalText: z.string().min(1),
        localExpression: z.string().min(1),
        koreanMeaning: z.string().min(1),
        context: z.string(),
        examples: z
          .array(
            z.object({
              expression: z.string().min(1),
              korean: z.string().min(1),
            }),
          )
          .max(3),
      }),
    )
    .max(8),
});

const instructions = `You extract reusable language-learning sentences from a conversation transcript.
Return JSON with a "sentences" array. Each item has:
- originalText: a sentence from the transcript
- localExpression: the natural way a local speaker would say the same thing
- koreanMeaning: a concise Korean translation
- context: one sentence describing when the line was used
- examples: up to 2 short alternate sentences, each with expression and korean
Keep at most 8 sentences. Skip fillers and lines that are not worth reviewing.`;

export async function analyzeTranscript(transcript: string): Promise<ExtractedSentence[]> {
  if (!config.openAiApiKey) {
    throw new HttpError(503, "OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.analysisModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, "Sentence analysis request failed");
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, "Sentence analysis returned an empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HttpError(502, "Sentence analysis returned invalid JSON");
  }

  const result = extractedSchema.safeParse(parsed);
  if (!result.success) {
    throw new HttpError(502, "Sentence analysis did not match the expected shape");
  }

  return result.data.sentences;
}
