import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

const ORANGE = "#f97316";

interface BarcodeProduct {
  code: string;
  name: string;
  brand?: string;
  servingDescription: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

type Status = "scanning" | "loading" | "review" | "notfound";

export default function ScanBarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>("scanning");
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [name, setName] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function handleScanned({ data }: { data: string }) {
    if (status !== "scanning") return;
    setStatus("loading");
    setLastCode(data);
    try {
      const { product: p } = await api<{ product: BarcodeProduct | null }>(
        `/api/foods/barcode?code=${encodeURIComponent(data)}`
      );
      if (!p) {
        setStatus("notfound");
        return;
      }
      setProduct(p);
      setName(p.name);
      setMultiplier("1");
      setStatus("review");
    } catch {
      setStatus("notfound");
    }
  }

  function rescan() {
    setProduct(null);
    setLastCode(null);
    setStatus("scanning");
  }

  async function handleLog() {
    if (!product || !name.trim()) return;
    const m = Number(multiplier) || 1;
    setLogging(true);
    try {
      await api("/api/user/meal-log", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          calories: Math.round(product.calories * m),
          proteinG: Math.round(product.proteinG * m * 10) / 10,
          carbsG:   Math.round(product.carbsG   * m * 10) / 10,
          fatG:     Math.round(product.fatG     * m * 10) / 10,
        }),
      });
      dismiss();
    } catch {
      setLogging(false);
    }
  }

  const m = Number(multiplier) || 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={dismiss}>
          <Text style={styles.cancelLink}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Scan barcode</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Camera / scanning */}
      {(status === "scanning" || status === "loading") && (
        <View style={styles.cameraWrap}>
          {!permission ? (
            <View style={styles.center}><ActivityIndicator color={ORANGE} /></View>
          ) : !permission.granted ? (
            <View style={styles.center}>
              <Text style={styles.permText}>Camera access is needed to scan barcodes.</Text>
              <Pressable style={styles.primaryButton} onPress={requestPermission}>
                <Text style={styles.primaryButtonText}>Allow camera</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
                onBarcodeScanned={status === "scanning" ? handleScanned : undefined}
              />
              <View style={styles.overlay}>
                <View style={styles.frame} />
                <Text style={styles.hint}>
                  {status === "loading" ? "Looking up product…" : "Point at the barcode"}
                </Text>
                {status === "loading" && <ActivityIndicator color="#fff" style={{ marginTop: 10 }} />}
              </View>
            </>
          )}
        </View>
      )}

      {/* Not found */}
      {status === "notfound" && (
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
          <Text style={styles.notFoundTitle}>No match found</Text>
          <Text style={styles.notFoundSub}>
            {lastCode ? `Barcode ${lastCode} isn't in the database yet.` : "Couldn't read that barcode."}
          </Text>
          <Pressable style={styles.primaryButton} onPress={rescan}>
            <Text style={styles.primaryButtonText}>Scan again</Text>
          </Pressable>
          <Pressable onPress={dismiss} style={{ marginTop: 12 }}>
            <Text style={styles.secondaryLink}>Enter it manually instead</Text>
          </Pressable>
        </View>
      )}

      {/* Review */}
      {status === "review" && product && (
        <View style={styles.reviewWrap}>
          <View style={styles.reviewCard}>
            <TextInput value={name} onChangeText={setName} style={styles.reviewName} />
            {!!product.brand && <Text style={styles.reviewBrand}>{product.brand}</Text>}
            <Text style={styles.reviewServing}>{product.servingDescription}</Text>

            <View style={styles.servingsRow}>
              <Text style={styles.servingsLabel}>Servings</Text>
              <TextInput value={multiplier} onChangeText={setMultiplier} keyboardType="numeric" style={styles.servingsInput} />
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroCol}>
                <Text style={styles.macroValue}>{Math.round(product.calories * m)}</Text>
                <Text style={styles.macroLabel}>Cal</Text>
              </View>
              <View style={styles.macroCol}>
                <Text style={[styles.macroValue, { color: "#f97316" }]}>{Math.round(product.proteinG * m * 10) / 10}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroCol}>
                <Text style={[styles.macroValue, { color: "#f59e0b" }]}>{Math.round(product.carbsG * m * 10) / 10}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroCol}>
                <Text style={[styles.macroValue, { color: "#3b82f6" }]}>{Math.round(product.fatG * m * 10) / 10}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
              <Pressable style={styles.rescanButton} onPress={rescan} disabled={logging}>
                <Text style={styles.rescanButtonText}>Rescan</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={handleLog} disabled={logging}>
                {logging ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Log it</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#000" },
  cancelLink: { fontSize: 14, fontWeight: "600", color: "#fff", width: 50 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cameraWrap: { flex: 1, position: "relative" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F7F7F7" },
  permText: { fontSize: 14, color: "#4b5563", textAlign: "center", marginBottom: 16 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  frame: { width: 260, height: 160, borderWidth: 3, borderColor: "rgba(255,255,255,0.9)", borderRadius: 16, backgroundColor: "transparent" },
  hint: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 20, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 },
  notFoundTitle: { fontSize: 17, fontWeight: "800", color: "#1f2937" },
  notFoundSub: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 6, marginBottom: 18 },
  primaryButton: { marginTop: 16, backgroundColor: ORANGE, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondaryLink: { color: "#9ca3af", fontWeight: "600", fontSize: 13 },
  reviewWrap: { flex: 1, backgroundColor: "#F7F7F7", padding: 16 },
  reviewCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#f0f0f0" },
  reviewName: { fontSize: 18, fontWeight: "800", color: "#111827", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 6 },
  reviewBrand: { fontSize: 12, color: "#9ca3af", marginTop: 6 },
  reviewServing: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  servingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  servingsLabel: { fontSize: 13, fontWeight: "600", color: "#4b5563" },
  servingsInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, width: 80, textAlign: "center", color: "#111827" },
  macroRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  macroCol: { alignItems: "center" },
  macroValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  macroLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  rescanButton: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  rescanButtonText: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
});
