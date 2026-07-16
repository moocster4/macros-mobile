import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

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

function Ring({
  label, value, target, color, size, unit,
}: { label: string; value: number; target: number; color: string; size: number; unit: string }) {
  const sw = size >= 160 ? 14 : 9;
  const r = size / 2 - sw / 2 - 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = value > target;
  const remaining = Math.max(0, Math.round(target - value));

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        <Circle
          cx={c} cy={c} r={r}
          fill="none"
          stroke={over ? "#ef4444" : color}
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          strokeLinecap="round"
          rotation={-90}
          origin={`${c}, ${c}`}
        />
        <SvgText
          x={c} y={c + (size >= 160 ? 8 : 4)}
          textAnchor="middle"
          fontSize={size >= 160 ? 30 : 15}
          fontWeight="800"
          fill="#111827"
        >
          {over ? `+${Math.round(value - target)}` : remaining}
        </SvgText>
        <SvgText
          x={c} y={c + (size >= 160 ? 26 : 16)}
          textAnchor="middle"
          fontSize={size >= 160 ? 11 : 8}
          fill="#9ca3af"
          fontWeight="600"
        >
          {over ? `${unit} over` : `${unit} left`}
        </SvgText>
      </Svg>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringSub}>{Math.round(value)}/{Math.round(target)}{unit}</Text>
    </View>
  );
}

export default function DailyRings({ totals, targets }: { totals: Totals; targets: Targets }) {
  return (
    <View style={styles.card}>
      <View style={{ alignItems: "center" }}>
        <Ring label="Calories" value={totals.calories} target={targets.targetCalories} color="#f97316" size={180} unit="" />
      </View>
      <View style={styles.row}>
        <Ring label="Protein" value={totals.proteinG} target={targets.targetProteinG} color="#f97316" size={92} unit="g" />
        <Ring label="Carbs"   value={totals.carbsG}   target={targets.targetCarbsG}   color="#f59e0b" size={92} unit="g" />
        <Ring label="Fat"     value={totals.fatG}     target={targets.targetFatG}     color="#3b82f6" size={92} unit="g" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f9fafb",
  },
  ringLabel: { fontSize: 13, fontWeight: "600", color: "#4b5563", marginTop: 6 },
  ringSub: { fontSize: 10, color: "#9ca3af" },
});
