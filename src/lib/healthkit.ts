import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  requestAuthorization,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";

const CONNECTED_KEY = "health_connected";
const isIOS = Platform.OS === "ios";

const READ_TYPES = [
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierStepCount",
] as const;

export function isHealthSupported(): boolean {
  return isIOS;
}

export async function isHealthConnected(): Promise<boolean> {
  if (!isIOS) return false;
  return (await SecureStore.getItemAsync(CONNECTED_KEY)) === "1";
}

export async function setHealthConnected(connected: boolean): Promise<void> {
  await SecureStore.setItemAsync(CONNECTED_KEY, connected ? "1" : "0");
}

/** Prompts for HealthKit read permission. Returns false if unavailable/denied. */
export async function initHealth(): Promise<boolean> {
  if (!isIOS) return false;
  try {
    return await requestAuthorization({ toRead: READ_TYPES });
  } catch {
    return false;
  }
}

/** Total active energy burned today, in kcal (0 if unavailable). */
export async function getTodayActiveEnergy(): Promise<number> {
  if (!isIOS) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  try {
    const res = await queryStatisticsForQuantity(
      "HKQuantityTypeIdentifierActiveEnergyBurned",
      ["cumulativeSum"],
      { filter: { date: { startDate: start, endDate: new Date() } }, unit: "kcal" },
    );
    return Math.round(res.sumQuantity?.quantity ?? 0);
  } catch {
    return 0;
  }
}
