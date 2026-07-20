import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toDateStr, todayStr } from "@/lib/date";
import WorkoutLogger, { type WorkoutEntry } from "@/components/WorkoutLogger";

const ORANGE = "#f97316";

function localDate(iso: string) { return toDateStr(new Date(iso)); }

export default function WorkoutsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api<{ workouts: WorkoutEntry[] }>("/api/user/workout-log?days=7");
    setWorkouts(res.workouts ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      load().finally(() => setLoading(false));
    }, [user, load])
  );

  if (authLoading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={ORANGE} /></SafeAreaView>;
  }
  if (!user) return <Redirect href="/login" />;

  const today = todayStr();
  const todayWorkouts = workouts.filter((w) => localDate(w.loggedAt) === today);
  const burnedToday = todayWorkouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);
  const burnedWeek = workouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.logo}>Workouts</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{burnedToday}</Text>
              <Text style={styles.summaryLabel}>kcal today</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{burnedWeek}</Text>
              <Text style={styles.summaryLabel}>kcal this week</Text>
            </View>
          </View>
          {burnedToday > 0 && (
            <Text style={styles.budgetNote}>🔥 Today&apos;s burned calories are added to your daily budget.</Text>
          )}

          <View style={{ height: 16 }} />
          <Text style={styles.sectionLabel}>Today</Text>
          <WorkoutLogger workouts={todayWorkouts} onChanged={load} />

          {/* Garmin roadmap */}
          <View style={{ height: 16 }} />
          <View style={styles.garminCard}>
            <Text style={styles.garminEmoji}>⌚</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.garminTitle}>Garmin sync</Text>
              <Text style={styles.garminSub}>Coming soon — auto-import your daily activity and workouts to adjust your calories automatically.</Text>
            </View>
            <View style={styles.soonPill}><Text style={styles.soonText}>Soon</Text></View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  logo: { fontSize: 22, fontWeight: "800", color: ORANGE },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryTile: { flex: 1, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f0f0f0", padding: 20, alignItems: "center" },
  summaryValue: { fontSize: 30, fontWeight: "800", color: "#ea580c" },
  summaryLabel: { fontSize: 12, color: "#9ca3af", marginTop: 2, fontWeight: "600" },
  budgetNote: { fontSize: 12, color: "#6b7280", marginTop: 10, textAlign: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  garminCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#f0f0f0", padding: 16 },
  garminEmoji: { fontSize: 26 },
  garminTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  garminSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  soonPill: { backgroundColor: "#f3f4f6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  soonText: { fontSize: 11, fontWeight: "700", color: "#9ca3af" },
});
