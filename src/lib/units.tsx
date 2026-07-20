import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export type UnitSystem = "imperial" | "metric";

const KEY = "unit_system";
const LB_PER_KG = 2.20462;

interface UnitsContextValue {
  unitSystem: UnitSystem;
  metric: boolean;
  setUnitSystem: (u: UnitSystem) => void;
  weightUnit: string; // "lbs" | "kg"
  /** Convert a canonical kg value to the user's display unit. */
  kgToDisplay: (kg: number) => number;
  /** Convert a value entered in the user's display unit back to kg. */
  displayToKg: (v: number) => number;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setState] = useState<UnitSystem>("imperial");

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((v) => { if (v === "metric" || v === "imperial") setState(v); })
      .catch(() => {});
  }, []);

  function setUnitSystem(u: UnitSystem) {
    setState(u);
    SecureStore.setItemAsync(KEY, u).catch(() => {});
  }

  const metric = unitSystem === "metric";
  const value: UnitsContextValue = {
    unitSystem,
    metric,
    setUnitSystem,
    weightUnit: metric ? "kg" : "lbs",
    kgToDisplay: (kg) => (metric ? kg : kg * LB_PER_KG),
    displayToKg: (v) => (metric ? v : v / LB_PER_KG),
  };

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
