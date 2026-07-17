import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api, ApiError } from "@/lib/api";
import { caloriesFromMacros } from "@/lib/macros";

const ORANGE = "#f97316";

interface FoodPhotoEstimate {
  name: string;
  servingDescription: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: "low" | "medium" | "high";
}

const CONFIDENCE_COLORS: Record<FoodPhotoEstimate["confidence"], { bg: string; text: string; label: string }> = {
  high:   { bg: "#dcfce7", text: "#15803d", label: "High confidence" },
  medium: { bg: "#fef3c7", text: "#b45309", label: "Medium confidence" },
  low:    { bg: "#fee2e2", text: "#dc2626", label: "Low confidence — double-check" },
};

type Status = "analyzing" | "reviewing" | "logging" | "error";

export default function ScanReviewScreen() {
  const router = useRouter();
  const { uri: initialUri } = useLocalSearchParams<{ uri: string }>();
  const [uri, setUri] = useState(initialUri);
  const [status, setStatus] = useState<Status>("analyzing");
  const [estimate, setEstimate] = useState<FoodPhotoEstimate | null>(null);
  const [form, setForm] = useState({ name: "", calories: "", proteinG: "", carbsG: "", fatG: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyze(uri);
  }, [uri]);

  async function analyze(photoUri: string) {
    setStatus("analyzing");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", {
        uri: photoUri,
        name: "food.jpg",
        type: "image/jpeg",
      } as unknown as Blob);

      const data = await api<FoodPhotoEstimate>("/api/user/food-photo", { method: "POST", body });
      setEstimate(data);
      setForm({
        name:     data.name,
        calories: String(data.calories),
        proteinG: String(data.proteinG),
        carbsG:   String(data.carbsG),
        fatG:     String(data.fatG),
      });
      setStatus("reviewing");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Analysis failed");
      setStatus("error");
    }
  }

  async function retake() {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets?.[0]) return;
    setUri(result.assets[0].uri);
  }

  function handleFieldChange(key: "name" | "calories" | "proteinG" | "carbsG" | "fatG", value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "proteinG" || key === "carbsG" || key === "fatG") {
        next.calories = String(caloriesFromMacros(
          Number(next.proteinG) || 0,
          Number(next.carbsG)   || 0,
          Number(next.fatG)     || 0,
        ));
      }
      return next;
    });
  }

  async function handleLog() {
    setStatus("logging");
    try {
      await api("/api/user/meal-log", {
        method: "POST",
        body: JSON.stringify({
          name:     form.name || "Food photo",
          calories: Number(form.calories) || 0,
          proteinG: Number(form.proteinG) || 0,
          carbsG:   Number(form.carbsG)   || 0,
          fatG:     Number(form.fatG)     || 0,
        }),
      });
      router.back();
    } catch {
      setError("Couldn't save this meal. Try again.");
      setStatus("reviewing");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeLink}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Scan food</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {uri && <Image source={{ uri }} style={styles.photo} />}

        {status === "analyzing" && (
          <View style={styles.centerRow}>
            <ActivityIndicator color={ORANGE} />
            <Text style={styles.analyzingText}>Analyzing your food...</Text>
          </View>
        )}

        {status === "error" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={retake} style={styles.retakeButton}>
              <Text style={styles.retakeButtonText}>Retake photo</Text>
            </Pressable>
          </View>
        )}

        {(status === "reviewing" || status === "logging") && estimate && (
          <View style={styles.card}>
            <TextInput
              value={form.name}
              onChangeText={(v) => handleFieldChange("name", v)}
              style={styles.nameInput}
            />
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: CONFIDENCE_COLORS[estimate.confidence].bg }]}>
                <Text style={[styles.badgeText, { color: CONFIDENCE_COLORS[estimate.confidence].text }]}>
                  {CONFIDENCE_COLORS[estimate.confidence].label}
                </Text>
              </View>
              <Text style={styles.servingText}>{estimate.servingDescription}</Text>
            </View>

            <View style={styles.macroRow}>
              {([
                { key: "calories" as const, label: "Cal",        color: "#374151" },
                { key: "proteinG" as const, label: "Protein g",  color: "#f97316" },
                { key: "carbsG"   as const, label: "Carbs g",    color: "#f59e0b" },
                { key: "fatG"     as const, label: "Fat g",      color: "#3b82f6" },
              ]).map(({ key, label, color }) => (
                <View key={key} style={{ flex: 1 }}>
                  <Text style={[styles.macroLabel, { color }]}>{label}</Text>
                  <TextInput
                    value={form[key]}
                    onChangeText={(v) => handleFieldChange(key, v)}
                    keyboardType="numeric"
                    style={styles.macroInput}
                  />
                </View>
              ))}
            </View>

            {error && <Text style={styles.saveErrorText}>{error}</Text>}

            <View style={styles.actionRow}>
              <Pressable style={styles.retakeButtonSmall} onPress={retake} disabled={status === "logging"}>
                <Text style={styles.retakeButtonSmallText}>Retake</Text>
              </Pressable>
              <Pressable style={[styles.logButton, { flex: 1 }]} onPress={handleLog} disabled={status === "logging"}>
                {status === "logging"
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.logButtonText}>Log it</Text>}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  closeLink: { fontSize: 14, fontWeight: "600", color: "#9ca3af", width: 50 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  photo: { width: "100%", aspectRatio: 1, borderRadius: 20, backgroundColor: "#eee" },
  centerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  analyzingText: { color: ORANGE, fontWeight: "600", fontSize: 14 },
  errorCard: {
    marginTop: 16, backgroundColor: "#fff", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "#f0f0f0", alignItems: "center",
  },
  errorText: { color: "#ef4444", fontSize: 13, textAlign: "center" },
  retakeButton: { marginTop: 12, backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retakeButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { marginTop: 16, backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  nameInput: { fontSize: 17, fontWeight: "700", color: "#111827", paddingVertical: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  servingText: { fontSize: 11, color: "#9ca3af" },
  macroRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  macroLabel: { fontSize: 10, fontWeight: "700", marginBottom: 4 },
  macroInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 8, fontSize: 14, textAlign: "center",
  },
  saveErrorText: { color: "#ef4444", fontSize: 12, marginTop: 10 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  retakeButtonSmall: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 14, alignItems: "center", justifyContent: "center",
  },
  retakeButtonSmallText: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
  logButton: { backgroundColor: ORANGE, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
