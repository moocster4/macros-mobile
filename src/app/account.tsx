import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuth } from "@/lib/auth";
import { useUnits } from "@/lib/units";
import { api } from "@/lib/api";
import { getPlan } from "@/lib/plans";
import { initHealth, isHealthConnected, isHealthSupported, setHealthConnected } from "@/lib/healthkit";

const ORANGE = "#f97316";

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unitSystem, setUnitSystem } = useUnits();
  const [planLabel, setPlanLabel] = useState<string | null>(null);
  const [healthConnected, setHealthConnectedState] = useState(false);

  useEffect(() => {
    api<{ profile: { goalType: string | null } | null }>("/api/user/diet-profile")
      .then(({ profile }) => {
        const plan = getPlan(profile?.goalType);
        setPlanLabel(plan ? `${plan.emoji} ${plan.label}` : "Not set");
      })
      .catch(() => setPlanLabel(null));
    isHealthConnected().then(setHealthConnectedState);
  }, []);

  async function toggleHealth() {
    if (healthConnected) {
      await setHealthConnected(false);
      setHealthConnectedState(false);
      return;
    }
    const ok = await initHealth();
    if (ok) {
      await setHealthConnected(true);
      setHealthConnectedState(true);
    } else {
      Alert.alert("Apple Health", "Enable access in Settings › Health › Data Access & Devices › Macros.");
    }
  }

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          if (router.canGoBack()) router.back();
          else router.replace("/login");
        },
      },
    ]);
  }

  const initial = (user?.name?.trim()?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Pressable onPress={dismiss}>
          <Text style={styles.doneLink}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {!!user?.name && <Text style={styles.profileName}>{user.name}</Text>}
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Plan */}
        <Text style={styles.sectionLabel}>Nutrition</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => router.push("/plan")}>
            <Text style={styles.rowLabel}>Your plan</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{planLabel ?? "—"}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Units</Text>
            <View style={styles.segment}>
              {([
                { value: "imperial" as const, label: "lbs / ft" },
                { value: "metric" as const,   label: "kg / cm" },
              ]).map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setUnitSystem(opt.value)}
                  style={[styles.segmentItem, unitSystem === opt.value && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, unitSystem === opt.value && styles.segmentTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {isHealthSupported() && (
            <>
              <View style={styles.rowDivider} />
              <Pressable style={styles.row} onPress={toggleHealth}>
                <Text style={styles.rowLabel}>❤️ Apple Health</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, healthConnected && { color: "#16a34a" }]}>
                    {healthConnected ? "Connected" : "Connect"}
                  </Text>
                  {!healthConnected && <Text style={styles.chevron}>›</Text>}
                </View>
              </Pressable>
            </>
          )}
        </View>

        {/* Sign out */}
        <View style={[styles.card, { marginTop: 24 }]}>
          <Pressable style={styles.row} onPress={confirmSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Macros v{version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1f2937" },
  doneLink: { fontSize: 15, fontWeight: "700", color: ORANGE },
  scrollContent: { padding: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff",
    borderRadius: 20, borderWidth: 1, borderColor: "#f0f0f0", padding: 18,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  profileName: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  profileEmail: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 24 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f0f0f0", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 15 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14, color: "#9ca3af" },
  chevron: { fontSize: 20, color: "#d1d5db", fontWeight: "500" },
  rowDivider: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16 },
  segment: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 10, padding: 2 },
  segmentItem: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  segmentItemActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  segmentTextActive: { color: ORANGE },
  signOutText: { fontSize: 15, fontWeight: "700", color: "#dc2626" },
  version: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 24 },
});
