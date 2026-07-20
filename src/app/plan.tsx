import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import PlanForm from "@/components/PlanForm";

export default function PlanScreen() {
  const router = useRouter();

  // Safe dismiss: pop back if there's history, otherwise land on Today.
  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
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
      <PlanForm onSaved={dismiss} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  cancelLink: { fontSize: 14, fontWeight: "600", color: "#9ca3af", width: 50 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
});
