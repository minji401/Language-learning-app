import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { findSentence } from "@/lib/mockData";

function Block({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function SentenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sentence = findSentence(id);
  const [saved, setSaved] = useState(sentence?.saved ?? false);

  if (!sentence) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Sentence" }} />
        <Text>This sentence is not in the sample set.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Sentence" }} />
      <Block label="Original" value={sentence.originalText} />
      <Block label="Natural local expression" value={sentence.localExpression ?? ""} />
      <Block label="Korean meaning" value={sentence.koreanMeaning ?? ""} />
      <Block label="Context" value={sentence.context ?? ""} />
      <Text style={styles.label}>Examples</Text>
      {sentence.examples.map((example) => (
        <View key={example.expression} style={styles.example}>
          <Text style={styles.value}>{example.expression}</Text>
          <Text style={styles.exampleKorean}>{example.korean}</Text>
        </View>
      ))}
      <Pressable style={styles.save} onPress={() => setSaved((value) => !value)}>
        <Text style={styles.saveLabel}>{saved ? "Saved for review" : "Save for review"}</Text>
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
  save: {
    marginTop: 8,
    backgroundColor: "#0E7C66",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveLabel: {
    color: "#fff",
    fontWeight: "600",
  },
});
