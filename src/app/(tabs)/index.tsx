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
import { Redirect, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toDateStr, todayStr } from "@/lib/date";
import { RangeKey, daysForRange, aggregateMacrosByRange, aggregateWeightByRange, MacroRaw, WeightRaw } from "@/lib/chartRange";
import CombinedRings from "@/components/CombinedRings";
import DateStrip from "@/components/DateStrip";
import CalendarPicker from "@/components/CalendarPicker";
import ManualLogger from "@/components/ManualLogger";
import FoodSearchLogger from "@/components/FoodSearchLogger";
import DailyTasksChecklist from "@/components/DailyTasksChecklist";
import WeightLogger from "@/components/WeightLogger";
import WeeklyChart from "@/components/WeeklyChart";
import WeightChart from "@/components/WeightChart";
import RangeSelector from "@/components/RangeSelector";
import MealEntryModal, { MealLogEntry } from "@/components/MealEntryModal";

const ORANGE = "#f97316";

interface DietProfile {
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
  const { user, loading: authLoading, logout } = useAuth();
  const [targets, setTargets] = useState<DietProfile | null>(null);
  const [history, setHistory] = useState<MealLogEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("7D");
  const [selectedMeal, setSelectedMeal] = useState<MealLogEntry | null>(null);

  const load = useCallback(async () => {
    const historyDays = Math.max(daysForRange(range), 30);
    const weightDays = Math.max(daysForRange(range), 90);
    const [profileRes, historyRes, weightRes] = await Promise.all([
      api<{ profile: DietProfile | null }>("/api/user/diet-profile"),
      api<{ logs: MealLogEntry[] }>(`/api/user/meal-log/history?days=${historyDays}`),
      api<{ logs: WeightLogEntry[] }>(`/api/user/weight-log?days=${weightDays}`),
    ]);
    setTargets(profileRes.profile);
    setHistory(historyRes.logs ?? []);
    setWeightLogs(weightRes.logs ?? []);
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

  const weightRaw = useMemo<WeightRaw[]>(
    () => weightLogs.map((l) => ({ id: l.id, date: localDate(l.loggedAt), weightLbs: l.weightKg * 2.20462 })),
    [weightLogs]
  );

  const weightBuckets = useMemo(() => aggregateWeightByRange(weightRaw, range), [weightRaw, range]);

  const latestWeightLbs = weightRaw.length > 0
    ? weightRaw.reduce((latest, w) => (w.date > latest.date ? w : latest), weightRaw[0]).weightLbs
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
                <CombinedRings totals={totalsForSelectedDate} targets={targets!} />
              </View>
            ) : (
              <View style={styles.noGoalsCard}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>🎯</Text>
                <Text style={styles.noGoalsTitle}>Set your daily goals on the web app</Text>
                <Text style={styles.noGoalsSub}>Once set, they&apos;ll show up here automatically</Text>
              </View>
            )}

            {isToday && (
              <>
                <View style={{ height: 12 }} />
                <FoodSearchLogger onLogged={load} />
                <View style={{ height: 8 }} />
                <ManualLogger onLogged={load} />
              </>
            )}

            {isToday && (
              <>
                <View style={{ height: 12 }} />
                <DailyTasksChecklist />
                <View style={{ height: 12 }} />
                <WeightLogger latestLbs={latestWeightLbs} onLogged={load} />
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

            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>
              {dateLabel(selectedDate)} · {logsForSelectedDate.length} meal{logsForSelectedDate.length !== 1 ? "s" : ""}
            </Text>
            {logsForSelectedDate.length === 0 ? (
              <Text style={styles.emptyText}>
                {isToday ? "Nothing logged yet — snap a photo to get started." : "No meals logged this day."}
              </Text>
            ) : (
              <View style={styles.mealList}>
                {logsForSelectedDate.map((entry) => (
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
            )}
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
  logout: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },
  ringsCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  noGoalsCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  noGoalsTitle: { fontWeight: "700", fontSize: 14, color: "#1f2937" },
  noGoalsSub: { fontSize: 12, color: "#9ca3af", marginTop: 4, textAlign: "center" },
  chartCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  mealList: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" },
  mealRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  mealName: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  mealMacros: { flexDirection: "row", gap: 8, marginTop: 3 },
  mealMacroText: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
});
