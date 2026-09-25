import { router, Stack, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { findRecording, findSentence, sentencesForRecording } from "@/lib/mockData";
import {
  getRecordingDetail,
  reanalyzeRecording,
  sentencesIncludeEnglish,
  sentencesUseLocalVoice,
  setLearningSentenceSaved,
} from "@/lib/recordings";
import type { LearningSentence, Recording } from "@/lib/types";

const rewrittenRecordings = new Set<string>();

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AnalysisScreen() {
  const recordingId = routeParam(useLocalSearchParams<{ id: string }>().id);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [sentences, setSentences] = useState<LearningSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingId) {
      setLoading(false);
      setError("Missing recording");
      return;
    }

    const sample = findRecording(recordingId);
    if (sample) {
      setRecording(sample);
      setSentences(sentencesForRecording(recordingId));
      setLoading(false);
      return;
    }

    let active = true;
    getRecordingDetail(recordingId)
      .then(async (detail) => {
        if (!active) return;
        const canRewrite =
          (detail.recording.status === "ready" || detail.recording.status === "failed") &&
          Boolean(detail.recording.transcript) &&
          !rewrittenRecordings.has(recordingId);
        const needsRewrite =
          canRewrite &&
          (detail.recording.status === "failed" ||
            (detail.sentences.length > 0 &&
              (!sentencesIncludeEnglish(detail.sentences) || !sentencesUseLocalVoice(detail.sentences))));
        if (!needsRewrite) {
          setRecording(detail.recording);
          setSentences(detail.sentences);
          return;
        }

        rewrittenRecordings.add(recordingId);
        try {
          const rewritten = await reanalyzeRecording(recordingId);
          if (!active) return;
          setRecording(rewritten.recording);
          setSentences(rewritten.sentences);
        } catch (caught: unknown) {
          if (!active) return;
          setRecording(detail.recording);
          setSentences(detail.sentences);
          setError(caught instanceof Error ? caught.message : "Could not rewrite these sentences in English");
        }
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Could not load this recording");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [recordingId]);

  async function toggleNotebook(sentence: LearningSentence) {
    if (savingId) return;
    const nextSaved = !sentence.saved;
    if (findSentence(sentence.id)) {
      setSentences((current) =>
        current.map((item) => (item.id === sentence.id ? { ...item, saved: nextSaved } : item)),
      );
      return;
    }

    setSavingId(sentence.id);
    try {
      const updated = await setLearningSentenceSaved(sentence.id, nextSaved);
      setSentences((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "연습장에 넣지 못했습니다");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Analysis" }} />
        <ActivityIndicator color="#0E7C66" />
      </View>
    );
  }

  if (!recording) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Analysis" }} />
        <Text>{error ?? "This recording could not be found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: recording.title ?? "Analysis" }} />
      <Text style={styles.status}>{recording.status}</Text>
      {recording.speakerTranscript || recording.transcript ? (
        <Text style={styles.transcript}>{recording.speakerTranscript || recording.transcript}</Text>
      ) : null}
      {recording.errorMessage ? <Text style={styles.error}>{recording.errorMessage}</Text> : null}
      <Text style={styles.section}>Key sentences</Text>
      {sentences.length === 0 ? (
        <Text style={styles.transcript}>No reusable sentences were found in this conversation.</Text>
      ) : (
        sentences.map((sentence, index) => (
          <View key={sentence.id} style={styles.sentence}>
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/sentence/${sentence.id}` as Href)}>
              <Text style={styles.index}>{index + 1}</Text>
              <View style={styles.rowBody}>
                {sentence.speaker ? (
                  <Text style={styles.speaker}>{sentence.speaker === "B" ? "Speaker B" : "Speaker A"}</Text>
                ) : null}
                <Text style={styles.original}>{sentence.localExpression || sentence.originalText}</Text>
                <Text style={styles.local}>{sentence.koreanMeaning}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.notebook, sentence.saved ? styles.notebookOn : null]}
              disabled={savingId === sentence.id}
              onPress={() => {
                toggleNotebook(sentence).catch(() => undefined);
              }}>
              <Text style={[styles.notebookLabel, sentence.saved ? styles.notebookLabelOn : null]}>
                {savingId === sentence.id ? "저장 중" : sentence.saved ? "연습장에서 빼기" : "연습장에 넣기"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  status: {
    textTransform: "capitalize",
    opacity: 0.65,
  },
  transcript: {
    lineHeight: 22,
  },
  error: {
    color: "#9B3A3A",
    lineHeight: 20,
  },
  section: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
  },
  sentence: {
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C9D5D0",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  notebook: {
    alignSelf: "flex-start",
    marginLeft: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0E7C66",
  },
  notebookOn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0E7C66",
  },
  notebookLabel: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  notebookLabelOn: {
    color: "#0E7C66",
  },
  index: {
    width: 24,
    fontWeight: "700",
    color: "#0E7C66",
  },
  rowBody: {
    flex: 1,
    gap: 4,
    backgroundColor: "transparent",
  },
  speaker: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0E7C66",
  },
  original: {
    fontSize: 16,
    fontWeight: "600",
  },
  local: {
    opacity: 0.7,
  },
});
