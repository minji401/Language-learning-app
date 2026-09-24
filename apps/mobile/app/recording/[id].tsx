import { router, Stack, useLocalSearchParams, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { findRecording, sentencesForRecording } from "@/lib/mockData";

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recording = findRecording(id);
  const sentences = sentencesForRecording(id);

  if (!recording) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Analysis" }} />
        <Text>This recording is not in the sample history.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: recording.title ?? "Analysis" }} />
      <Text style={styles.status}>{recording.status}</Text>
      <Text style={styles.transcript}>{recording.transcript}</Text>
      <Text style={styles.section}>Key sentences</Text>
      {sentences.map((sentence, index) => (
        <Pressable
          key={sentence.id}
          style={styles.row}
          onPress={() => router.push(`/sentence/${sentence.id}` as Href)}>
          <Text style={styles.index}>{index + 1}</Text>
          <View style={styles.rowBody}>
            <Text style={styles.original}>{sentence.originalText}</Text>
            <Text style={styles.local}>{sentence.localExpression}</Text>
          </View>
        </Pressable>
      ))}
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
  section: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C9D5D0",
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
  original: {
    fontSize: 16,
    fontWeight: "600",
  },
  local: {
    opacity: 0.7,
  },
});
