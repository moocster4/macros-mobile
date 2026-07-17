import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/chartRange";

const ORANGE = "#f97316";

export default function RangeSelector({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={{ gap: 6 }}>
      {RANGE_OPTIONS.map((r) => {
        const active = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{r}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 10 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#f3f4f6" },
  pillActive: { backgroundColor: ORANGE },
  pillText: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  pillTextActive: { color: "#fff" },
});
