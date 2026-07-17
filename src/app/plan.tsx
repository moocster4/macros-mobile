import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import {
  ACTIVITY_OPTIONS,
  CUSTOM_DEFAULT,
  PLANS,
  calcMaintenance,
  getPlan,
  macrosFromSplit,
  targetsForPlan,
  type GoalType,
} from "@/lib/plans";

const ORANGE = "#f97316";

interface FullProfile {
  goalType: string | null;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: string | null;
  activityLevel: string | null;
  maintenanceCalories: number | null;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
}

export default function PlanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Safe dismiss: pop back if there's history, otherwise land on Today.
  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  // Body stats (imperial input, converted to metric on save)
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [activity, setActivity] = useState("");
  const [maintenanceOverride, setMaintenanceOverride] = useState("");

  // Plan
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [customCalories, setCustomCalories] = useState("");
  const [customP, setCustomP] = useState(String(CUSTOM_DEFAULT.proteinPct));
  const [customC, setCustomC] = useState(String(CUSTOM_DEFAULT.carbsPct));
  const [customF, setCustomF] = useState(String(CUSTOM_DEFAULT.fatPct));

  useEffect(() => {
    api<{ profile: FullProfile | null }>("/api/user/diet-profile")
      .then(({ profile }) => {
        if (!profile) return;
        if (profile.heightCm) {
          const totalIn = profile.heightCm / 2.54;
          setHeightFt(String(Math.floor(totalIn / 12)));
          setHeightIn(String(Math.round(totalIn % 12)));
        }
        if (profile.weightKg) setWeightLbs(String(Math.round(profile.weightKg * 2.20462)));
        if (profile.age) setAge(String(profile.age));
        if (profile.sex) setSex(profile.sex);
        if (profile.activityLevel) setActivity(profile.activityLevel);
        if (profile.maintenanceCalories) setMaintenanceOverride(String(profile.maintenanceCalories));
        if (profile.goalType) setGoalType(profile.goalType as GoalType);
        if (profile.goalType === "custom") {
          if (profile.targetCalories) setCustomCalories(String(profile.targetCalories));
          const cals = profile.targetCalories || 0;
          if (cals > 0) {
            setCustomP(String(Math.round((profile.targetProteinG * 4 / cals) * 100)));
            setCustomC(String(Math.round((profile.targetCarbsG   * 4 / cals) * 100)));
            setCustomF(String(Math.round((profile.targetFatG     * 9 / cals) * 100)));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const weightKg = weightLbs ? Number(weightLbs) / 2.20462 : null;
  const heightCm = (heightFt || heightIn)
    ? ((Number(heightFt) || 0) * 12 + (Number(heightIn) || 0)) * 2.54
    : null;

  const estMaintenance = useMemo(() => {
    if (!weightKg || !heightCm || !age || !sex || !activity) return null;
    return calcMaintenance(weightKg, heightCm, Number(age), sex, activity);
  }, [weightKg, heightCm, age, sex, activity]);

  const maintenance = Number(maintenanceOverride) || estMaintenance || 0;
  const customTotalPct = (Number(customP) || 0) + (Number(customC) || 0) + (Number(customF) || 0);
  const customValid = goalType === "custom"
    ? customTotalPct === 100 && (Number(customCalories) || maintenance) > 0
    : true;

  const targets = useMemo(() => {
    if (!goalType) return null;
    if (goalType === "custom") {
      const cals = Number(customCalories) || maintenance;
      if (!cals) return null;
      return macrosFromSplit(cals, Number(customP) || 0, Number(customC) || 0, Number(customF) || 0);
    }
    const plan = getPlan(goalType);
    if (!plan || !maintenance) return null;
    return targetsForPlan(plan, maintenance);
  }, [goalType, maintenance, customCalories, customP, customC, customF]);

  const canSave = !!goalType && !!targets && maintenance > 0 && customValid && !saving;

  async function handleSave() {
    if (!targets || !goalType) return;
    setSaving(true);
    try {
      await api("/api/user/diet-profile", {
        method: "POST",
        body: JSON.stringify({
          goalType,
          name: getPlan(goalType)?.label ?? "Custom",
          targetCalories: targets.calories,
          targetProteinG: targets.proteinG,
          targetCarbsG:   targets.carbsG,
          targetFatG:     targets.fatG,
          heightCm:       heightCm ?? undefined,
          weightKg:       weightKg ?? undefined,
          age:            age ? Number(age) : undefined,
          sex:            sex || undefined,
          activityLevel:  activity || undefined,
          maintenanceCalories: maintenance || undefined,
        }),
      });
      dismiss();
    } catch {
      /* silently fail */
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={dismiss}>
          <Text style={styles.cancelLink}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your plan</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── Body stats ── */}
        <Text style={styles.sectionLabel}>About you</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Height</Text>
            <View style={styles.inlineInputs}>
              <TextInput value={heightFt} onChangeText={setHeightFt} keyboardType="numeric" placeholder="5" placeholderTextColor="#d1d5db" style={styles.smallInput} />
              <Text style={styles.unit}>ft</Text>
              <TextInput value={heightIn} onChangeText={setHeightIn} keyboardType="numeric" placeholder="10" placeholderTextColor="#d1d5db" style={styles.smallInput} />
              <Text style={styles.unit}>in</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Weight</Text>
            <View style={styles.inlineInputs}>
              <TextInput value={weightLbs} onChangeText={setWeightLbs} keyboardType="numeric" placeholder="175" placeholderTextColor="#d1d5db" style={styles.smallInput} />
              <Text style={styles.unit}>lbs</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Age</Text>
            <View style={styles.inlineInputs}>
              <TextInput value={age} onChangeText={setAge} keyboardType="numeric" placeholder="28" placeholderTextColor="#d1d5db" style={styles.smallInput} />
              <Text style={styles.unit}>yrs</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Sex</Text>
            <View style={styles.segment}>
              {["male", "female"].map((s) => (
                <Pressable key={s} onPress={() => setSex(s)} style={[styles.segmentItem, sex === s && styles.segmentItemActive]}>
                  <Text style={[styles.segmentText, sex === s && styles.segmentTextActive]}>{s === "male" ? "Male" : "Female"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Activity level</Text>
        <View style={styles.card}>
          {ACTIVITY_OPTIONS.map((opt, i) => (
            <View key={opt.value}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable style={styles.activityRow} onPress={() => setActivity(opt.value)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityLabel}>{opt.label}</Text>
                  <Text style={styles.activityDesc}>{opt.desc}</Text>
                </View>
                <View style={[styles.radio, activity === opt.value && styles.radioActive]}>
                  {activity === opt.value && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Maintenance */}
        <View style={styles.maintenanceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.maintenanceLabel}>Estimated maintenance</Text>
            <Text style={styles.maintenanceSub}>
              {estMaintenance ? "Calories to hold your weight" : "Fill in your stats to estimate"}
            </Text>
          </View>
          <TextInput
            value={maintenanceOverride}
            onChangeText={setMaintenanceOverride}
            keyboardType="numeric"
            placeholder={estMaintenance ? String(estMaintenance) : "—"}
            placeholderTextColor="#9ca3af"
            style={styles.maintenanceInput}
          />
        </View>

        {/* ── Plan picker ── */}
        <Text style={styles.sectionLabel}>Pick your goal</Text>
        {PLANS.map((plan) => {
          const selected = goalType === plan.id;
          const t = maintenance ? targetsForPlan(plan, maintenance) : null;
          return (
            <Pressable
              key={plan.id}
              style={[styles.planCard, selected && styles.planCardActive]}
              onPress={() => setGoalType(plan.id)}
            >
              <Text style={styles.planEmoji}>{plan.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.planLabel}>{plan.label}</Text>
                <Text style={styles.planTagline}>{plan.tagline} · {plan.proteinPct}P / {plan.carbsPct}C / {plan.fatPct}F</Text>
              </View>
              {t && <Text style={styles.planCals}>{t.calories}<Text style={styles.planCalsUnit}> kcal</Text></Text>}
            </Pressable>
          );
        })}

        {/* Custom plan */}
        <Pressable
          style={[styles.planCard, goalType === "custom" && styles.planCardActive]}
          onPress={() => setGoalType("custom")}
        >
          <Text style={styles.planEmoji}>🛠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.planLabel}>Custom</Text>
            <Text style={styles.planTagline}>Set your own calories and macro split</Text>
          </View>
        </Pressable>

        {goalType === "custom" && (
          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Daily calories</Text>
              <View style={styles.inlineInputs}>
                <TextInput
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  keyboardType="numeric"
                  placeholder={maintenance ? String(maintenance) : "2000"}
                  placeholderTextColor="#d1d5db"
                  style={styles.mediumInput}
                />
                <Text style={styles.unit}>kcal</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Macro split (%)</Text>
            <View style={styles.splitRow}>
              {([
                { label: "Protein", value: customP, set: setCustomP, color: "#f97316" },
                { label: "Carbs",   value: customC, set: setCustomC, color: "#f59e0b" },
                { label: "Fat",     value: customF, set: setCustomF, color: "#3b82f6" },
              ]).map(({ label, value, set, color }) => (
                <View key={label} style={{ flex: 1 }}>
                  <Text style={[styles.splitLabel, { color }]}>{label}</Text>
                  <TextInput value={value} onChangeText={set} keyboardType="numeric" style={styles.splitInput} />
                </View>
              ))}
            </View>
            <Text style={[styles.splitTotal, customTotalPct !== 100 && styles.splitTotalBad]}>
              Total: {customTotalPct}%{customTotalPct !== 100 ? " — must add up to 100%" : " ✓"}
            </Text>
          </View>
        )}

        {/* Result preview */}
        {targets && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCalories}>{targets.calories} <Text style={styles.resultCaloriesUnit}>kcal / day</Text></Text>
            <View style={styles.resultMacros}>
              <View style={styles.resultMacroItem}>
                <Text style={[styles.resultMacroValue, { color: "#f97316" }]}>{targets.proteinG}g</Text>
                <Text style={styles.resultMacroLabel}>Protein</Text>
              </View>
              <View style={styles.resultMacroItem}>
                <Text style={[styles.resultMacroValue, { color: "#f59e0b" }]}>{targets.carbsG}g</Text>
                <Text style={styles.resultMacroLabel}>Carbs</Text>
              </View>
              <View style={styles.resultMacroItem}>
                <Text style={[styles.resultMacroValue, { color: "#3b82f6" }]}>{targets.fatG}g</Text>
                <Text style={styles.resultMacroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        <Pressable style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} onPress={handleSave} disabled={!canSave}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Save plan</Text>}
        </Pressable>

        {!maintenance && (
          <Text style={styles.hint}>Enter your stats (or a maintenance number) to see targets.</Text>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  cancelLink: { fontSize: 14, fontWeight: "600", color: "#9ca3af", width: 50 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", paddingHorizontal: 16 },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  divider: { height: 1, backgroundColor: "#f3f4f6" },
  inlineInputs: { flexDirection: "row", alignItems: "center", gap: 6 },
  smallInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 15, minWidth: 52, textAlign: "center", color: "#111827",
  },
  mediumInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    fontSize: 15, minWidth: 80, textAlign: "center", color: "#111827",
  },
  unit: { fontSize: 12, color: "#9ca3af" },
  segment: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 10, padding: 2 },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  segmentItemActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  segmentTextActive: { color: ORANGE },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  activityLabel: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  activityDesc: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: ORANGE },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  maintenanceCard: {
    flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12,
    backgroundColor: "#fff7ed", borderRadius: 16, borderWidth: 1, borderColor: "#fed7aa", padding: 16,
  },
  maintenanceLabel: { fontSize: 14, fontWeight: "700", color: "#9a3412" },
  maintenanceSub: { fontSize: 12, color: "#c2683a", marginTop: 2 },
  maintenanceInput: {
    borderWidth: 1, borderColor: "#fed7aa", backgroundColor: "#fff", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: "700", minWidth: 84, textAlign: "center", color: "#9a3412",
  },
  planCard: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff",
    borderRadius: 16, borderWidth: 1.5, borderColor: "#f0f0f0", padding: 16, marginBottom: 8,
  },
  planCardActive: { borderColor: ORANGE, backgroundColor: "#fff7ed" },
  planEmoji: { fontSize: 24 },
  planLabel: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  planTagline: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  planCals: { fontSize: 16, fontWeight: "800", color: "#111827" },
  planCalsUnit: { fontSize: 11, fontWeight: "400", color: "#9ca3af" },
  splitRow: { flexDirection: "row", gap: 10, paddingBottom: 8 },
  splitLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  splitInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8,
    fontSize: 15, textAlign: "center", color: "#111827",
  },
  splitTotal: { fontSize: 12, fontWeight: "600", color: "#16a34a", paddingBottom: 14 },
  splitTotalBad: { color: "#dc2626" },
  resultCard: {
    marginTop: 12, backgroundColor: "#111827", borderRadius: 20, padding: 20, alignItems: "center",
  },
  resultCalories: { fontSize: 30, fontWeight: "800", color: "#fff" },
  resultCaloriesUnit: { fontSize: 14, fontWeight: "400", color: "#9ca3af" },
  resultMacros: { flexDirection: "row", gap: 28, marginTop: 14 },
  resultMacroItem: { alignItems: "center" },
  resultMacroValue: { fontSize: 18, fontWeight: "800" },
  resultMacroLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  saveButton: {
    marginTop: 16, backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 15, alignItems: "center",
  },
  saveButtonDisabled: { backgroundColor: "#fdba74" },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  hint: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 10 },
});
