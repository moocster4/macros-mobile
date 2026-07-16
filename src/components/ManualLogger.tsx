import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/lib/api";

const ORANGE = "#f97316";
const EMPTY = { name: "", calories: "", proteinG: "", carbsG: "", fatG: "" };

export default function ManualLogger({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setForm(EMPTY);
    setError(null);
  }

  async function handleLog() {
    if (!form.name.trim()) { setError("Give it a name"); return; }
    setSaving(true);
    setError(null);
    try {
      await api("/api/user/meal-log", {
        method: "POST",
        body: JSON.stringify({
          name:     form.name.trim(),
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
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Pressable style={styles.openButton} onPress={() => setOpen(true)}>
        <Text style={styles.openButtonText}>✏️ Enter manually</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <TextInput
        value={form.name}
        onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
        placeholder="What did you eat?"
        placeholderTextColor="#9ca3af"
        autoFocus
        style={styles.nameInput}
      />
      <View style={styles.macroRow}>
        {([
          { key: "calories" as const, label: "Cal",       color: "#374151" },
          { key: "proteinG" as const, label: "Protein g", color: "#f97316" },
          { key: "carbsG"   as const, label: "Carbs g",   color: "#f59e0b" },
          { key: "fatG"     as const, label: "Fat g",     color: "#3b82f6" },
        ]).map(({ key, label, color }) => (
          <View key={key} style={{ flex: 1 }}>
            <Text style={[styles.macroLabel, { color }]}>{label}</Text>
            <TextInput
              value={form[key]}
              onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#d1d5db"
              style={styles.macroInput}
            />
          </View>
        ))}
      </View>
      {error && <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</Text>}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable style={styles.cancelButton} onPress={reset} disabled={saving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.logButton, { flex: 1 }]} onPress={handleLog} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.logButtonText}>Log it</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  openButton: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 16, paddingVertical: 12, alignItems: "center",
  },
  openButtonText: { color: "#4b5563", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  nameInput: {
    fontSize: 15, fontWeight: "700", color: "#111827",
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 8,
  },
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
  logButton: { backgroundColor: ORANGE, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
