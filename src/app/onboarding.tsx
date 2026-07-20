import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import PlanForm from "@/components/PlanForm";

const ORANGE = "#f97316";

const VALUE_PROPS = [
  { emoji: "📷", title: "Snap or scan your food", sub: "Photo, barcode, or search — logging takes seconds" },
  { emoji: "🎯", title: "Hit your daily targets", sub: "Calories and macros tuned to your goal" },
  { emoji: "📈", title: "Watch your progress", sub: "Weight and nutrition trends over time" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);

  function finish() {
    router.replace("/");
  }

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep(0)}>
            <Text style={styles.backLink}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Set up your plan</Text>
          <View style={{ width: 50 }} />
        </View>
        <PlanForm onSaved={finish} saveLabel="Finish setup" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.welcome}>
        <View style={styles.hero}>
          <Text style={styles.logo}>Macros</Text>
          <Text style={styles.tagline}>Let&apos;s get you set up</Text>
        </View>

        <View style={styles.props}>
          {VALUE_PROPS.map((p) => (
            <View key={p.title} style={styles.propRow}>
              <Text style={styles.propEmoji}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.propTitle}>{p.title}</Text>
                <Text style={styles.propSub}>{p.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.primaryButton} onPress={() => setStep(1)}>
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>
          <Pressable style={styles.skip} onPress={finish}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backLink: { fontSize: 14, fontWeight: "600", color: "#9ca3af", width: 50 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  welcome: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  hero: { alignItems: "center", marginTop: 48 },
  logo: { fontSize: 34, fontWeight: "900", color: ORANGE },
  tagline: { fontSize: 16, color: "#6b7280", marginTop: 8, fontWeight: "500" },
  props: { gap: 20, marginVertical: 24 },
  propRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  propEmoji: { fontSize: 30 },
  propTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  propSub: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  footer: { marginBottom: 20 },
  primaryButton: { backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  skip: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  skipText: { color: "#9ca3af", fontWeight: "600", fontSize: 14 },
});
