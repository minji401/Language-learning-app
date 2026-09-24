import { Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";

export default function CaptureScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Capture" }} />
      <Text style={styles.title}>Audio capture is the next slice</Text>
      <Text style={styles.body}>
        Recording and file upload will send audio to the private Supabase Storage bucket, create a
        recording row, then call POST /recordings/:id/process.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.75,
  },
});
