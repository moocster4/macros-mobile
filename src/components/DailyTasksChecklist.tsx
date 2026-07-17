import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/lib/api";

const ORANGE = "#f97316";

interface DailyTask {
  id: string;
  name: string;
  completedToday: boolean;
}

export default function DailyTasksChecklist() {
  const [tasks, setTasks] = useState<DailyTask[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api<{ tasks: DailyTask[] }>("/api/user/daily-tasks")
      .then(({ tasks: raw }) => setTasks(raw ?? []))
      .catch(() => setTasks([]));
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(task: DailyTask) {
    setTasks((prev) => prev?.map((t) => t.id === task.id ? { ...t, completedToday: !t.completedToday } : t) ?? prev);
    try {
      await api(`/api/user/daily-tasks/${task.id}/toggle`, { method: "POST" });
    } catch {
      load();
    }
  }

  async function handleRemove(taskId: string) {
    setTasks((prev) => prev?.filter((t) => t.id !== taskId) ?? prev);
    api(`/api/user/daily-tasks/${taskId}`, { method: "DELETE" }).catch(() => {});
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await api<DailyTask>("/api/user/daily-tasks", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setTasks((prev) => [...(prev ?? []), created]);
      setNewName("");
      setAdding(false);
    } catch { /* silently fail */ } finally { setSaving(false); }
  }

  if (tasks === null) {
    return <View style={styles.loadingCard}><ActivityIndicator color={ORANGE} /></View>;
  }

  const doneCount = tasks.filter((t) => t.completedToday).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          Today&apos;s habits{tasks.length > 0 ? ` · ${doneCount}/${tasks.length}` : ""}
        </Text>
        {!adding && (
          <Pressable onPress={() => setAdding(true)}>
            <Text style={styles.addLink}>+ Add</Text>
          </Pressable>
        )}
      </View>

      {tasks.length === 0 && !adding && (
        <Text style={styles.emptyText}>Track supplements, water, workouts — anything you want to check off daily.</Text>
      )}

      {tasks.map((task) => (
        <View key={task.id} style={styles.taskRow}>
          <Pressable
            onPress={() => handleToggle(task)}
            style={[styles.checkbox, task.completedToday && styles.checkboxDone]}
          >
            {task.completedToday && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
          <Text style={[styles.taskName, task.completedToday && styles.taskNameDone]}>
            {task.name}
          </Text>
          <Pressable onPress={() => handleRemove(task.id)} hitSlop={8}>
            <Text style={styles.removeX}>✕</Text>
          </Pressable>
        </View>
      ))}

      {adding && (
        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Take vitamins"
            placeholderTextColor="#9ca3af"
            autoFocus
            onSubmitEditing={handleAdd}
            style={styles.addInput}
          />
          <Pressable onPress={() => { setAdding(false); setNewName(""); }}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleAdd}
            disabled={saving || !newName.trim()}
            style={[styles.addButton, (saving || !newName.trim()) && { opacity: 0.5 }]}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "#f0f0f0", alignItems: "center",
  },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  addLink: { fontSize: 12, fontWeight: "700", color: ORANGE },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center",
  },
  checkboxDone: { backgroundColor: ORANGE, borderColor: ORANGE },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "800" },
  taskName: { flex: 1, fontSize: 14, color: "#374151" },
  taskNameDone: { color: "#9ca3af", textDecorationLine: "line-through" },
  removeX: { color: "#d1d5db", fontSize: 13 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f9fafb" },
  addInput: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: "#111827",
  },
  cancelLink: { fontSize: 12, fontWeight: "600", color: "#9ca3af" },
  addButton: { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
