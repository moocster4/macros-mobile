import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { toDateStr } from "@/lib/date";

const ORANGE = "#f97316";
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
const WINDOW_DAYS = 30;
const CELL_WIDTH = 44;

interface DateStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
}

export default function DateStrip({ selectedDate, onSelectDate, onOpenCalendar }: DateStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const todayStr = toDateStr(new Date());

  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (WINDOW_DAYS - 1 - i));
    return d;
  });

  useEffect(() => {
    const idx = days.findIndex((d) => toDateStr(d) === selectedDate);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: Math.max(0, idx * CELL_WIDTH - 140), animated: false });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.row}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}
      >
        {days.map((d) => {
          const dateStr = toDateStr(d);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(dateStr)}
              style={[styles.cell, isSelected && styles.cellSelected]}
            >
              <Text style={[styles.dow, isSelected && styles.dowSelected]}>{WEEKDAY[d.getDay()]}</Text>
              <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{d.getDate()}</Text>
              {isToday && !isSelected && <View style={styles.todayDot} />}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={onOpenCalendar} style={styles.calendarButton}>
        <Text style={{ fontSize: 18 }}>📅</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  scrollContent: { paddingHorizontal: 2, gap: 4 },
  cell: {
    width: CELL_WIDTH - 4, paddingVertical: 8, borderRadius: 14, alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#f0f0f0",
  },
  cellSelected: { backgroundColor: ORANGE, borderColor: ORANGE },
  dow: { fontSize: 10, fontWeight: "600", color: "#9ca3af" },
  dowSelected: { color: "#fed7aa" },
  dayNum: { fontSize: 15, fontWeight: "700", color: "#374151", marginTop: 2 },
  dayNumSelected: { color: "#fff" },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ORANGE, marginTop: 3 },
  calendarButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#f0f0f0", alignItems: "center", justifyContent: "center",
  },
});
