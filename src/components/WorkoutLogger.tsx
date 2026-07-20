import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/lib/api";

const ORANGE = "#f97316";

export interface WorkoutEntry {
  id: string;
  name: string;
  durationMin: number | null;
  caloriesBurned: number | null;
  loggedAt: string;
}

export default function WorkoutLogger({ workouts, onChanged }: { workouts: WorkoutEntry[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);

  const totalBurned = workouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);

  function resetForm() {
    setAdding(false);
    setName("");
    setDuration("");
    setCalories("");
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api("/api/user/workout-log", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          durationMin: duration ? Number(duration) : undefined,
          caloriesBurned: calories ? Number(calories) : undefined,
        }),
      });
      resetForm();
      onChanged();
    } catch { /* silently fail */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/api/user/workout-log/${id}`, { method: "DELETE" });
      onChanged();
    } catch { /* silently fail */ }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🏋️ Workouts</Text>
        {totalBurned > 0 && <Text style={styles.total}>{totalBurned} kcal burned</Text>}
      </View>

      {workouts.length > 0 && (
        <View style={styles.list}>
          {workouts.map((w) => (
            <View key={w.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>{w.name}</Text>
                {(w.durationMin != null || w.caloriesBurned != null) && (
                  <Text style={styles.rowSub}>
                    {[w.durationMin != null ? `${w.durationMin} min` : null, w.caloriesBurned != null ? `${w.caloriesBurned} kcal` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => handleDelete(w.id)} hitSlop={8}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {adding ? (
        <View style={styles.form}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Workout (e.g. Run, Lifting)"
            placeholderTextColor="#9ca3af"
            autoFocus
            style={styles.nameInput}
          />
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Minutes</Text>
              <TextInput value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="30" placeholderTextColor="#d1d5db" style={styles.smallInput} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Calories burned</Text>
              <TextInput value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="250" placeholderTextColor="#d1d5db" style={styles.smallInput} />
            </View>
          </View>
          <View style={styles.formActions}>
            <Pressable style={styles.cancelButton} onPress={resetForm} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.saveButton, { flex: 1 }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Add</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
          <Text style={styles.addText}>+ Add workout</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  total: { fontSize: 12, fontWeight: "700", color: "#ea580c" },
  list: { marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  rowName: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  rowSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  remove: { fontSize: 22, fontWeight: "400", color: "#d1d5db", paddingHorizontal: 4 },
  addButton: { marginTop: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  addText: { fontSize: 13, fontWeight: "700", color: ORANGE },
  form: { marginTop: 8 },
  nameInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: "#111827" },
  formRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#9ca3af", marginBottom: 4 },
  smallInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827", textAlign: "center" },
  formActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  saveButton: { backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
