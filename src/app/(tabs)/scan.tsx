import { Redirect } from "expo-router";

// The scan tab's press is intercepted in the tab bar (it opens the camera
// directly instead of navigating here) — this only renders as a fallback.
export default function ScanFallback() {
  return <Redirect href="/" />;
}
