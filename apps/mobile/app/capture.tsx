import { Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { AudioCapture } from "@/components/AudioCapture";
import { View } from "@/components/Themed";

export default function CaptureScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "Capture" }} />
      <AudioCapture />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
});
