import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/lib/api";
import { caloriesFromMacros } from "@/lib/macros";
import { MEAL_TYPES, type MealType } from "@/lib/mealType";

const ORANGE = "#f97316";

export interface MealLogEntry {
  id: string;
  name: string;
  mealType: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
}

export default function MealEntryModal({
  entry, onClose, onChanged,
}: {
  entry: MealLogEntry | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [saving, setSaving] = useState(false);
  const [favSaved, setFavSaved] = useState(false);

  function startEdit() {
    if (!entry) return;
    setName(entry.name);
    setMealType((entry.mealType as MealType) ?? null);
    setCalories(entry.calories != null ? String(Math.round(entry.calories)) : "");
    setProteinG(entry.proteinG != null ? String(Math.round(entry.proteinG)) : "");
    setCarbsG(entry.carbsG != null ? String(Math.round(entry.carbsG)) : "");
    setFatG(entry.fatG != null ? String(Math.round(entry.fatG)) : "");
    setEditing(true);
  }

  function close() {
    setEditing(false);
    setFavSaved(false);
    onClose();
  }

  async function handleSaveFavorite() {
    if (!entry || favSaved) return;
    setFavSaved(true);
    try {
      await api("/api/user/saved-meals", {
        method: "POST",
        body: JSON.stringify({
          name: entry.name,
          calories: entry.calories ?? undefined,
          proteinG: entry.proteinG ?? undefined,
          carbsG: entry.carbsG ?? undefined,
          fatG: entry.fatG ?? undefined,
        }),
      });
    } catch { setFavSaved(false); }
  }

  function handleMacroChange(field: "protein" | "carbs" | "fat", value: string) {
    const p = field === "protein" ? value : proteinG;
    const c = field === "carbs"   ? value : carbsG;
    const f = field === "fat"     ? value : fatG;
    if (field === "protein") setProteinG(value);
    if (field === "carbs")   setCarbsG(value);
    if (field === "fat")     setFatG(value);
    setCalories(String(caloriesFromMacros(Number(p) || 0, Number(c) || 0, Number(f) || 0)));
  }

  async function handleSaveEdit() {
    if (!entry || !name.trim()) return;
    setSaving(true);
    try {
      await api(`/api/user/meal-log/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          mealType: mealType ?? undefined,
          calories: calories ? Number(calories) : null,
          proteinG: proteinG ? Number(proteinG) : null,
          carbsG: carbsG ? Number(carbsG) : null,
          fatG: fatG ? Number(fatG) : null,
        }),
      });
      onChanged();
      close();
    } catch { /* silently fail */ } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!entry) return;
    setSaving(true);
    try {
      await api(`/api/user/meal-log/${entry.id}`, { method: "DELETE" });
      onChanged();
      close();
    } catch { /* silently fail */ } finally { setSaving(false); }
  }

  return (
    <Modal visible={!!entry} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {entry && !editing && (
            <>
              <Text style={styles.title} numberOfLines={2}>{entry.name}</Text>
              {entry.calories != null && <Text style={styles.calories}>{Math.round(entry.calories)} kcal</Text>}
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{entry.carbsG != null ? `${Math.round(entry.carbsG)}g` : "—"}</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>{entry.fatG != null ? `${Math.round(entry.fatG)}g` : "—"}</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{entry.proteinG != null ? `${Math.round(entry.proteinG)}g` : "—"}</Text>
                </View>
              </View>
              <Pressable style={styles.favButton} onPress={handleSaveFavorite} disabled={favSaved}>
                <Text style={[styles.favButtonText, favSaved && styles.favButtonTextSaved]}>
                  {favSaved ? "★ Saved to favorites" : "☆ Save to favorites"}
                </Text>
              </Pressable>
              <View style={styles.actionRow}>
                <Pressable style={styles.actionButton} onPress={startEdit}>
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#dc2626" /> : <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>}
                </Pressable>
              </View>
              <Pressable style={styles.closeButton} onPress={close}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </>
          )}
          {entry && editing && (
            <>
              <Text style={styles.title}>Edit meal</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="#9ca3af" style={styles.nameInput} />
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Calories</Text>
                  <TextInput value={calories} onChangeText={setCalories} keyboardType="numeric" style={styles.fieldInput} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Protein</Text>
                  <TextInput value={proteinG} onChangeText={(v) => handleMacroChange("protein", v)} keyboardType="numeric" style={styles.fieldInput} />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Carbs</Text>
                  <TextInput value={carbsG} onChangeText={(v) => handleMacroChange("carbs", v)} keyboardType="numeric" style={styles.fieldInput} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Fat</Text>
                  <TextInput value={fatG} onChangeText={(v) => handleMacroChange("fat", v)} keyboardType="numeric" style={styles.fieldInput} />
                </View>
              </View>
              <Text style={[styles.fieldLabel, { alignSelf: "flex-start", marginTop: 12 }]}>Meal</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setMealType(m.key)}
                    style={[styles.mealTypeChip, mealType === m.key && styles.mealTypeChipActive]}
                  >
                    <Text style={[styles.mealTypeChipText, mealType === m.key && styles.mealTypeChipTextActive]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actionRow}>
                <Pressable style={styles.actionButton} onPress={() => setEditing(false)} disabled={saving}>
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.saveButton]} onPress={handleSaveEdit} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.actionButtonText, styles.saveButtonText]}>Save</Text>}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: 300, backgroundColor: "#fff", borderRadius: 24, padding: 22, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  title: { fontSize: 16, fontWeight: "700", color: "#111827", textAlign: "center" },
  calories: { fontSize: 26, fontWeight: "800", color: "#111827", marginTop: 6 },
  macroRow: { flexDirection: "row", gap: 18, marginTop: 16 },
  macroItem: { alignItems: "center", gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
  macroValue: { fontSize: 15, fontWeight: "700", color: "#374151" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 18, width: "100%" },
  actionButton: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingVertical: 10, alignItems: "center", justifyContent: "center",
  },
  actionButtonText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  deleteButton: { borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  deleteButtonText: { color: "#dc2626" },
  saveButton: { backgroundColor: ORANGE, borderColor: ORANGE },
  saveButtonText: { color: "#fff" },
  favButton: { marginTop: 14, paddingVertical: 6 },
  favButtonText: { fontSize: 13, fontWeight: "700", color: ORANGE },
  favButtonTextSaved: { color: "#9ca3af" },
  closeButton: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 12, backgroundColor: "#f3f4f6" },
  closeButtonText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  nameInput: {
    marginTop: 12, width: "100%", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: "#111827",
  },
  fieldRow: { flexDirection: "row", gap: 10, marginTop: 10, width: "100%" },
  field: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#9ca3af", marginBottom: 4 },
  fieldInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827", textAlign: "center",
  },
  mealTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, width: "100%" },
  mealTypeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  mealTypeChipActive: { borderColor: ORANGE, backgroundColor: "#fff7ed" },
  mealTypeChipText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  mealTypeChipTextActive: { color: ORANGE },
});

