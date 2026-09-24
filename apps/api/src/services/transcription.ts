import { config } from "../config";
import { HttpError } from "../http";
import { getSupabaseAdmin } from "../lib/supabase";

export async function downloadRecording(audioPath: string): Promise<Uint8Array> {
  const { data, error } = await getSupabaseAdmin().storage.from("recordings").download(audioPath);
  if (error || !data) {
    throw new HttpError(404, "Audio file was not found in storage");
  }

  return new Uint8Array(await data.arrayBuffer());
}

export async function transcribeAudio(audio: Uint8Array, filename: string): Promise<string> {
  if (!config.openAiApiKey) {
    throw new HttpError(503, "OPENAI_API_KEY is not configured");
  }

  const form = new FormData();
  form.append("model", config.transcribeModel);
  form.append("file", new Blob([Buffer.from(audio)]), filename);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openAiApiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new HttpError(502, "Speech-to-text request failed");
  }

  const body = (await response.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) throw new HttpError(502, "Speech-to-text returned an empty transcript");
  return text;
}
