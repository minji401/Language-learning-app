import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { sampleRecordings } from "@/lib/mockData";

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Contextual Echo</Text>
      <Text style={styles.lead}>
        Record a conversation, then keep the sentences worth saying again.
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={() => router.push("/capture" as Href)}>
          <Text style={styles.primaryLabel}>Record conversation</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push("/capture" as Href)}>
          <Text style={styles.secondaryLabel}>Upload audio</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Recent</Text>
      {sampleRecordings.map((recording) => (
        <Pressable
          key={recording.id}
          style={styles.card}
          onPress={() => router.push(`/recording/${recording.id}` as Href)}>
          <Text style={styles.cardTitle}>{recording.title}</Text>
          <Text style={styles.cardMeta}>
            {recording.source === "record" ? "Recorded" : "Uploaded"} · {recording.status}
          </Text>
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
  kicker: {
    fontSize: 28,
    fontWeight: "700",
  },
  lead: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  primary: {
    backgroundColor: "#0E7C66",
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
  section: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "700",
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
