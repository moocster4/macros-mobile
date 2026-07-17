import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Targets {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
}

interface Totals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface RingSpec {
  key: keyof Totals;
  targetKey: keyof Targets;
  label: string;
  color: string;
  unit: string;
}

// Outer → inner, matching the requested display order
const RINGS: RingSpec[] = [
  { key: "calories", targetKey: "targetCalories", label: "Calories", color: "#f97316", unit: "" },
  { key: "carbsG",   targetKey: "targetCarbsG",   label: "Carbs",    color: "#f59e0b", unit: "g" },
  { key: "fatG",     targetKey: "targetFatG",     label: "Fat",      color: "#3b82f6", unit: "g" },
  { key: "proteinG", targetKey: "targetProteinG", label: "Protein",  color: "#ef4444", unit: "g" },
];

const SIZE = 220;
const STROKE = 14;
const BAND = 19;
const CENTER = SIZE / 2;

export default function CombinedRings({ totals, targets }: { totals: Totals; targets: Targets }) {
  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {RINGS.map((ring, i) => {
          const r = CENTER - STROKE / 2 - 2 - i * BAND;
          return (
            <Circle
              key={ring.key}
              cx={CENTER} cy={CENTER} r={r}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={STROKE}
            />
          );
        })}
        {RINGS.map((ring, i) => {
          const r = CENTER - STROKE / 2 - 2 - i * BAND;
          const circumference = 2 * Math.PI * r;
          const value = totals[ring.key];
          const target = targets[ring.targetKey];
          const pct = target > 0 ? Math.min(1, value / target) : 0;
          const over = value > target;

          return (
            <Circle
              key={`${ring.key}-progress`}
              cx={CENTER} cy={CENTER} r={r}
              fill="none"
              stroke={over ? "#dc2626" : ring.color}
              strokeWidth={STROKE}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
              strokeLinecap="round"
              rotation={-90}
              origin={`${CENTER}, ${CENTER}`}
            />
          );
        })}
      </Svg>

      <View style={styles.legend}>
        {RINGS.map((ring) => {
          const value = totals[ring.key];
          const target = targets[ring.targetKey];
          return (
            <View key={ring.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: ring.color }]} />
              <Text style={styles.legendLabel}>{ring.label}</Text>
              <Text style={styles.legendValue}>
                {Math.round(value)}{ring.unit}/{Math.round(target)}{ring.unit}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  legendValue: { fontSize: 11, color: "#9ca3af" },
});
