import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { api } from "@/lib/api";
import { useUnits } from "@/lib/units";
import type { WeightBucket } from "@/lib/chartRange";

const BLUE = "#3b82f6";

export default function WeightChart({ data, onChanged }: { data: WeightBucket[]; onChanged: () => void }) {
  const { weightUnit, displayToKg } = useUnits();
  const [selected, setSelected] = useState<WeightBucket | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const width = 300;
  const height = 100;
  const padTop = 10;
  const padBottom = 4;
  const padX = 8;
  const plotH = height - padTop - padBottom;
  const plotW = width - padX * 2;

  if (data.length === 0) {
    return <View style={styles.emptyState}><Text style={styles.emptyText}>No data yet</Text></View>;
  }

  const values = data.map((d) => d.weightLbs);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const yMin = min - range * 0.15;
  const yMax = max + range * 0.15;

  const points = data.map((d, i) => ({
    x: padX + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2),
    y: padTop + plotH * (1 - (d.weightLbs - yMin) / (yMax - yMin)),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${padTop + plotH} Z`;

  const first = data[0].weightLbs;
  const last = data[data.length - 1].weightLbs;
  const delta = last - first;

  function openDetail(d: WeightBucket) {
    setSelected(d);
    setEditing(false);
    setEditValue(d.weightLbs.toFixed(1));
  }

  function close() {
    setSelected(null);
    setEditing(false);
  }

  async function handleSaveEdit() {
    if (!selected?.id) return;
    const val = Number(editValue);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await api(`/api/user/weight-log/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ weightKg: displayToKg(val) }),
      });
      onChanged();
      close();
    } catch { /* silently fail */ } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selected?.id) return;
    setSaving(true);
    try {
      await api(`/api/user/weight-log/${selected.id}`, { method: "DELETE" });
      onChanged();
      close();
    } catch { /* silently fail */ } finally { setSaving(false); }
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.value}>{last.toFixed(1)}</Text>
        <Text style={styles.unit}>{weightUnit}</Text>
        {Math.abs(delta) >= 0.1 && (
          <Text style={styles.delta}>
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)} {weightUnit} this period
          </Text>
        )}
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={areaPath} fill={BLUE} opacity={0.1} />
        <Path d={linePath} fill="none" stroke={BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={`${data[i].date}-hit`} cx={p.x} cy={p.y} r={14} fill="transparent" onPress={() => openDetail(data[i])} />
        ))}
        {points.map((p, i) => (
          <Circle
            key={`${data[i].date}-dot`}
            cx={p.x} cy={p.y}
            r={i === points.length - 1 ? 5 : 3.5}
            fill={BLUE}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </Svg>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {selected && !editing && (
              <>
                <Text style={styles.cardTitle}>{selected.label}</Text>
                <Text style={styles.cardValue}>{selected.weightLbs.toFixed(1)} <Text style={styles.cardUnit}>{weightUnit}</Text></Text>
                {selected.id ? (
                  <View style={styles.actionRow}>
                    <Pressable style={styles.actionButton} onPress={() => setEditing(true)}>
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete} disabled={saving}>
                      {saving ? <ActivityIndicator size="small" color="#dc2626" /> : <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>}
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.aggregateNote}>Averaged over this period</Text>
                )}
                <Pressable style={styles.closeButton} onPress={close}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}
            {selected && editing && (
              <>
                <Text style={styles.cardTitle}>Edit weight</Text>
                <View style={styles.editRow}>
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    keyboardType="numeric"
                    autoFocus
                    style={styles.editInput}
                  />
                  <Text style={styles.cardUnit}>{weightUnit}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { height: 100, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  headerRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: "800", color: "#111827" },
  unit: { fontSize: 12, color: "#9ca3af" },
  delta: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.4)", alignItems: "center", justifyContent: "center" },
  card: {
    width: 270, backgroundColor: "#fff", borderRadius: 24, padding: 22, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 30, fontWeight: "800", color: "#111827", marginTop: 6 },
  cardUnit: { fontSize: 14, fontWeight: "400", color: "#9ca3af" },
  aggregateNote: { fontSize: 12, color: "#9ca3af", marginTop: 10 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 16, width: "100%" },
  actionButton: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingVertical: 10, alignItems: "center", justifyContent: "center",
  },
  actionButtonText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  deleteButton: { borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  deleteButtonText: { color: "#dc2626" },
  saveButton: { backgroundColor: BLUE, borderColor: BLUE },
  saveButtonText: { color: "#fff" },
  editRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12 },
  editInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 18, fontWeight: "700", width: 100, textAlign: "center",
  },
  closeButton: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 12, backgroundColor: "#f3f4f6" },
  closeButtonText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
});
