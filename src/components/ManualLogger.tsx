import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "@/lib/api";
import { caloriesFromMacros } from "@/lib/macros";

const ORANGE = "#f97316";
const EMPTY = { name: "", calories: "", proteinG: "", carbsG: "", fatG: "" };

export default function ManualLogger({
  onLogged, open: openProp, onClose, hideTrigger,
}: {
  onLogged: () => void;
  /** When provided, the component is controlled by the parent. */
  open?: boolean;
  onClose?: () => void;
  hideTrigger?: boolean;
}) {
  const controlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? !!openProp : internalOpen;
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (controlled) onClose?.();
    else setInternalOpen(false);
    setForm(EMPTY);
    setError(null);
  }

  function handleFieldChange(key: keyof typeof EMPTY, value: string) {
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
      close();
    } catch {
      setError("Couldn't save this meal. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Pressable style={styles.openButton} onPress={() => setInternalOpen(true)}>
          <Text style={styles.openButtonText}>✏️ Enter manually</Text>
        </Pressable>
      )}

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Enter manually</Text>
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
                    onChangeText={(v) => handleFieldChange(key, v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#d1d5db"
                    style={styles.macroInput}
                  />
                </View>
              ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <Pressable style={styles.cancelButton} onPress={close} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.logButton, { flex: 1 }]} onPress={handleLog} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.logButtonText}>Log it</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 16, paddingVertical: 12, alignItems: "center",
  },
  openButtonText: { color: "#4b5563", fontWeight: "700", fontSize: 14 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,24,39,0.4)" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
  },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", marginBottom: 14 },
  sheetTitle: { fontSize: 13, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
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
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 8 },
  cancelButton: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center",
  },
  cancelButtonText: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
  logButton: { backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  logButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
