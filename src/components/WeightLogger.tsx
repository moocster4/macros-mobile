import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/lib/api";

const ORANGE = "#f97316";

export default function WeightLogger({ latestLbs, onLogged }: { latestLbs: number | null; onLogged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const lbs = Number(input);
    if (!lbs || lbs <= 0) return;
    setSaving(true);
    try {
      await api("/api/user/weight-log", {
        method: "POST",
        body: JSON.stringify({ weightKg: lbs / 2.20462 }),
      });
      setInput("");
      setEditing(false);
      onLogged();
    } catch { /* silently fail */ } finally { setSaving(false); }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Weight</Text>
        {!editing && (
          <Pressable onPress={() => { setEditing(true); setInput(latestLbs != null ? latestLbs.toFixed(1) : ""); }}>
            <Text style={styles.actionLink}>{latestLbs != null ? "Update" : "+ Log weight"}</Text>
          </Pressable>
        )}
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            placeholder="e.g. 175"
            placeholderTextColor="#9ca3af"
            autoFocus
            style={styles.input}
          />
          <Text style={styles.unitLabel}>lbs</Text>
          <Pressable onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSave} disabled={saving} style={[styles.saveButton, saving && { opacity: 0.6 }]}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </Pressable>
        </View>
      ) : latestLbs != null ? (
        <Text style={styles.singleValue}>
          {latestLbs.toFixed(1)} <Text style={styles.singleUnit}>lbs</Text>
        </Text>
      ) : (
        <Text style={styles.emptyText}>No weight logged yet — track it to see your trend over time.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  actionLink: { fontSize: 12, fontWeight: "700", color: ORANGE },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: "#111827",
  },
  unitLabel: { fontSize: 12, color: "#9ca3af" },
  cancelLink: { fontSize: 12, fontWeight: "600", color: "#9ca3af" },
  saveButton: { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 52, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  singleValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  singleUnit: { fontSize: 12, fontWeight: "400", color: "#9ca3af" },
  emptyText: { fontSize: 13, color: "#9ca3af" },
});
