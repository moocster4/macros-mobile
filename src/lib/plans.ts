// Plan / goal definitions. A plan sets daily calories as a multiple of the
// user's maintenance (TDEE), then splits those calories into protein/carbs/fat
// by percentage. Presets live here; "custom" lets the user pick their own
// calories + split. This registry is also where future crowdsourced/community
// plans would slot in — each is just another set of {multiplier, P/C/F %}.

export type GoalType = "lose_fat" | "maintain" | "gain_muscle" | "bulk" | "custom";

export interface Plan {
  id: GoalType;
  label: string;
  emoji: string;
  tagline: string;
  /** Multiplier applied to maintenance calories. */
  calorieMultiplier: number;
  /** Macro split as a percentage of total calories (sums to 100). */
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export const PLANS: Plan[] = [
  { id: "lose_fat",    label: "Lose fat",    emoji: "🔥", tagline: "20% below maintenance", calorieMultiplier: 0.80, proteinPct: 40, carbsPct: 30, fatPct: 30 },
  { id: "maintain",    label: "Maintain",    emoji: "⚖️", tagline: "At maintenance",        calorieMultiplier: 1.00, proteinPct: 30, carbsPct: 40, fatPct: 30 },
  { id: "gain_muscle", label: "Gain muscle", emoji: "💪", tagline: "10% above maintenance", calorieMultiplier: 1.10, proteinPct: 35, carbsPct: 40, fatPct: 25 },
  { id: "bulk",        label: "Bulk",        emoji: "🍔", tagline: "20% above maintenance", calorieMultiplier: 1.20, proteinPct: 25, carbsPct: 50, fatPct: 25 },
];

/** Default split used to seed the custom-plan editor. */
export const CUSTOM_DEFAULT = { proteinPct: 30, carbsPct: 40, fatPct: 30 };

export function getPlan(id: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Grams from a calorie total and a P/C/F split. Protein & carbs = 4 kcal/g, fat = 9 kcal/g. */
export function macrosFromSplit(calories: number, proteinPct: number, carbsPct: number, fatPct: number): MacroTargets {
  return {
    calories: Math.round(calories),
    proteinG: Math.round((calories * (proteinPct / 100)) / 4),
    carbsG:   Math.round((calories * (carbsPct   / 100)) / 4),
    fatG:     Math.round((calories * (fatPct     / 100)) / 9),
  };
}

/** Preset plan targets derived from maintenance calories. */
export function targetsForPlan(plan: Plan, maintenance: number): MacroTargets {
  return macrosFromSplit(maintenance * plan.calorieMultiplier, plan.proteinPct, plan.carbsPct, plan.fatPct);
}

// ─── Maintenance (TDEE) estimation ───────────────────────────────────────────

export const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary",        desc: "Desk job, little exercise" },
  { value: "light",     label: "Lightly active",   desc: "Exercise 1–3×/week" },
  { value: "moderate",  label: "Moderate",         desc: "Exercise 3–5×/week" },
  { value: "very",      label: "Very active",      desc: "Hard exercise 6–7×/week" },
  { value: "extreme",   label: "Extremely active", desc: "Physical job + daily training" },
] as const;

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extreme: 1.9,
};

/** Mifflin-St Jeor BMR × activity multiplier. */
export function calcMaintenance(weightKg: number, heightCm: number, age: number, sex: string, activity: string): number {
  const bmr = sex === "female"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  return Math.round(bmr * (ACTIVITY_MULTIPLIER[activity] ?? 1.55));
}
