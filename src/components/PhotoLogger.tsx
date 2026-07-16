import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, ApiError } from "@/lib/api";

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

type Status = "idle" | "analyzing" | "reviewing" | "logging" | "error";

export default function PhotoLogger({ onLogged }: { onLogged: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<FoodPhotoEstimate | null>(null);
  const [form, setForm] = useState({ name: "", calories: "", proteinG: "", carbsG: "", fatG: "" });
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStatus("idle");
    setImageUri(null);
    setEstimate(null);
    setError(null);
  }

  async function pickAndAnalyze(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Permission needed to access " + (fromCamera ? "the camera" : "your photos"));
      setStatus("error");
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setStatus("analyzing");
    setError(null);

    try {
      const body = new FormData();
      body.append("file", {
        uri: asset.uri,
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
      onLogged();
      reset();
    } catch {
      setError("Couldn't save this meal. Try again.");
      setStatus("reviewing");
    }
  }

  if (status === "idle") {
    return (
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={() => pickAndAnalyze(true)}>
          <Text style={styles.primaryButtonText}>📸 Take photo</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => pickAndAnalyze(false)}>
          <Text style={styles.secondaryButtonText}>🖼️</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.thumb} />}
        <View style={{ flex: 1, justifyContent: "center" }}>
          {status === "analyzing" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={ORANGE} size="small" />
              <Text style={{ color: ORANGE, fontWeight: "600", fontSize: 13 }}>Analyzing your food...</Text>
            </View>
          )}
          {status === "error" && (
            <View>
              <Text style={{ color: "#ef4444", fontSize: 13 }}>{error}</Text>
              <Pressable onPress={reset}><Text style={styles.link}>Try another photo</Text></Pressable>
            </View>
          )}
          {(status === "reviewing" || status === "logging") && estimate && (
            <View>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                style={styles.nameInput}
              />
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4, alignItems: "center" }}>
                <View style={[styles.badge, { backgroundColor: CONFIDENCE_COLORS[estimate.confidence].bg }]}>
                  <Text style={[styles.badgeText, { color: CONFIDENCE_COLORS[estimate.confidence].text }]}>
                    {CONFIDENCE_COLORS[estimate.confidence].label}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>{estimate.servingDescription}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {(status === "reviewing" || status === "logging") && estimate && (
        <>
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
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  keyboardType="numeric"
                  style={styles.macroInput}
                />
              </View>
            ))}
          </View>
          {error && <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</Text>}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable style={styles.cancelButton} onPress={reset} disabled={status === "logging"}>
              <Text style={styles.cancelButtonText}>Retake</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={handleLog} disabled={status === "logging"}>
              {status === "logging"
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.primaryButtonText}>Log it</Text>}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { fontSize: 18 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  thumb: { width: 72, height: 72, borderRadius: 12 },
  link: { color: ORANGE, fontWeight: "600", fontSize: 12, marginTop: 6 },
  nameInput: { fontSize: 15, fontWeight: "700", color: "#111827", paddingVertical: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  macroRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  macroLabel: { fontSize: 10, fontWeight: "700", marginBottom: 4 },
  macroInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 8, fontSize: 14, textAlign: "center",
  },
  cancelButton: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 14, alignItems: "center", justifyContent: "center",
  },
  cancelButtonText: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
});
