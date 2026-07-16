import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, ApiError } from "@/lib/api";

const ORANGE = "#f97316";

interface NearbyRestaurant {
  mapboxId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  hasMenu: boolean;
}

interface MacroEstimate { calories: number; proteinG: number; carbsG: number; fatG: number; }
interface DishEstimate { id: string; name: string; description?: string; courseCategory?: string; macros: MacroEstimate; }
interface RestaurantMacroProfile {
  category: string;
  categoryEmoji: string;
  average: MacroEstimate | null;
  dishes: DishEstimate[];
  source: "db" | "heuristic";
}

export default function RestaurantDetail({
  restaurant, onClose, onMenuScanned,
}: { restaurant: NearbyRestaurant; onClose: () => void; onMenuScanned: () => void }) {
  const [profile, setProfile] = useState<RestaurantMacroProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api<RestaurantMacroProfile>(
      `/api/restaurants/macros?name=${encodeURIComponent(restaurant.name)}&mapboxId=${encodeURIComponent(restaurant.mapboxId)}`
    )
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [restaurant.mapboxId, restaurant.name]);

  const hasRealData = profile?.source === "db" && profile.dishes.length > 0;

  async function handleScan() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setScanError("Camera permission needed to scan a menu");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;

    setScanning(true);
    setScanError(null);
    try {
      const body = new FormData();
      body.append("file", { uri: result.assets[0].uri, name: "menu.jpg", type: "image/jpeg" } as unknown as Blob);
      body.append("mapboxId", restaurant.mapboxId);
      body.append("name", restaurant.name);
      body.append("address", restaurant.address);
      body.append("latitude", String(restaurant.latitude));
      body.append("longitude", String(restaurant.longitude));

      const updated = await api<RestaurantMacroProfile & { dishes: DishEstimate[] }>("/api/restaurants/menu", {
        method: "POST",
        body,
      });
      setProfile({ ...updated, source: "db" } as RestaurantMacroProfile);
      onMenuScanned();
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : "Couldn't read that menu — try a clearer photo");
    } finally {
      setScanning(false);
    }
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={{ fontSize: 16, color: "#9ca3af" }}>✕</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={ORANGE} style={{ marginVertical: 24 }} />
      ) : hasRealData ? (
        <ScrollView style={{ maxHeight: 260 }}>
          {profile!.average && (
            <View style={styles.avgRow}>
              <Text style={styles.avgText}>{Math.round(profile!.average.calories)} kcal avg</Text>
              <Text style={[styles.avgText, { color: "#f97316" }]}>{Math.round(profile!.average.proteinG)}g P</Text>
              <Text style={[styles.avgText, { color: "#f59e0b" }]}>{Math.round(profile!.average.carbsG)}g C</Text>
              <Text style={[styles.avgText, { color: "#3b82f6" }]}>{Math.round(profile!.average.fatG)}g F</Text>
            </View>
          )}
          {profile!.dishes.map((d) => (
            <View key={d.id} style={styles.dishRow}>
              <Text style={styles.dishName} numberOfLines={1}>{d.name}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                <Text style={styles.dishMacro}>{Math.round(d.macros.calories)} kcal</Text>
                <Text style={[styles.dishMacro, { color: "#f97316" }]}>{Math.round(d.macros.proteinG)}g P</Text>
                <Text style={[styles.dishMacro, { color: "#f59e0b" }]}>{Math.round(d.macros.carbsG)}g C</Text>
                <Text style={[styles.dishMacro, { color: "#3b82f6" }]}>{Math.round(d.macros.fatG)}g F</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 28, marginBottom: 6 }}>🍽️</Text>
          <Text style={styles.emptyTitle}>No menu data yet</Text>
          <Text style={styles.emptySub}>Scan the menu to get AI-estimated macros for every dish</Text>

          {scanError && <Text style={styles.scanError}>{scanError}</Text>}

          <Pressable style={styles.scanButton} onPress={handleScan} disabled={scanning}>
            {scanning
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.scanButtonText}>📷 Scan menu</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  name: { fontSize: 17, fontWeight: "800", color: "#111827" },
  address: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  closeButton: { padding: 4, marginLeft: 8 },
  avgRow: { flexDirection: "row", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", marginBottom: 4 },
  avgText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  dishRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  dishName: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  dishMacro: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  emptyState: { alignItems: "center", paddingVertical: 16 },
  emptyTitle: { fontWeight: "700", fontSize: 14, color: "#1f2937" },
  emptySub: { fontSize: 12, color: "#9ca3af", marginTop: 4, textAlign: "center", paddingHorizontal: 20 },
  scanError: { color: "#ef4444", fontSize: 12, marginTop: 10, textAlign: "center" },
  scanButton: {
    backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24,
    marginTop: 14, alignItems: "center", justifyContent: "center", minWidth: 160,
  },
  scanButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
