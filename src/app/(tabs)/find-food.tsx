import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { api } from "@/lib/api";
import RestaurantDetail from "@/components/RestaurantDetail";

// TEMPORARY: map view disabled until Xcode is updated to support expo-maps'
// Swift 6.2 toolchain requirement. List-only fallback so the rest of the app
// keeps working in plain Expo Go. See find-food.tsx.full-backup for the map version.

const ORANGE = "#f97316";
const DEFAULT_CENTER = { latitude: 39.8283, longitude: -98.5795 };

interface NearbyRestaurant {
  mapboxId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisine?: string;
  hasMenu: boolean;
  menuCategory?: string;
  menuCategoryEmoji?: string;
}

export default function FindFoodScreen() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [selected, setSelected] = useState<NearbyRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  async function fetchNearby(lat: number, lng: number) {
    setLoading(true);
    try {
      const data = await api<NearbyRestaurant[]>(`/api/restaurants/nearby?lat=${lat}&lng=${lng}`);
      setRestaurants(data);
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        try {
          const pos = await Location.getCurrentPositionAsync({});
          const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCenter(c);
          fetchNearby(c.latitude, c.longitude);
          return;
        } catch { /* fall through to default */ }
      }
      fetchNearby(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude);
    })();
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(query.trim());
      if (results[0]) {
        const c = { latitude: results[0].latitude, longitude: results[0].longitude };
        setCenter(c);
        fetchNearby(c.latitude, c.longitude);
      }
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.logo}>Find Food</Text>
        <Text style={styles.mapComingSoon}>Map view coming soon</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="Search a city..."
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searching
          ? <ActivityIndicator size="small" color={ORANGE} style={{ marginRight: 12 }} />
          : (
            <Pressable onPress={handleSearch} style={styles.searchButton}>
              <Text style={{ color: ORANGE, fontWeight: "700", fontSize: 13 }}>Go</Text>
            </Pressable>
          )}
      </View>

      {loading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(r) => r.mapboxId}
          style={styles.list}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No restaurants found nearby</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setSelected(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.cuisine ?? item.address}</Text>
              </View>
              {item.hasMenu && item.menuCategory && (
                <View style={styles.categoryBadge}>
                  <Text style={{ fontSize: 11 }}>{item.menuCategoryEmoji} {item.menuCategory}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelected(null)} />
          {selected && (
            <RestaurantDetail
              restaurant={selected}
              onClose={() => setSelected(null)}
              onMenuScanned={() => fetchNearby(center.latitude, center.longitude)}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  logo: { fontSize: 20, fontWeight: "800", color: "#1f2937" },
  mapComingSoon: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: 12, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb",
  },
  searchInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827" },
  searchButton: { paddingHorizontal: 14 },
  list: { flex: 1 },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 24, fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#f0f0f0",
  },
  cardName: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  cardSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  categoryBadge: { backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" },
});
