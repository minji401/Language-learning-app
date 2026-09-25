import Constants from "expo-constants";
import { Platform } from "react-native";

function projectUrl(value: string) {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage)\/v1$/, "");
}

function apiUrlForThisDevice(configured: string) {
  if (Platform.OS === "web") return configured;

  const lanHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (!lanHost) return configured;

  try {
    const url = new URL(configured);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = lanHost;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}

export const supabaseUrl = projectUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const apiUrl = apiUrlForThisDevice(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000");
