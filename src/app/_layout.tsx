import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="scan-review" options={{ presentation: "modal" }} />
        <Stack.Screen name="plan" options={{ presentation: "modal" }} />
        <Stack.Screen name="account" options={{ presentation: "modal" }} />
      </Stack>
    </AuthProvider>
  );
}
