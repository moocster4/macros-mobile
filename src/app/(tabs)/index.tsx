import { useCallback, useMemo, useState } from "react";
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
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { getPlan } from "@/lib/plans";
import { useAuth } from "@/lib/auth";
import { useUnits } from "@/lib/units";
import { MEAL_TYPES } from "@/lib/mealType";
import { getTodayActiveEnergy, isHealthConnected } from "@/lib/healthkit";
import { api } from "@/lib/api";
import { toDateStr, todayStr } from "@/lib/date";
import { RangeKey, daysForRange, aggregateMacrosByRange, aggregateWeightByRange, MacroRaw, WeightRaw } from "@/lib/chartRange";
import CombinedRings from "@/components/CombinedRings";
import DateStrip from "@/components/DateStrip";
import CalendarPicker from "@/components/CalendarPicker";
import LogFoodMenu from "@/components/LogFoodMenu";
import DailyTasksChecklist from "@/components/DailyTasksChecklist";
import WeightLogger from "@/components/WeightLogger";
import WaterTracker from "@/components/WaterTracker";
import { type WorkoutEntry } from "@/components/WorkoutLogger";
import WeeklyChart from "@/components/WeeklyChart";
import WeightChart from "@/components/WeightChart";
import RangeSelector from "@/components/RangeSelector";
import MealEntryModal, { MealLogEntry } from "@/components/MealEntryModal";

const ORANGE = "#f97316";

interface DietProfile {
  goalType: string | null;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
}

interface WeightLogEntry {
  id: string;
  weightKg: number;
  loggedAt: string;
}

function localDate(isoStr: string) {
  return toDateStr(new Date(isoStr));
}

function dateLabel(dateStr: string) {
  const today = todayStr();
  const yesterdayDt = new Date();
  yesterdayDt.setDate(yesterdayDt.getDate() - 1);
  const yesterday = toDateStr(yesterdayDt);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function TodayScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { kgToDisplay } = useUnits();
  const [targets, setTargets] = useState<DietProfile | null>(null);
  const [history, setHistory] = useState<MealLogEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("7D");
  const [selectedMeal, setSelectedMeal] = useState<MealLogEntry | null>(null);
  const [activeEnergy, setActiveEnergy] = useState(0);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);

  const load = useCallback(async () => {
    const historyDays = Math.max(daysForRange(range), 30);
    const weightDays = Math.max(daysForRange(range), 90);
    const [profileRes, historyRes, weightRes, workoutRes] = await Promise.all([
      api<{ profile: DietProfile | null }>("/api/user/diet-profile"),
      api<{ logs: MealLogEntry[] }>(`/api/user/meal-log/history?days=${historyDays}`),
      api<{ logs: WeightLogEntry[] }>(`/api/user/weight-log?days=${weightDays}`),
      api<{ workouts: WorkoutEntry[] }>("/api/user/workout-log"),
    ]);
    setTargets(profileRes.profile);
    setHistory(historyRes.logs ?? []);
    setWeightLogs(weightRes.logs ?? []);
    setWorkouts(workoutRes.workouts ?? []);

    // Apple Health: add today's active calories to the budget (if connected).
    if (await isHealthConnected()) {
      setActiveEnergy(await getTodayActiveEnergy().catch(() => 0));
    } else {
      setActiveEnergy(0);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      load().finally(() => setLoading(false));
    }, [user, load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  const logsForSelectedDate = useMemo(
    () => history.filter((l) => localDate(l.loggedAt) === selectedDate),
    [history, selectedDate]
  );

  // Group into meal-type sections (Breakfast/Lunch/Dinner/Snacks, then Other).
  const mealSections = useMemo(() => {
    const order = [...MEAL_TYPES.map((m) => m.key), null];
    return order
      .map((key) => {
        const items = logsForSelectedDate.filter((l) => (l.mealType ?? null) === key);
        const label = key ? MEAL_TYPES.find((m) => m.key === key)!.label : "Other";
        const calories = items.reduce((s, l) => s + (l.calories ?? 0), 0);
        return { key: key ?? "other", label, items, calories };
      })
      .filter((s) => s.items.length > 0);
  }, [logsForSelectedDate]);

  const totalsForSelectedDate = useMemo(
    () => logsForSelectedDate.reduce(
      (acc, l) => ({
        calories: acc.calories + (l.calories ?? 0),
        proteinG: acc.proteinG + (l.proteinG ?? 0),
        carbsG:   acc.carbsG   + (l.carbsG   ?? 0),
        fatG:     acc.fatG     + (l.fatG     ?? 0),
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    ),
    [logsForSelectedDate]
  );

  const dailyMacroRaw = useMemo<MacroRaw[]>(() => {
    const byDate = new Map<string, MacroRaw>();
    for (const l of history) {
      const d = localDate(l.loggedAt);
      const entry = byDate.get(d) ?? { date: d, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
      entry.calories += l.calories ?? 0;
      entry.proteinG += l.proteinG ?? 0;
      entry.carbsG   += l.carbsG   ?? 0;
      entry.fatG     += l.fatG     ?? 0;
      byDate.set(d, entry);
    }
    return [...byDate.values()];
  }, [history]);

  const weeklyMacros = useMemo(() => aggregateMacrosByRange(dailyMacroRaw, range), [dailyMacroRaw, range]);

  // Chart values are in the user's display unit; field name stays weightLbs (unit-agnostic math).
  const weightRaw = useMemo<WeightRaw[]>(
    () => weightLogs.map((l) => ({ id: l.id, date: localDate(l.loggedAt), weightLbs: kgToDisplay(l.weightKg) })),
    [weightLogs, kgToDisplay]
  );

  const weightBuckets = useMemo(() => aggregateWeightByRange(weightRaw, range), [weightRaw, range]);

  // Canonical latest weight in kg (WeightLogger formats it per the unit preference).
  const latestWeightKg = weightLogs.length > 0
    ? weightLogs.reduce((latest, w) => (w.loggedAt > latest.loggedAt ? w : latest), weightLogs[0]).weightKg
    : null;

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
  const isToday = selectedDate === todayStr();

  // On today, active calories (Apple Health) + logged workouts are added to the budget.
  const workoutCalories = workouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);
  const activityBonus = activeEnergy + workoutCalories;
  const showActivity = isToday && activityBonus > 0 && hasGoals;
  const ringTargets = showActivity && targets
    ? { ...targets, targetCalories: targets.targetCalories + activityBonus }
    : targets;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ORANGE} />}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Macros</Text>
          <Pressable style={styles.avatarButton} onPress={() => router.push("/account")}>
            <Text style={styles.avatarButtonText}>
              {(user.name?.trim()?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <DateStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onOpenCalendar={() => setCalendarOpen(true)}
        />
        <CalendarPicker
          visible={calendarOpen}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onClose={() => setCalendarOpen(false)}
        />

        <View style={{ height: 12 }} />

        {loading ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
        ) : (
          <>
            {hasGoals ? (
              <View style={styles.ringsCard}>
                <View style={styles.ringsHeader}>
                  <Text style={styles.planPill}>
                    {getPlan(targets!.goalType)?.emoji ?? "🎯"} {getPlan(targets!.goalType)?.label ?? "Your plan"}
                  </Text>
                  <Pressable onPress={() => router.push("/plan")}>
                    <Text style={styles.editPlanLink}>Edit</Text>
                  </Pressable>
                </View>
                <CombinedRings totals={totalsForSelectedDate} targets={ringTargets!} />
                {showActivity && (
                  <Text style={styles.activityNote}>🔥 +{activityBonus} kcal from activity</Text>
                )}
              </View>
            ) : (
              <Pressable style={styles.noGoalsCard} onPress={() => router.push("/plan")}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>🎯</Text>
                <Text style={styles.noGoalsTitle}>Choose your plan</Text>
                <Text style={styles.noGoalsSub}>Lose fat, gain muscle, bulk, or maintain — we&apos;ll set your daily calories and macros</Text>
                <View style={styles.noGoalsButton}>
                  <Text style={styles.noGoalsButtonText}>Get started</Text>
                </View>
              </Pressable>
            )}

            {isToday && (
              <>
                <View style={{ height: 12 }} />
                <LogFoodMenu onLogged={load} />
              </>
            )}

            <View style={{ height: 16 }} />
            <Text style={styles.sectionTitle}>
              {dateLabel(selectedDate)} · {logsForSelectedDate.length} meal{logsForSelectedDate.length !== 1 ? "s" : ""}
            </Text>
            {logsForSelectedDate.length === 0 ? (
              <Text style={styles.emptyText}>
                {isToday ? "Nothing logged yet — tap ＋ Log food or scan to get started." : "No meals logged this day."}
              </Text>
            ) : (
              mealSections.map((section) => (
                <View key={section.key} style={{ marginBottom: 12 }}>
                  <View style={styles.mealSectionHeader}>
                    <Text style={styles.mealSectionLabel}>{section.label}</Text>
                    <Text style={styles.mealSectionCals}>{Math.round(section.calories)} kcal</Text>
                  </View>
                  <View style={styles.mealList}>
                    {section.items.map((entry) => (
                      <Pressable key={entry.id} style={styles.mealRow} onPress={() => setSelectedMeal(entry)}>
                        <Text style={styles.mealName} numberOfLines={1}>{entry.name}</Text>
                        {entry.calories != null && (
                          <View style={styles.mealMacros}>
                            <Text style={styles.mealMacroText}>{Math.round(entry.calories)} kcal</Text>
                            {entry.proteinG != null && <Text style={[styles.mealMacroText, { color: "#f97316" }]}>{Math.round(entry.proteinG)}g P</Text>}
                            {entry.carbsG != null && <Text style={[styles.mealMacroText, { color: "#f59e0b" }]}>{Math.round(entry.carbsG)}g C</Text>}
                            {entry.fatG != null && <Text style={[styles.mealMacroText, { color: "#3b82f6" }]}>{Math.round(entry.fatG)}g F</Text>}
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}

            {isToday && (
              <>
                <View style={{ height: 12 }} />
                <DailyTasksChecklist />
                <View style={{ height: 12 }} />
                <WaterTracker />
                <View style={{ height: 12 }} />
                <WeightLogger latestKg={latestWeightKg} onLogged={load} />
              </>
            )}

            <View style={{ height: 12 }} />
            <RangeSelector value={range} onChange={setRange} />
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Calories</Text>
              <WeeklyChart data={weeklyMacros} target={targets?.targetCalories} />
            </View>

            <View style={{ height: 12 }} />
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Weight</Text>
              <WeightChart data={weightBuckets} onChanged={load} />
            </View>

            <View style={{ height: 12 }} />
            <Pressable style={styles.insightsCard} onPress={() => router.push("/insights")}>
              <Text style={styles.insightsEmoji}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightsTitle}>Insights</Text>
                <Text style={styles.insightsSub}>Your weekly trends and coaching tips</Text>
              </View>
              <Text style={styles.insightsChevron}>›</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <MealEntryModal entry={selectedMeal} onClose={() => setSelectedMeal(null)} onChanged={load} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F7" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  logo: { fontSize: 22, fontWeight: "800", color: ORANGE },
  avatarButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  avatarButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  ringsCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  ringsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 12 },
  planPill: { fontSize: 13, fontWeight: "700", color: "#9a3412", backgroundColor: "#fff7ed", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  editPlanLink: { fontSize: 13, fontWeight: "700", color: ORANGE },
  activityNote: { fontSize: 12, fontWeight: "600", color: "#ea580c", marginTop: 10 },
  noGoalsCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  noGoalsTitle: { fontWeight: "700", fontSize: 16, color: "#1f2937" },
  noGoalsSub: { fontSize: 12, color: "#9ca3af", marginTop: 4, textAlign: "center" },
  noGoalsButton: { marginTop: 14, backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10 },
  noGoalsButtonText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  chartCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  insightsCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#f0f0f0" },
  insightsEmoji: { fontSize: 24 },
  insightsTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  insightsSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  insightsChevron: { fontSize: 22, color: "#d1d5db", fontWeight: "500" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  mealSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingHorizontal: 2 },
  mealSectionLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  mealSectionCals: { fontSize: 12, fontWeight: "600", color: "#9ca3af" },
  mealList: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" },
  mealRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  mealName: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  mealMacros: { flexDirection: "row", gap: 8, marginTop: 3 },
  mealMacroText: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
});
