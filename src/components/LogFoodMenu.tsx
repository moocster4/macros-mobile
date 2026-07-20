import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import FoodSearchLogger from "./FoodSearchLogger";
import ManualLogger from "./ManualLogger";

const ORANGE = "#f97316";

type Mode = null | "search" | "manual";

export default function LogFoodMenu({ onLogged }: { onLogged: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);

  // Close the action sheet first, then open the chosen flow on the next tick so
  // iOS isn't asked to present one modal while another is still dismissing.
  function choose(next: Exclude<Mode, null>) {
    setMenuOpen(false);
    setTimeout(() => setMode(next), 250);
  }

  function openBarcode() {
    setMenuOpen(false);
    setTimeout(() => router.push("/scan-barcode"), 250);
  }

  return (
    <>
      <Pressable style={styles.addButton} onPress={() => setMenuOpen(true)}>
        <Text style={styles.addButtonText}>＋ Log food</Text>
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Pressable style={styles.row} onPress={openBarcode}>
              <Text style={styles.rowEmoji}>📷</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Scan barcode</Text>
                <Text style={styles.rowSub}>Point at a packaged food&apos;s barcode</Text>
              </View>
            </Pressable>
            <Pressable style={styles.row} onPress={() => choose("search")}>
              <Text style={styles.rowEmoji}>🔍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Search a food</Text>
                <Text style={styles.rowSub}>Find it in the database or your recents</Text>
              </View>
            </Pressable>
            <Pressable style={styles.row} onPress={() => choose("manual")}>
              <Text style={styles.rowEmoji}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Enter manually</Text>
                <Text style={styles.rowSub}>Type in calories and macros yourself</Text>
              </View>
            </Pressable>
            <Pressable style={styles.cancel} onPress={() => setMenuOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <FoodSearchLogger onLogged={onLogged} hideTrigger open={mode === "search"} onClose={() => setMode(null)} />
      <ManualLogger onLogged={onLogged} hideTrigger open={mode === "manual"} onClose={() => setMode(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: ORANGE,
    borderRadius: 16, paddingVertical: 13, alignItems: "center",
  },
  addButtonText: { color: ORANGE, fontWeight: "800", fontSize: 15 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,24,39,0.4)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", marginBottom: 12 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#f9fafb", marginBottom: 8,
  },
  rowEmoji: { fontSize: 22 },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  rowSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  cancel: { paddingVertical: 13, alignItems: "center", marginTop: 4 },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#9ca3af" },
});
