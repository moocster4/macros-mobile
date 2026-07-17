import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "@/lib/api";

const ORANGE = "#f97316";

interface FoodSearchResult {
  fdcId: number;
  name: string;
  brand?: string;
  servingDescription: string;
  servingGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface MealLogEntry {
  name: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
}

interface RecentFood {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export default function FoodSearchLogger({
  onLogged, open: openProp, onClose, hideTrigger,
}: {
  onLogged: () => void;
  /** When provided, the component is controlled by the parent. */
  open?: boolean;
  onClose?: () => void;
  hideTrigger?: boolean;
}) {
  const controlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? !!openProp : internalOpen;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [multiplier, setMultiplier] = useState("1");
  const [logging, setLogging] = useState(false);
  const [recent, setRecent] = useState<RecentFood[] | null>(null);
  const [loggingRecentName, setLoggingRecentName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api<{ logs: MealLogEntry[] }>("/api/user/meal-log/history")
      .then(({ logs }) => {
        const seen = new Set<string>();
        const deduped: RecentFood[] = [];
        for (const l of logs) {
          const key = l.name.trim().toLowerCase();
          if (seen.has(key) || l.calories == null) continue;
          seen.add(key);
          deduped.push({
            name: l.name,
            calories: l.calories,
            proteinG: l.proteinG ?? 0,
            carbsG:   l.carbsG   ?? 0,
            fatG:     l.fatG     ?? 0,
          });
          if (deduped.length >= 15) break;
        }
        setRecent(deduped);
      })
      .catch(() => setRecent([]));
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      api<{ results: FoodSearchResult[] }>(`/api/foods/search?q=${encodeURIComponent(q)}`)
        .then((data) => setResults(data.results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function close() {
    if (controlled) onClose?.();
    else setInternalOpen(false);
    setQuery("");
    setResults([]);
    setSelected(null);
    setMultiplier("1");
  }

  async function handleLog() {
    if (!selected) return;
    const m = Number(multiplier) || 1;
    setLogging(true);
    try {
      await api("/api/user/meal-log", {
        method: "POST",
        body: JSON.stringify({
          name:     selected.name,
          calories: Math.round(selected.calories * m),
          proteinG: Math.round(selected.proteinG * m * 10) / 10,
          carbsG:   Math.round(selected.carbsG   * m * 10) / 10,
          fatG:     Math.round(selected.fatG     * m * 10) / 10,
        }),
      });
      onLogged();
      close();
    } catch {
      /* silently fail, keep selection so they can retry */
    } finally {
      setLogging(false);
    }
  }

  async function handleLogRecent(item: RecentFood) {
    setLoggingRecentName(item.name);
    try {
      await api("/api/user/meal-log", {
        method: "POST",
        body: JSON.stringify(item),
      });
      onLogged();
      close();
    } catch {
      /* silently fail */
    } finally {
      setLoggingRecentName(null);
    }
  }

  const m = Number(multiplier) || 0;
  const showingSearch = query.trim().length >= 2;

  return (
    <>
      {!hideTrigger && (
        <Pressable style={styles.openButton} onPress={() => setInternalOpen(true)}>
          <Text style={styles.openButtonText}>🔍 Search foods</Text>
        </Pressable>
      )}

      <Modal visible={isOpen} animationType="slide" onRequestClose={close}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search foods, e.g. 'chicken breast'"
              placeholderTextColor="#9ca3af"
              autoFocus
              style={styles.searchInput}
            />
            <Pressable onPress={close}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </Pressable>
          </View>

          {selected ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewName}>{selected.name}</Text>
              {selected.brand && <Text style={styles.reviewBrand}>{selected.brand}</Text>}
              <Text style={styles.reviewServing}>{selected.servingDescription}</Text>

              <View style={styles.servingsRow}>
                <Text style={styles.servingsLabel}>Servings</Text>
                <TextInput
                  value={multiplier}
                  onChangeText={setMultiplier}
                  keyboardType="numeric"
                  style={styles.servingsInput}
                />
              </View>

              <View style={styles.macroRow}>
                <View style={styles.macroCol}>
                  <Text style={styles.macroValue}>{Math.round(selected.calories * m)}</Text>
                  <Text style={styles.macroLabel}>Cal</Text>
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroValue, { color: "#f97316" }]}>{Math.round(selected.proteinG * m * 10) / 10}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroValue, { color: "#f59e0b" }]}>{Math.round(selected.carbsG * m * 10) / 10}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroValue, { color: "#3b82f6" }]}>{Math.round(selected.fatG * m * 10) / 10}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                <Pressable style={styles.backButton} onPress={() => setSelected(null)} disabled={logging}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <Pressable style={[styles.logButton, { flex: 1 }]} onPress={handleLog} disabled={logging}>
                  {logging
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.logButtonText}>Log it</Text>}
                </Pressable>
              </View>
            </View>
          ) : showingSearch ? (
            <>
              {searching && <ActivityIndicator color={ORANGE} style={{ marginTop: 16 }} />}
              {!searching && results.length === 0 && (
                <Text style={styles.emptyText}>No foods found for &quot;{query}&quot;</Text>
              )}
              <FlatList
                data={results}
                keyExtractor={(r) => String(r.fdcId)}
                contentContainerStyle={{ padding: 12, gap: 6 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.resultCard}
                    onPress={() => { setSelected(item); setMultiplier("1"); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>
                        {item.brand ? `${item.brand} · ` : ""}{item.servingDescription}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.resultCal}>{item.calories} kcal</Text>
                      <Text style={styles.resultMacros}>
                        {item.proteinG}P {item.carbsG}C {item.fatG}F
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            </>
          ) : (
            <FlatList
              data={recent ?? []}
              keyExtractor={(r, i) => `${r.name}-${i}`}
              contentContainerStyle={{ padding: 12, gap: 6 }}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                recent === null ? (
                  <ActivityIndicator color={ORANGE} style={{ marginTop: 16 }} />
                ) : recent.length > 0 ? (
                  <Text style={styles.sectionLabel}>RECENT</Text>
                ) : (
                  <Text style={styles.emptyText}>Search for a food to get started</Text>
                )
              }
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultCard}
                  onPress={() => handleLogRecent(item)}
                  disabled={loggingRecentName === item.name}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.resultSub}>
                      {item.calories} kcal · {item.proteinG}P {item.carbsG}C {item.fatG}F
                    </Text>
                  </View>
                  {loggingRecentName === item.name
                    ? <ActivityIndicator color={ORANGE} size="small" />
                    : <Text style={styles.quickAdd}>+ Add</Text>}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 16, paddingVertical: 12, alignItems: "center",
  },
  openButtonText: { color: "#4b5563", fontWeight: "700", fontSize: 14 },
  modal: { flex: 1, backgroundColor: "#F7F7F7", paddingTop: 60 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: "#111827",
  },
  cancelLink: { color: "#9ca3af", fontWeight: "600", fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9ca3af", letterSpacing: 0.5, marginBottom: 4, marginTop: 4 },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 24, fontSize: 13 },
  resultCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#f0f0f0",
  },
  resultName: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  resultSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  resultCal: { fontSize: 13, fontWeight: "700", color: "#374151" },
  resultMacros: { fontSize: 10, color: "#9ca3af", marginTop: 2 },
  quickAdd: { fontSize: 12, fontWeight: "700", color: ORANGE },
  reviewCard: { margin: 16, backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#f0f0f0" },
  reviewName: { fontSize: 18, fontWeight: "800", color: "#111827" },
  reviewBrand: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  reviewServing: { fontSize: 12, color: "#9ca3af", marginTop: 6 },
  servingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  servingsLabel: { fontSize: 13, fontWeight: "600", color: "#4b5563" },
  servingsInput: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, width: 80, textAlign: "center",
  },
  macroRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  macroCol: { alignItems: "center" },
  macroValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  macroLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  backButton: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 16, alignItems: "center", justifyContent: "center",
  },
  backButtonText: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
  logButton: { backgroundColor: ORANGE, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  logButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
