import { toDateStr } from "./date";

export type RangeKey = "7D" | "30D" | "90D" | "6M" | "1Y" | "MAX";

export const RANGE_OPTIONS: RangeKey[] = ["7D", "30D", "90D", "6M", "1Y", "MAX"];

type Granularity = "day" | "week" | "month";

const RANGE_DAYS: Record<RangeKey, number> = {
  "7D": 7, "30D": 30, "90D": 90, "6M": 183, "1Y": 365, MAX: 3650,
};

const RANGE_GRANULARITY: Record<RangeKey, Granularity> = {
  "7D": "day", "30D": "day", "90D": "week", "6M": "week", "1Y": "month", MAX: "month",
};

/** Fetch-window size in days to request from the backend for a given range. */
export function daysForRange(range: RangeKey): number {
  return RANGE_DAYS[range];
}

export interface MacroRaw {
  date: string; // YYYY-MM-DD
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MacroBucket extends MacroRaw {
  label: string;
}

function weekLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthLabel(monthKey: string): string {
  return new Date(monthKey + "-01T12:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
function dayLabel(dateStr: string): string {
  return WEEKDAY[new Date(dateStr + "T12:00:00").getDay()];
}

/**
 * Buckets daily macro totals into range-appropriate points (day/week/month
 * granularity). Missing days are treated as zero. For MAX, the window is
 * clamped to the earliest real data point so the chart doesn't pad out to
 * a decade of empty history.
 */
export function aggregateMacrosByRange(dailyRaw: MacroRaw[], range: RangeKey): MacroBucket[] {
  const granularity = RANGE_GRANULARITY[range];
  const byDate = new Map(dailyRaw.map((p) => [p.date, p]));

  let windowDays = RANGE_DAYS[range];
  if (range === "MAX" && dailyRaw.length > 0) {
    const earliest = dailyRaw.reduce((min, p) => (p.date < min ? p.date : min), dailyRaw[0].date);
    const earliestDt = new Date(earliest + "T12:00:00");
    const diffDays = Math.ceil((Date.now() - earliestDt.getTime()) / 86_400_000) + 1;
    windowDays = Math.max(1, Math.min(RANGE_DAYS.MAX, diffDays));
  } else if (range === "MAX") {
    windowDays = 30;
  }

  const allDays: MacroRaw[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const d = toDateStr(dt);
    const existing = byDate.get(d);
    allDays.push(existing ?? { date: d, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  }

  if (granularity === "day") {
    return allDays.map((d) => ({ ...d, label: dayLabel(d.date) }));
  }

  function avgBucket(chunk: MacroRaw[], date: string, label: string): MacroBucket {
    const n = chunk.length;
    return {
      date,
      label,
      calories: chunk.reduce((s, d) => s + d.calories, 0) / n,
      proteinG: chunk.reduce((s, d) => s + d.proteinG, 0) / n,
      carbsG:   chunk.reduce((s, d) => s + d.carbsG,   0) / n,
      fatG:     chunk.reduce((s, d) => s + d.fatG,     0) / n,
    };
  }

  if (granularity === "week") {
    const buckets: MacroBucket[] = [];
    for (let start = 0; start < allDays.length; start += 7) {
      const chunk = allDays.slice(start, start + 7);
      buckets.push(avgBucket(chunk, chunk[0].date, weekLabel(chunk[0].date)));
    }
    return buckets;
  }

  // month granularity
  const monthMap = new Map<string, MacroRaw[]>();
  for (const d of allDays) {
    const key = d.date.slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(d);
  }
  return [...monthMap.entries()].map(([key, chunk]) => avgBucket(chunk, key + "-01", monthLabel(key)));
}

export interface WeightRaw {
  id: string;
  date: string;
  weightLbs: number;
}

interface WeightDay {
  date: string;
  weightLbs: number;
  id: string | null; // set only when this day has a real logged entry
}

export interface WeightBucket {
  date: string;
  label: string;
  weightLbs: number;
  /** Present only for single-day buckets that correspond to a real logged entry (editable/deletable). */
  id: string | null;
}

/** Same bucketing strategy as aggregateMacrosByRange, but for a single weight value with forward-fill for gaps. */
export function aggregateWeightByRange(rawPoints: WeightRaw[], range: RangeKey): WeightBucket[] {
  if (rawPoints.length === 0) return [];
  const granularity = RANGE_GRANULARITY[range];
  const sorted = [...rawPoints].sort((a, b) => a.date.localeCompare(b.date));

  let windowDays = RANGE_DAYS[range];
  if (range === "MAX") {
    const earliestDt = new Date(sorted[0].date + "T12:00:00");
    const diffDays = Math.ceil((Date.now() - earliestDt.getTime()) / 86_400_000) + 1;
    windowDays = Math.max(1, Math.min(RANGE_DAYS.MAX, diffDays));
  }

  const byDate = new Map(sorted.map((p) => [p.date, p]));
  const allDays: WeightDay[] = [];
  let lastKnown: number | null = null;
  for (let i = windowDays - 1; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const d = toDateStr(dt);
    const real = byDate.get(d);
    if (real) lastKnown = real.weightLbs;
    if (lastKnown != null) allDays.push({ date: d, weightLbs: lastKnown, id: real?.id ?? null });
  }
  if (allDays.length === 0) return [];

  if (granularity === "day") {
    return allDays.map((d) => ({ date: d.date, label: dayLabel(d.date), weightLbs: d.weightLbs, id: d.id }));
  }

  function avgBucket(chunk: WeightDay[], date: string, label: string): WeightBucket {
    return { date, label, weightLbs: chunk.reduce((s, d) => s + d.weightLbs, 0) / chunk.length, id: null };
  }

  if (granularity === "week") {
    const buckets: WeightBucket[] = [];
    for (let start = 0; start < allDays.length; start += 7) {
      const chunk = allDays.slice(start, start + 7);
      buckets.push(avgBucket(chunk, chunk[0].date, weekLabel(chunk[0].date)));
    }
    return buckets;
  }

  const monthMap = new Map<string, WeightDay[]>();
  for (const d of allDays) {
    const key = d.date.slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(d);
  }
  return [...monthMap.entries()].map(([key, chunk]) => avgBucket(chunk, key + "-01", monthLabel(key)));
}
