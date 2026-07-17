import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { MacroBucket } from "@/lib/chartRange";

const ORANGE = "#f97316";

export default function WeeklyChart({ data, target }: { data: MacroBucket[]; target?: number }) {
  const [selected, setSelected] = useState<MacroBucket | null>(null);

  const width = 320;
  const height = 140;
  const padTop = 14;
  const padBottom = 22;
  const padX = 14;
  const plotH = height - padTop - padBottom;
  const plotW = width - padX * 2;

  if (data.length === 0) {
    return <View style={styles.emptyState}><Text style={styles.emptyText}>No data yet</Text></View>;
  }

  const maxVal = Math.max(...data.map((d) => d.calories), target ?? 0, 1);
  const yMax = maxVal * 1.15;

  const points = data.map((d, i) => ({
    x: padX + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2),
    y: padTop + plotH * (1 - d.calories / yMax),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${padTop + plotH} Z`;

  const targetY = target ? padTop + plotH * (1 - target / yMax) : null;

  // Show every Nth label to avoid crowding when there are many points
  const labelStride = Math.max(1, Math.ceil(data.length / 8));

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {targetY != null && (
          <Line x1={padX} x2={width - padX} y1={targetY} y2={targetY} stroke="#d1d5db" strokeWidth={1} strokeDasharray="3,3" />
        )}
        <Path d={areaPath} fill={ORANGE} opacity={0.08} />
        <Path d={linePath} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={`${data[i].date}-hit`} cx={p.x} cy={p.y} r={12} fill="transparent" onPress={() => setSelected(data[i])} />
        ))}
        {points.map((p, i) => (
          <Circle
            key={`${data[i].date}-dot`}
            cx={p.x} cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill={ORANGE}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
        {data.map((d, i) => (
          i % labelStride === 0 && (
            <SvgText
              key={`${d.date}-label`}
              x={points[i].x} y={height - 4}
              textAnchor="middle"
              fontSize={9}
              fontWeight="500"
              fill="#9ca3af"
            >
              {d.label}
            </SvgText>
          )
        ))}
      </Svg>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {selected && (
              <>
                <Text style={styles.cardTitle}>{selected.label}</Text>
                <Text style={styles.cardCalories}>{Math.round(selected.calories)} kcal</Text>
                <View style={styles.macroRow}>
                  <View style={styles.macroItem}>
                    <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroValue}>{Math.round(selected.carbsG)}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
                    <Text style={styles.macroLabel}>Fat</Text>
                    <Text style={styles.macroValue}>{Math.round(selected.fatG)}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroValue}>{Math.round(selected.proteinG)}g</Text>
                  </View>
                </View>
                <Pressable style={styles.closeButton} onPress={() => setSelected(null)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { height: 140, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.4)", alignItems: "center", justifyContent: "center" },
  card: {
    width: 280, backgroundColor: "#fff", borderRadius: 24, padding: 22, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  cardCalories: { fontSize: 30, fontWeight: "800", color: "#111827", marginTop: 6 },
  macroRow: { flexDirection: "row", gap: 18, marginTop: 18 },
  macroItem: { alignItems: "center", gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
  macroValue: { fontSize: 15, fontWeight: "700", color: "#374151" },
  closeButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 12, backgroundColor: "#f3f4f6" },
  closeButtonText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
});
