import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

const ORANGE = "#f97316";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const { user, loading, login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={ORANGE} />
      </SafeAreaView>
    );
  }

  if (user) {
    return <Redirect href="/" />;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signin") {
        await login(email.trim(), password);
      } else {
        await signup(name.trim(), email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.logo}>Macros</Text>
          <Text style={styles.subtitle}>Find food that fits your goals</Text>

          <View style={styles.card}>
            <View style={styles.tabRow}>
              <Pressable style={styles.tab} onPress={() => switchMode("signin")}>
                <Text style={[styles.tabText, mode === "signin" && styles.tabTextActive]}>Sign in</Text>
                {mode === "signin" && <View style={styles.tabUnderline} />}
              </Pressable>
              <Pressable style={styles.tab} onPress={() => switchMode("signup")}>
                <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>Create account</Text>
                {mode === "signup" && <View style={styles.tabUnderline} />}
              </Pressable>
            </View>

            {mode === "signup" && (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  style={styles.input}
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.input}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                (pressed || submitting) && { opacity: 0.85 },
              ]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F7" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logo: { fontSize: 34, fontWeight: "800", color: ORANGE, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 6, marginBottom: 28 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginBottom: 8 },
  tab: { flex: 1, alignItems: "center", paddingBottom: 10 },
  tabText: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: ORANGE },
  tabUnderline: { position: "absolute", bottom: -1, height: 2, width: "70%", backgroundColor: ORANGE, borderRadius: 1 },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  error: { color: "#ef4444", fontSize: 13, marginTop: 12 },
  button: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
