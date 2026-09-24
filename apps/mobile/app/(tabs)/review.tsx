import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { sampleReviews } from "@/lib/mockData";
import type { ReviewGrade } from "@/lib/types";

const grades: ReviewGrade[] = ["again", "hard", "good", "easy"];

export default function ReviewScreen() {
  const [queue, setQueue] = useState(sampleReviews);
  const [revealed, setRevealed] = useState(false);
  const card = queue[0];

  function gradeCard(_grade: ReviewGrade) {
    setQueue((current) => current.slice(1));
    setRevealed(false);
  }

  if (!card) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>You're caught up</Text>
        <Text style={styles.muted}>Saved sentences will show up here when they're due.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.count}>{queue.length} due</Text>
      <Pressable style={styles.card} onPress={() => setRevealed((value) => !value)}>
        <Text style={styles.prompt}>
          {revealed ? card.sentence.koreanMeaning : card.sentence.localExpression}
        </Text>
        <Text style={styles.hint}>{revealed ? card.sentence.originalText : "Tap to reveal the meaning"}</Text>
      </Pressable>
      <View style={styles.grades}>
        {grades.map((grade) => (
          <Pressable key={grade} style={styles.grade} onPress={() => gradeCard(grade)}>
            <Text style={styles.gradeLabel}>{grade}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  muted: {
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 22,
  },
  count: {
    opacity: 0.65,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F3F7F5",
  },
  prompt: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    opacity: 0.7,
  },
  grades: {
    flexDirection: "row",
    gap: 8,
  },
  grade: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0E7C66",
  },
  gradeLabel: {
    color: "#fff",
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
