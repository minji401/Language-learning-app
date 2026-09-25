import dotenv from "dotenv";

dotenv.config({ override: true });

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function projectUrl(value: string | undefined) {
  if (!value) return undefined;
  const cleaned = value.replace(/\/+$/, "").replace(/\/(rest|auth|storage)\/v1$/, "");
  return cleaned || undefined;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  supabaseUrl: projectUrl(optional("SUPABASE_URL")),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  openAiApiKey: optional("OPENAI_API_KEY"),
  transcribeModel: process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",
  analysisModel: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o",
};
