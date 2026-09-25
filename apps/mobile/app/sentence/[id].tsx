import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { findSentence } from "@/lib/mockData";
import { getLearningSentence, setLearningSentenceSaved } from "@/lib/recordings";
import type { LearningSentence } from "@/lib/types";

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function SentenceDetailScreen() {
  const sentenceId = routeParam(useLocalSearchParams<{ id: string }>().id);
  const [sentence, setSentence] = useState<LearningSentence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sentenceId) {
      setLoading(false);
      setError("Missing sentence");
      return;
    }

    const sample = findSentence(sentenceId);
    if (sample) {
      setSentence(sample);
      setLoading(false);
      return;
    }

    let active = true;
    getLearningSentence(sentenceId)
      .then((next) => {
        if (active) setSentence(next);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load this sentence");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sentenceId]);

  async function toggleSaved() {
    if (!sentence || saving) return;
    const nextSaved = !sentence.saved;
    if (findSentence(sentence.id)) {
      setSentence({ ...sentence, saved: nextSaved });
      return;
    }

    setSaving(true);
    try {
      const updated = await setLearningSentenceSaved(sentence.id, nextSaved);
      setSentence(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this sentence");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Sentence" }} />
        <ActivityIndicator color="#0E7C66" />
      </View>
    );
  }

  if (!sentence) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Sentence" }} />
        <Text>{error ?? "This sentence could not be found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Sentence" }} />
      {sentence.speaker ? (
        <Block label="화자" value={sentence.speaker === "B" ? "Speaker B · 현지인" : "Speaker A · 나"} />
      ) : null}
      <Block label="들은 말" value={sentence.originalText} />
      <Block label="현지인은 이렇게 말해요" value={sentence.localExpression ?? ""} />
      <Block label="뜻" value={sentence.koreanMeaning ?? ""} />
      <Block label="왜 이 표현인지" value={sentence.context ?? ""} />
      <Text style={styles.label}>이렇게도 말해요</Text>
      {sentence.examples.map((example) => (
        <View key={example.expression} style={styles.example}>
          <Text style={styles.value}>{example.expression}</Text>
          <Text style={styles.exampleKorean}>{example.korean}</Text>
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.save, sentence.saved ? styles.saveOn : null]}
        disabled={saving}
        onPress={() => {
          toggleSaved().catch(() => undefined);
        }}>
        <Text style={[styles.saveLabel, sentence.saved ? styles.saveLabelOn : null]}>
          {saving ? "저장 중" : sentence.saved ? "연습장에서 빼기" : "연습장에 넣기"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  block: {
    gap: 4,
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "#0E7C66",
  },
  value: {
    fontSize: 18,
    lineHeight: 26,
  },
  example: {
    gap: 2,
    backgroundColor: "transparent",
  },
  exampleKorean: {
    opacity: 0.7,
  },
  error: {
    color: "#9B3A3A",
  },
  save: {
    marginTop: 8,
    backgroundColor: "#0E7C66",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveOn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0E7C66",
  },
  saveLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  saveLabelOn: {
    color: "#0E7C66",
  },
});
