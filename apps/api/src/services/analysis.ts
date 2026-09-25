import { config } from "../config";
import { HttpError } from "../http";
import type { ExtractedSentence, SpeakerRole } from "../shared";

export interface DiarizedAnalysis {
  speakerTranscript: string;
  sentences: ExtractedSentence[];
}

const speakerEnum = { type: "string", enum: ["A", "B"] } as const;

const sentenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    turns: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          speaker: speakerEnum,
          text: { type: "string" },
        },
        required: ["speaker", "text"],
      },
    },
    sentences: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          speaker: speakerEnum,
          originalText: { type: "string" },
          localExpression: { type: "string" },
          koreanMeaning: { type: "string" },
          context: { type: "string" },
          examples: {
            type: "array",
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                expression: { type: "string" },
                korean: { type: "string" },
              },
              required: ["expression", "korean"],
            },
          },
        },
        required: ["speaker", "originalText", "localExpression", "koreanMeaning", "context", "examples"],
      },
    },
  },
  required: ["turns", "sentences"],
} as const;

const instructions = `You turn a real recording transcript into spoken-English study cards. You must not invent dialogue.

The transcript is everything that was said. Lines that already start with "A:" or "B:" were labeled from the audio. Keep those speakers and do not merge them into one person.
If there are no speaker labels, Speaker A is the person who recorded and Speaker B is someone else who actually spoke. If only one person spoke, every turn is Speaker A. Do not invent a second speaker, and do not write a reply that nobody said.
A question mentioned inside the recording is not an invitation to answer it.

Return JSON with:
- turns: only lines from the transcript, in order. speaker is "A" or "B". text is what that person said, not a paraphrase and not a new sentence.
- sentences: at most 6 cards. Each card must restate a line that appears in the transcript.
  When both speakers really spoke, prefer Speaker B's lines.
  When only Speaker A spoke, use Speaker A's lines. Never fill the list with imagined answers.

Each sentence has:
- speaker: "A" or "B", matching the person who said originalText
- originalText: a short line copied from the transcript, in the language it was spoken
- localExpression: natural spoken English for that same line only. Same meaning as originalText. Latin letters. Never Korean. Do not add facts, advice, or an answer that was not spoken.
- koreanMeaning: a natural Korean gloss of localExpression
- context: one Korean sentence describing when this recorded line was used
- examples: up to 2 other spoken-English ways to say the same recorded meaning. expression is English. korean is Korean. Do not introduce a new topic.

Skip fillers. Prefer 2 to 5 lines.`;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function speakerOf(value: unknown): SpeakerRole | null {
  const raw = text(value).toUpperCase().replace(/^SPEAKER\s+/, "");
  if (raw === "A" || raw === "USER") return "A";
  if (raw === "B" || raw === "LOCAL") return "B";
  return null;
}

function stripMarkdownFence(value: string) {
  const trimmed = value.trim().replace(/^\uFEFF/, "");
  const fenced = trimmed.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed.replace(/^```(?:json|JSON)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function sliceJsonValue(value: string) {
  const start = value.search(/[{[]/);
  if (start < 0) return value;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") stack.push(char);
    else if (char === "}" || char === "]") {
      stack.pop();
      if (stack.length === 0) return value.slice(start, index + 1);
    }
  }

  return value.slice(start);
}

function parseModelJson(content: string): unknown {
  const cleaned = sliceJsonValue(stripMarkdownFence(content));
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function normalizeExamples(value: unknown): ExtractedSentence["examples"] {
  if (!Array.isArray(value)) return [];
  const examples: ExtractedSentence["examples"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const expression = text(record.expression ?? record.localExpression ?? record.english);
    const korean = text(record.korean ?? record.koreanMeaning ?? record.meaning);
    if (!expression || !korean) continue;
    examples.push({ expression, korean });
    if (examples.length === 2) break;
  }
  return examples;
}

function missingFields(record: Record<string, unknown>) {
  const missing: string[] = [];
  if (!text(record.originalText ?? record.original ?? record.source)) missing.push("originalText");
  if (!text(record.localExpression ?? record.expression ?? record.english)) missing.push("localExpression");
  if (!text(record.koreanMeaning ?? record.korean ?? record.meaning)) missing.push("koreanMeaning");
  return missing;
}

function normalizeTurns(parsed: unknown) {
  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const list = Array.isArray(root.turns) ? root.turns : [];
  const turns: { speaker: SpeakerRole; text: string }[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const speaker = speakerOf(record.speaker);
    const line = text(record.text ?? record.line);
    if (!speaker || !line) continue;
    turns.push({ speaker, text: line });
    if (turns.length === 40) break;
  }
  return turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n");
}

function normalizeExtracted(parsed: unknown): { sentences: ExtractedSentence[]; dropped: string[] } {
  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const list = Array.isArray(root.sentences)
    ? root.sentences
    : Array.isArray(root.items)
      ? root.items
      : Array.isArray(parsed)
        ? parsed
        : [];

  const sentences: ExtractedSentence[] = [];
  const dropped: string[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") {
      dropped.push("item");
      continue;
    }
    const record = item as Record<string, unknown>;
    const gaps = missingFields(record);
    if (gaps.length > 0) {
      dropped.push(gaps.join("+"));
      continue;
    }
    sentences.push({
      speaker: speakerOf(record.speaker) ?? "B",
      originalText: text(record.originalText ?? record.original ?? record.source),
      localExpression: text(record.localExpression ?? record.expression ?? record.english),
      koreanMeaning: text(record.koreanMeaning ?? record.korean ?? record.meaning),
      context: text(record.context ?? record.note ?? record.why),
      examples: normalizeExamples(record.examples),
    });
    if (sentences.length === 6) break;
  }
  return { sentences, dropped };
}

function hasEnglish(value: string) {
  return /[A-Za-z]/.test(value);
}

function keepSpokenEnglish(sentences: ExtractedSentence[]) {
  return sentences
    .filter((sentence) => hasEnglish(sentence.localExpression))
    .map((sentence) => ({
      ...sentence,
      examples: sentence.examples.filter((example) => hasEnglish(example.expression)),
    }));
}

async function requestSentences(transcript: string, correction?: string): Promise<DiarizedAnalysis> {
  const messages = [
    { role: "system", content: instructions },
    { role: "user", content: transcript },
  ];
  if (correction) {
    messages.push({ role: "user", content: correction });
  }

  let response = await requestAnalysis(messages, "schema");
  if (!response.ok) {
    console.error("[analysis] schema request status", response.status);
    response = await requestAnalysis(messages, "object");
  }

  if (!response.ok) {
    console.error("[analysis] openai status", response.status);
    throw new HttpError(502, "Sentence analysis request failed");
  }

  let body: { choices?: { message?: { content?: string } }[] };
  try {
    body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  } catch {
    throw new HttpError(502, "Sentence analysis returned invalid JSON");
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new HttpError(502, "Sentence analysis returned an empty response");

  const parsed = parseModelJson(content);
  if (parsed === null) {
    console.error("[analysis] could not parse model text after removing markdown");
    throw new HttpError(502, "Sentence analysis returned invalid JSON");
  }

  const { sentences, dropped } = normalizeExtracted(parsed);
  if (dropped.length > 0) {
    console.error("[analysis] dropped sentences missing", dropped.join(", "));
  }
  if (!sentences.length) {
    const reason = dropped.length > 0 ? dropped.join(", ") : "no sentences";
    throw new HttpError(502, `Sentence analysis did not match the expected shape (${reason})`);
  }

  return { speakerTranscript: normalizeTurns(parsed), sentences };
}

async function requestAnalysis(messages: { role: string; content: string }[], format: "schema" | "object") {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.analysisModel,
      response_format:
        format === "schema"
          ? {
              type: "json_schema",
              json_schema: {
                name: "local_sentences",
                strict: true,
                schema: sentenceSchema,
              },
            }
          : { type: "json_object" },
      messages,
    }),
  });
}

export async function analyzeTranscript(transcript: string): Promise<DiarizedAnalysis> {
  if (!config.openAiApiKey) {
    throw new HttpError(503, "OPENAI_API_KEY is not configured");
  }

  try {
    const first = await requestSentences(transcript);
    const firstSentences = keepSpokenEnglish(first.sentences);
    if (firstSentences.length > 0) {
      return { speakerTranscript: first.speakerTranscript, sentences: firstSentences };
    }

    const second = await requestSentences(
      transcript,
      "Rewrite the JSON using only words from the transcript. Do not invent a second speaker or an answer that was not spoken. If one person spoke, speaker is A. localExpression must mean the same thing as originalText, in spoken English. koreanMeaning, example korean, and context stay in Korean. Do not wrap the JSON in markdown.",
    );
    const secondSentences = keepSpokenEnglish(second.sentences);
    if (!secondSentences.length) {
      throw new HttpError(502, "Sentence analysis did not return English expressions");
    }

    return {
      speakerTranscript: second.speakerTranscript || first.speakerTranscript,
      sentences: secondSentences,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("[analysis] unexpected", error instanceof Error ? error.message : "unknown");
    throw new HttpError(502, "Sentence analysis failed");
  }
}
