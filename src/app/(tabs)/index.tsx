import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import DailyRings from "@/components/DailyRings";
import PhotoLogger from "@/components/PhotoLogger";
import ManualLogger from "@/components/ManualLogger";

const ORANGE = "#f97316";

interface DietProfile {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
}

interface MealLogEntry {
  id: string;
  name: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
}

interface MealLogResponse {
  logs: MealLogEntry[];
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
}

export default function TodayScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const [targets, setTargets] = useState<DietProfile | null>(null);
  const [logs, setLogs] = useState<MealLogEntry[]>([]);
  const [totals, setTotals] = useState({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [profileRes, mealRes] = await Promise.all([
      api<{ profile: DietProfile | null }>("/api/user/diet-profile"),
      api<MealLogResponse>("/api/user/meal-log"),
    ]);
    setTargets(profileRes.profile);
    setLogs(mealRes.logs);
    setTotals(mealRes.totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  }, []);

  useEffect(() => {
    if (!user) return;
    load().finally(() => setLoading(false));
  }, [user, load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={ORANGE} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const hasGoals = !!targets && targets.targetCalories > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ORANGE} />}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Macros</Text>
          <Pressable onPress={logout}>
            <Text style={styles.logout}>Sign out</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
        ) : (
          <>
            {hasGoals ? (
              <DailyRings totals={totals} targets={targets!} />
            ) : (
              <View style={styles.noGoalsCard}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>🎯</Text>
                <Text style={styles.noGoalsTitle}>Set your daily goals on the web app</Text>
                <Text style={styles.noGoalsSub}>Once set, they&apos;ll show up here automatically</Text>
              </View>
            )}

            <View style={{ height: 12 }} />
            <PhotoLogger onLogged={load} />
            <View style={{ height: 8 }} />
            <ManualLogger onLogged={load} />

            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>Today · {logs.length} meal{logs.length !== 1 ? "s" : ""}</Text>
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>Nothing logged yet — snap a photo to get started.</Text>
            ) : (
              <View style={styles.mealList}>
                {logs.map((entry) => (
                  <View key={entry.id} style={styles.mealRow}>
                    <Text style={styles.mealName} numberOfLines={1}>{entry.name}</Text>
                    {entry.calories != null && (
                      <View style={styles.mealMacros}>
                        <Text style={styles.mealMacroText}>{Math.round(entry.calories)} kcal</Text>
                        {entry.proteinG != null && <Text style={[styles.mealMacroText, { color: "#f97316" }]}>{Math.round(entry.proteinG)}g P</Text>}
                        {entry.carbsG != null && <Text style={[styles.mealMacroText, { color: "#f59e0b" }]}>{Math.round(entry.carbsG)}g C</Text>}
                        {entry.fatG != null && <Text style={[styles.mealMacroText, { color: "#3b82f6" }]}>{Math.round(entry.fatG)}g F</Text>}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F7" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  logo: { fontSize: 22, fontWeight: "800", color: ORANGE },
  logout: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },
  noGoalsCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  noGoalsTitle: { fontWeight: "700", fontSize: 14, color: "#1f2937" },
  noGoalsSub: { fontSize: 12, color: "#9ca3af", marginTop: 4, textAlign: "center" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  mealList: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" },
  mealRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  mealName: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  mealMacros: { flexDirection: "row", gap: 8, marginTop: 3 },
  mealMacroText: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
});
