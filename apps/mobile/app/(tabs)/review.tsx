import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { gradeReview, listDueReviews, listNotebookSentences } from "@/lib/recordings";
import type { LearningSentence, ReviewCard, ReviewGrade } from "@/lib/types";

const grades: { id: ReviewGrade; label: string }[] = [
  { id: "again", label: "다시" },
  { id: "hard", label: "어려움" },
  { id: "good", label: "좋음" },
  { id: "easy", label: "쉬움" },
];

export default function NotebookScreen() {
  const [sentences, setSentences] = useState<LearningSentence[]>([]);
  const [due, setDue] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [grading, setGrading] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([listNotebookSentences(), listDueReviews()])
      .then(([saved, cards]) => {
        setSentences(saved);
        setDue(cards);
        setError(null);
        setRevealed(false);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "연습장을 불러오지 못했습니다");
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(reload);

  const card = due[0];

  async function gradeCard(grade: ReviewGrade) {
    if (!card || grading) return;
    setGrading(true);
    try {
      await gradeReview(card.id, grade);
      setDue((current) => current.slice(1));
      setRevealed(false);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "연습 결과를 저장하지 못했습니다");
    } finally {
      setGrading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>연습장</Text>
      <Text style={styles.lead}>분석에서 넣어 둔 문장을 여기서 다시 봅니다.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color="#0E7C66" /> : null}

      {!loading && sentences.length === 0 ? (
        <Text style={styles.empty}>아직 넣은 문장이 없습니다. 분석 결과에서 연습장에 넣어 주세요.</Text>
      ) : null}

      {card ? (
        <View style={styles.practice}>
          <Text style={styles.section}>지금 연습 · {due.length}</Text>
          <Pressable style={styles.card} onPress={() => setRevealed((value) => !value)}>
            <Text style={styles.prompt}>
              {revealed ? card.sentence.koreanMeaning : card.sentence.localExpression}
            </Text>
            <Text style={styles.hint}>{revealed ? "뜻을 가리려면 다시 누르세요" : "뜻을 보려면 누르세요"}</Text>
          </Pressable>
          <View style={styles.grades}>
            {grades.map((grade) => (
              <Pressable
                key={grade.id}
                style={styles.grade}
                disabled={grading}
                onPress={() => {
                  gradeCard(grade.id).catch(() => undefined);
                }}>
                <Text style={styles.gradeLabel}>{grade.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {sentences.length > 0 ? <Text style={styles.section}>담아 둔 문장</Text> : null}
      {sentences.map((sentence) => (
        <Pressable
          key={sentence.id}
          style={styles.item}
          onPress={() => router.push(`/sentence/${sentence.id}` as Href)}>
          <Text style={styles.expression}>{sentence.localExpression || sentence.originalText}</Text>
          <Text style={styles.meaning}>{sentence.koreanMeaning}</Text>
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
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  lead: {
    lineHeight: 22,
    opacity: 0.75,
  },
  error: {
    color: "#9B3A3A",
  },
  empty: {
    lineHeight: 22,
    opacity: 0.7,
  },
  practice: {
    gap: 12,
    backgroundColor: "transparent",
  },
  section: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
  },
  card: {
    minHeight: 180,
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
  },
  item: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C9D5D0",
    gap: 4,
  },
  expression: {
    fontSize: 16,
    fontWeight: "600",
  },
  meaning: {
    opacity: 0.7,
  },
});
