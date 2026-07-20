export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: { key: MealType; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch",     label: "Lunch",     emoji: "🥗" },
  { key: "dinner",    label: "Dinner",    emoji: "🍽️" },
  { key: "snack",     label: "Snacks",    emoji: "🍎" },
];

export function mealTypeLabel(key: string | null | undefined): string {
  return MEAL_TYPES.find((m) => m.key === key)?.label ?? "Other";
}

/** Sensible default category based on the current time of day. */
export function currentMealType(date = new Date()): MealType {
  const h = date.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}
