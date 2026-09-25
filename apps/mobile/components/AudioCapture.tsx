import { router, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";

import { Text, View } from "@/components/Themed";
import {
  contentTypeForExtension,
  extensionFromName,
  submitAudio,
} from "@/lib/recordings";
import type { RecordingSource } from "@/lib/types";

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.floor(durationMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AudioCapture({ onComplete }: { onComplete?: () => void }) {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: "document",
  });
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== "idle";

  async function send(input: {
    uri: string;
    file?: Blob;
    source: RecordingSource;
    extension: string;
    contentType: string;
  }) {
    setError(null);
    setPhase("uploading");
    try {
      const recordingId = await submitAudio({
        ...input,
        onPhase: setPhase,
      });
      onComplete?.();
      router.push(`/recording/${recordingId}` as Href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not process this recording");
    } finally {
      setPhase("idle");
    }
  }

  async function startRecording() {
    setError(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone access is required to record.");
      return;
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording() {
    const durationMillis = recorder.getStatus().durationMillis;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || durationMillis < 500) {
      setError("Record for at least a second, then stop.");
      return;
    }

    const recordedOnWeb = Platform.OS === "web";
    const extension = recordedOnWeb ? "webm" : extensionFromName(uri, "m4a");
    await send({
      uri,
      source: "record",
      extension,
      contentType: recordedOnWeb ? "audio/webm" : contentTypeForExtension(extension),
    });
  }

  async function pickAudioFile() {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
      base64: false,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    const extension = extensionFromName(asset.name, "m4a");
    await send({
      uri: asset.uri,
      file: asset.file,
      source: "upload",
      extension,
      contentType: asset.mimeType ?? contentTypeForExtension(extension),
    });
  }

  const status = recorderState.isRecording
    ? `Recording ${formatDuration(recorderState.durationMillis)}`
    : phase === "uploading"
      ? "Uploading audio..."
      : phase === "analyzing"
        ? "Transcribing and extracting sentences..."
        : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Pressable
          style={[styles.primary, (busy || recorderState.isRecording) && styles.disabled]}
          disabled={busy || recorderState.isRecording}
          onPress={() => {
            startRecording().catch((caught: unknown) => {
              setError(caught instanceof Error ? caught.message : "Could not start recording");
            });
          }}>
          <Text style={styles.primaryLabel}>Record conversation</Text>
        </Pressable>
        {recorderState.isRecording ? (
          <Pressable style={styles.stop} onPress={() => {
            stopRecording().catch((caught: unknown) => {
              setError(caught instanceof Error ? caught.message : "Could not stop recording");
            });
          }}>
            <Text style={styles.primaryLabel}>Stop and analyze</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.secondary, busy && styles.disabled]}
            disabled={busy}
            onPress={() => {
              pickAudioFile().catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : "Could not open the audio file");
              });
            }}>
            <Text style={styles.secondaryLabel}>Upload audio</Text>
          </Pressable>
        )}
      </View>
      {status ? (
        <View style={styles.statusRow}>
          {busy ? <ActivityIndicator color="#0E7C66" /> : null}
          <Text style={styles.status}>{status}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    backgroundColor: "transparent",
  },
  actions: {
    gap: 10,
  },
  primary: {
    backgroundColor: "#0E7C66",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  stop: {
    backgroundColor: "#9B3A3A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondary: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0E7C66",
  },
  secondaryLabel: {
    color: "#0E7C66",
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.45,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  status: {
    fontSize: 15,
  },
  error: {
    color: "#9B3A3A",
    lineHeight: 20,
  },
});
