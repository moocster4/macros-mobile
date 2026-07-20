import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/lib/api";

const BLUE = "#3b82f6";
const GLASS_ML = 250;
const GOAL_GLASSES = 8;

export default function WaterTracker() {
  const [totalMl, setTotalMl] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ totalMl: number }>("/api/user/water-log")
      .then(({ totalMl }) => setTotalMl(totalMl))
      .catch(() => setTotalMl(0));
  }, []);

  async function add() {
    if (busy) return;
    setBusy(true);
    setTotalMl((t) => (t ?? 0) + GLASS_ML); // optimistic
    try {
      const { totalMl } = await api<{ totalMl: number }>("/api/user/water-log", {
        method: "POST",
        body: JSON.stringify({ amountMl: GLASS_ML }),
      });
      setTotalMl(totalMl);
    } catch {
      setTotalMl((t) => Math.max(0, (t ?? 0) - GLASS_ML));
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (busy || !totalMl) return;
    setBusy(true);
    setTotalMl((t) => Math.max(0, (t ?? 0) - GLASS_ML)); // optimistic
    try {
      const { totalMl } = await api<{ totalMl: number }>("/api/user/water-log", { method: "DELETE" });
      setTotalMl(totalMl);
    } catch {
      setTotalMl((t) => (t ?? 0) + GLASS_ML);
    } finally {
      setBusy(false);
    }
  }

  const glasses = Math.round((totalMl ?? 0) / GLASS_ML);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>💧 Water</Text>
        <Text style={styles.count}>
          {glasses} <Text style={styles.countMuted}>/ {GOAL_GLASSES} glasses</Text>
        </Text>
      </View>

      <View style={styles.glassRow}>
        {Array.from({ length: GOAL_GLASSES }).map((_, i) => (
          <View key={i} style={[styles.segment, i < glasses && styles.segmentFilled]} />
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.undoButton} onPress={undo} disabled={busy || !glasses}>
          <Text style={[styles.undoText, !glasses && { color: "#d1d5db" }]}>Undo</Text>
        </Pressable>
        <Pressable style={styles.addButton} onPress={add} disabled={busy}>
          <Text style={styles.addText}>+ Glass</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  count: { fontSize: 15, fontWeight: "800", color: BLUE },
  countMuted: { fontSize: 12, fontWeight: "500", color: "#9ca3af" },
  glassRow: { flexDirection: "row", gap: 5 },
  segment: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "#eff6ff" },
  segmentFilled: { backgroundColor: BLUE },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  undoButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  undoText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  addButton: { flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  addText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
