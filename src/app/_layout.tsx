import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { UnitsProvider } from "@/lib/units";

export default function RootLayout() {
  return (
    <AuthProvider>
      <UnitsProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="scan-review" options={{ presentation: "modal" }} />
          <Stack.Screen name="scan-barcode" options={{ presentation: "fullScreenModal" }} />
          <Stack.Screen name="plan" options={{ presentation: "modal" }} />
          <Stack.Screen name="account" options={{ presentation: "modal" }} />
        </Stack>
      </UnitsProvider>
    </AuthProvider>
  );
}
