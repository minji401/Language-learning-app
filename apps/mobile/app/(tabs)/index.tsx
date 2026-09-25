import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { AudioCapture } from "@/components/AudioCapture";
import { Text, View } from "@/components/Themed";
import { listMyRecordings } from "@/lib/recordings";
import type { Recording } from "@/lib/types";

export default function HomeScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listMyRecordings()
      .then((next) => {
        setRecordings(next);
        setListError(null);
      })
      .catch((caught: unknown) => {
        setListError(caught instanceof Error ? caught.message : "Could not load recordings");
      });
  }, []);

  useFocusEffect(reload);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Contextual Echo</Text>
      <Text style={styles.lead}>
        Record a conversation, then keep the sentences worth saying again.
      </Text>

      <AudioCapture onComplete={reload} />

      <Text style={styles.section}>Recent</Text>
      {listError ? <Text style={styles.error}>{listError}</Text> : null}
      {recordings.length === 0 ? (
        <Text style={styles.empty}>Recordings you upload will show up here.</Text>
      ) : (
        recordings.map((recording) => (
          <Pressable
            key={recording.id}
            style={styles.card}
            onPress={() => router.push(`/recording/${recording.id}` as Href)}>
            <Text style={styles.cardTitle}>{recording.title ?? "Conversation"}</Text>
            <Text style={styles.cardMeta}>
              {recording.source === "record" ? "Recorded" : "Uploaded"} · {recording.status}
            </Text>
          </Pressable>
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
  kicker: {
    fontSize: 28,
    fontWeight: "700",
  },
  lead: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },
  section: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "700",
  },
  empty: {
    opacity: 0.65,
  },
  error: {
    color: "#9B3A3A",
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C9D5D0",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardMeta: {
    marginTop: 4,
    opacity: 0.65,
  },
});
