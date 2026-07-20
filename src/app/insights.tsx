import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { toDateStr } from "@/lib/date";
import { useUnits } from "@/lib/units";

const ORANGE = "#f97316";

interface MealLogEntry {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
}
interface WeightLogEntry { weightKg: number; loggedAt: string }
interface Targets {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
}

function localDate(iso: string) { return toDateStr(new Date(iso)); }

export default function InsightsScreen() {
  const router = useRouter();
  const { weightUnit, kgToDisplay } = useUnits();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<MealLogEntry[]>([]);
  const [weights, setWeights] = useState<WeightLogEntry[]>([]);
  const [targets, setTargets] = useState<Targets | null>(null);

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  useEffect(() => {
    Promise.all([
      api<{ logs: MealLogEntry[] }>("/api/user/meal-log/history?days=30"),
      api<{ logs: WeightLogEntry[] }>("/api/user/weight-log?days=30"),
      api<{ profile: Targets | null }>("/api/user/diet-profile"),
    ])
      .then(([h, w, p]) => {
        setHistory(h.logs ?? []);
        setWeights(w.logs ?? []);
        setTargets(p.profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const insights = useMemo(() => {
    // Daily totals for the last 7 days.
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toDateStr(d));
    }
    const byDate = new Map<string, { cal: number; p: number; c: number; f: number }>();
    for (const l of history) {
      const d = localDate(l.loggedAt);
      if (!days.includes(d)) continue;
      const cur = byDate.get(d) ?? { cal: 0, p: 0, c: 0, f: 0 };
      cur.cal += l.calories ?? 0;
      cur.p += l.proteinG ?? 0;
      cur.c += l.carbsG ?? 0;
      cur.f += l.fatG ?? 0;
      byDate.set(d, cur);
    }
    const loggedDays = byDate.size;
    const totals = [...byDate.values()];
    const n = Math.max(1, loggedDays);
    const avg = {
      cal: Math.round(totals.reduce((s, d) => s + d.cal, 0) / n),
      p: Math.round(totals.reduce((s, d) => s + d.p, 0) / n),
      c: Math.round(totals.reduce((s, d) => s + d.c, 0) / n),
      f: Math.round(totals.reduce((s, d) => s + d.f, 0) / n),
    };

    let onTargetDays = 0;
    if (targets?.targetCalories) {
      for (const d of byDate.values()) {
        if (Math.abs(d.cal - targets.targetCalories) <= targets.targetCalories * 0.1) onTargetDays++;
      }
    }

    // Weight trend over the range.
    let weightDelta: number | null = null;
    if (weights.length >= 2) {
      const sorted = [...weights].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
      weightDelta = kgToDisplay(sorted[sorted.length - 1].weightKg) - kgToDisplay(sorted[0].weightKg);
    }

    return { avg, loggedDays, onTargetDays, weightDelta };
  }, [history, weights, targets, kgToDisplay]);

  const bullets = useMemo(() => {
    const out: string[] = [];
    const { avg, loggedDays, onTargetDays, weightDelta } = insights;
    if (loggedDays === 0) return ["Log a few meals this week and your insights will show up here."];

    if (loggedDays < 5) {
      out.push(`You logged ${loggedDays} of the last 7 days. Consistent logging is the biggest predictor of results — aim to log every meal.`);
    } else {
      out.push(`Solid consistency — you logged ${loggedDays} of the last 7 days.`);
    }

    if (targets?.targetProteinG && avg.p < targets.targetProteinG * 0.9) {
      out.push(`Protein is averaging ${avg.p}g — about ${Math.round(targets.targetProteinG - avg.p)}g under your ${targets.targetProteinG}g goal. Add a lean protein source.`);
    } else if (targets?.targetProteinG) {
      out.push(`Protein is on point at ~${avg.p}g/day.`);
    }

    if (targets?.targetCalories) {
      if (avg.cal > targets.targetCalories * 1.1) {
        out.push(`Calories are averaging ${avg.cal}, above your ${targets.targetCalories} target. Trim portions or swap higher-calorie items.`);
      } else if (avg.cal > 0 && avg.cal < targets.targetCalories * 0.85) {
        out.push(`You're averaging ${avg.cal} kcal — well under your ${targets.targetCalories} target. Make sure you're eating enough.`);
      } else if (onTargetDays >= 4) {
        out.push(`You hit your calorie target on ${onTargetDays} of your logged days — great control.`);
      }
    }

    if (weightDelta != null && Math.abs(weightDelta) >= 0.5) {
      const dir = weightDelta < 0 ? "down" : "up";
      out.push(`Your weight is ${dir} ${Math.abs(weightDelta).toFixed(1)} ${weightUnit} over the last month.`);
    }

    return out.slice(0, 4);
  }, [insights, targets, weightUnit]);

  const statTiles = [
    { label: "Calories", value: insights.avg.cal, target: targets?.targetCalories, color: "#f97316", suffix: "" },
    { label: "Protein", value: insights.avg.p, target: targets?.targetProteinG, color: "#ef4444", suffix: "g" },
    { label: "Carbs", value: insights.avg.c, target: targets?.targetCarbsG, color: "#f59e0b", suffix: "g" },
    { label: "Fat", value: insights.avg.f, target: targets?.targetFatG, color: "#3b82f6", suffix: "g" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insights</Text>
        <Pressable onPress={dismiss}>
          <Text style={styles.doneLink}>Done</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={ORANGE} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>7-day averages</Text>
          <View style={styles.statGrid}>
            {statTiles.map((s) => (
              <View key={s.label} style={styles.statTile}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}{s.suffix}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                {!!s.target && (
                  <Text style={styles.statTarget}>{Math.round((s.value / s.target) * 100)}% of goal</Text>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Consistency</Text>
          <View style={styles.card}>
            <View style={styles.consRow}>
              <Text style={styles.consNum}>{insights.loggedDays}<Text style={styles.consMuted}>/7</Text></Text>
              <Text style={styles.consLabel}>days logged</Text>
            </View>
            {!!targets?.targetCalories && (
              <>
                <View style={styles.divider} />
                <View style={styles.consRow}>
                  <Text style={styles.consNum}>{insights.onTargetDays}<Text style={styles.consMuted}>/{insights.loggedDays}</Text></Text>
                  <Text style={styles.consLabel}>logged days on calorie target</Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionLabel}>What this means</Text>
          <View style={styles.card}>
            {bullets.map((b, i) => (
              <View key={i} style={[styles.bulletRow, i > 0 && { marginTop: 12 }]}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1f2937" },
  doneLink: { fontSize: 15, fontWeight: "700", color: ORANGE },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statTile: { flexBasis: "47%", flexGrow: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", padding: 16, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: "600" },
  statTarget: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", padding: 16 },
  consRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  consNum: { fontSize: 22, fontWeight: "800", color: "#111827" },
  consMuted: { fontSize: 15, fontWeight: "600", color: "#9ca3af" },
  consLabel: { fontSize: 13, color: "#6b7280" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  bulletRow: { flexDirection: "row", gap: 8 },
  bulletDot: { fontSize: 15, color: ORANGE, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
});
