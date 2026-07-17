import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "@/lib/auth";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignInButton({ onError }: { onError: (message: string) => void }) {
  const { loginWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) return;
    setSubmitting(true);
    loginWithGoogle(idToken)
      .catch((err) => onError(err instanceof Error ? err.message : "Google sign-in failed"))
      .finally(() => setSubmitting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <>
      <Pressable
        onPress={() => promptAsync()}
        disabled={!request || submitting}
        style={({ pressed }) => [
          styles.googleButton,
          (pressed || submitting) && { opacity: 0.85 },
        ]}
      >
        {submitting
          ? <ActivityIndicator color="#374151" />
          : (
            <>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
      </Pressable>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 13,
  },
  googleG: { fontSize: 16, fontWeight: "800", color: "#4285F4" },
  googleButtonText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#f0f0f0" },
  dividerText: { fontSize: 12, color: "#9ca3af" },
});
