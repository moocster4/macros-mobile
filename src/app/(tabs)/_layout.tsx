import { Tabs } from "expo-router";
import { Text } from "react-native";

const ORANGE = "#f97316";

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
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
        name="find-food"
        options={{ title: "Find Food", tabBarIcon: () => <TabIcon emoji="🗺️" /> }}
      />
    </Tabs>
  );
}
