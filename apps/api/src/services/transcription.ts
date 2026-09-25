import { config } from "../config";
import { HttpError } from "../http";
import { getSupabaseAdmin } from "../lib/supabase";

const mimeByExtension: Record<string, string> = {
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
  ogg: "audio/ogg",
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, text: string) {
  return text.split("").every((char, index) => bytes[offset + index] === char.charCodeAt(0));
}

export function detectAudioFormat(bytes: Uint8Array): { extension: string; mime: string } | null {
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { extension: "webm", mime: "audio/webm" };
  }
  if (bytes.length >= 12 && asciiAt(bytes, 4, "ftyp")) {
    return { extension: "m4a", mime: "audio/mp4" };
  }
  if (asciiAt(bytes, 0, "RIFF")) return { extension: "wav", mime: "audio/wav" };
  if (asciiAt(bytes, 0, "OggS")) return { extension: "ogg", mime: "audio/ogg" };
  if (asciiAt(bytes, 0, "ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    return { extension: "mp3", mime: "audio/mpeg" };
  }
  return null;
}

export async function downloadRecording(audioPath: string): Promise<Uint8Array> {
  console.log(`[transcribe] downloading recordings/${audioPath}`);
  const { data, error } = await getSupabaseAdmin().storage.from("recordings").download(audioPath);

  if (error || !data) {
    const reason = error?.message ?? "storage returned an empty body";
    console.error(`[transcribe] could not read recordings/${audioPath}: ${reason}`);
    throw new HttpError(404, `Could not read the audio file at ${audioPath}: ${reason}`);
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  console.log(`[transcribe] downloaded recordings/${audioPath} (${bytes.byteLength} bytes)`);
  if (bytes.byteLength === 0) {
    throw new HttpError(422, `Could not read the audio file at ${audioPath}: the file is empty`);
  }

  return bytes;
}

export interface TranscriptResult {
  text: string;
  speakerTranscript: string;
}

interface DiarizedSegment {
  speaker?: string;
  text?: string;
}

function speakerLabel(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^SPEAKER[_\s-]*/, "");
  if (/^[A-Z]$/.test(raw)) return raw;
  return null;
}

function formatDiarized(body: { text?: string; segments?: DiarizedSegment[] }): TranscriptResult | null {
  const lines: string[] = [];
  for (const segment of body.segments ?? []) {
    const line = segment.text?.trim();
    const speaker = speakerLabel(segment.speaker);
    if (!line || !speaker) continue;
    const previous = lines[lines.length - 1];
    if (previous?.startsWith(`${speaker}: `)) {
      lines[lines.length - 1] = `${previous} ${line}`;
    } else {
      lines.push(`${speaker}: ${line}`);
    }
  }

  const text = body.text?.trim() || lines.map((line) => line.replace(/^[A-Z]:\s*/, "")).join(" ");
  if (!text || lines.length === 0) return null;
  return { text, speakerTranscript: lines.join("\n") };
}

async function requestTranscription(audio: Uint8Array, fileName: string, mime: string, fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append("file", new Blob([Buffer.from(audio)], { type: mime }), fileName);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openAiApiKey}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    let code = "";
    try {
      code = (JSON.parse(detail) as { error?: { code?: string } }).error?.code ?? "";
    } catch {
      code = "";
    }
    return { ok: false as const, status: response.status, code };
  }

  const body = (await response.json()) as { text?: string; segments?: DiarizedSegment[] };
  return { ok: true as const, body };
}

export async function transcribeAudio(audio: Uint8Array, storedName: string): Promise<TranscriptResult> {
  if (!config.openAiApiKey) {
    throw new HttpError(503, "OPENAI_API_KEY is not configured");
  }

  const sniffed = detectAudioFormat(audio);
  const storedExtension = storedName.split(".").pop()?.toLowerCase() ?? "";
  const extension = sniffed?.extension ?? (storedExtension || "m4a");
  const mime = sniffed?.mime ?? mimeByExtension[extension] ?? "application/octet-stream";
  const whisperName = `audio.${extension}`;

  console.log(
    `[transcribe] diarize input ${whisperName} (${mime}, ${audio.byteLength} bytes) from stored file ${storedName}`,
  );

  const diarized = await requestTranscription(audio, whisperName, mime, {
    model: "gpt-4o-transcribe-diarize",
    response_format: "diarized_json",
    chunking_strategy: "auto",
  });

  if (diarized.ok) {
    const formatted = formatDiarized(diarized.body);
    if (formatted) {
      const speakers = new Set(formatted.speakerTranscript.split("\n").map((line) => line.slice(0, 1)));
      console.log(`[transcribe] diarized speakers ${[...speakers].join(",")}`);
      return formatted;
    }
    console.error("[transcribe] diarize response had no speaker segments");
  } else if (diarized.code === "invalid_api_key") {
    throw new HttpError(502, "The OpenAI API key on the server is invalid. Update OPENAI_API_KEY in apps/api/.env and restart the API.");
  } else {
    console.error(`[transcribe] diarize failed (${diarized.status} ${diarized.code || "unknown"}), falling back to plain text`);
  }

  const plain = await requestTranscription(audio, whisperName, mime, { model: config.transcribeModel });
  if (!plain.ok) {
    if (plain.code === "invalid_api_key") {
      throw new HttpError(502, "The OpenAI API key on the server is invalid. Update OPENAI_API_KEY in apps/api/.env and restart the API.");
    }
    throw new HttpError(502, `Speech-to-text failed (${plain.status}).`);
  }

  const text = plain.body.text?.trim();
  if (!text) throw new HttpError(502, "Speech-to-text returned an empty transcript");
  return { text, speakerTranscript: "" };
}
