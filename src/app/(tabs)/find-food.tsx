import { useEffect, useRef, useState } from "react";
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
import { AppleMaps } from "expo-maps";
import { api } from "@/lib/api";
import RestaurantDetail from "@/components/RestaurantDetail";

const ORANGE = "#f97316";
const DEFAULT_CENTER = { latitude: 39.8283, longitude: -98.5795 };

type ViewMode = "map" | "list";

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
  avgProteinG?: number;
}

export default function FindFoodScreen() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(12);
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [selected, setSelected] = useState<NearbyRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const mapRef = useRef<React.ComponentRef<typeof AppleMaps.View>>(null);

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
          setZoom(14);
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
        setZoom(13);
        mapRef.current?.setCameraPosition({ coordinates: c, zoom: 13 });
        fetchNearby(c.latitude, c.longitude);
      }
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
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

        <View style={styles.toggle}>
          <Pressable
            onPress={() => setViewMode("map")}
            style={[styles.toggleButton, viewMode === "map" && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, viewMode === "map" && styles.toggleTextActive]}>🗺️ Map</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("list")}
            style={[styles.toggleButton, viewMode === "list" && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>☰ List</Text>
          </Pressable>
        </View>
      </View>

      {viewMode === "map" ? (
        <View style={styles.mapWrap}>
          <AppleMaps.View
            ref={mapRef}
            style={{ flex: 1 }}
            cameraPosition={{ coordinates: center, zoom }}
            markers={restaurants.map((r) => ({
              id: r.mapboxId,
              coordinates: { latitude: r.latitude, longitude: r.longitude },
              title: r.name,
            }))}
            properties={{ isMyLocationEnabled: true }}
            onMarkerClick={(marker) => {
              const match = restaurants.find((r) => r.mapboxId === marker.id);
              if (match) setSelected(match);
            }}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={ORANGE} />
            </View>
          )}
          {!loading && (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{restaurants.length} nearby</Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(r) => r.mapboxId}
          style={styles.list}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          refreshing={loading}
          onRefresh={() => fetchNearby(center.latitude, center.longitude)}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No restaurants found nearby</Text> : null}
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
  topBar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginTop: 8 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb",
  },
  searchInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827" },
  searchButton: { paddingHorizontal: 14 },
  toggle: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#e5e7eb", padding: 3, gap: 2,
  },
  toggleButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  toggleButtonActive: { backgroundColor: "#fff7ed" },
  toggleText: { fontSize: 12, fontWeight: "600", color: "#9ca3af" },
  toggleTextActive: { color: ORANGE },
  mapWrap: { flex: 1, marginTop: 8 },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.4)" },
  countPill: {
    position: "absolute", top: 10, alignSelf: "center",
    backgroundColor: "rgba(31,41,55,0.85)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  countPillText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  list: { flex: 1, marginTop: 8 },
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
