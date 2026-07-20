import { Tabs, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

const ORANGE = "#f97316";

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

function ScanTabButton() {
  const router = useRouter();

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Enable camera access in Settings to scan food.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets?.[0]) return;
    router.push({ pathname: "/scan-review", params: { uri: result.assets[0].uri } });
  }

  return (
    <View style={styles.scanButtonWrap}>
      <Pressable style={styles.scanButton} onPress={openCamera}>
        <Text style={styles.scanButtonEmoji}>📷</Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#f0f0f0" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Today", tabBarIcon: () => <TabIcon emoji="📊" /> }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: "Workouts", tabBarIcon: () => <TabIcon emoji="🏋️" /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "",
          tabBarButton: () => <ScanTabButton />,
        }}
      />
      <Tabs.Screen
        name="find-food"
        options={{ title: "Find Food", tabBarIcon: () => <TabIcon emoji="🗺️" /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButtonWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: "#f97316",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  scanButtonEmoji: { fontSize: 22 },
});
