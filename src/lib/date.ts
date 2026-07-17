/** YYYY-MM-DD in the device's local time zone (never UTC — avoids day-boundary bugs). */
export function toDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

export function todayStr(): string {
  return toDateStr(new Date());
}
