import { CaptureEntry, CaptureMetrics, MetricPoint } from "@/lib/types";
import { average } from "@/lib/utils";

const WINDOW_HOURS = 24;
const RECENT_LIMIT = 15;

export function withinRolling24h(isoDate: string): boolean {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp >= Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
}

export function aggregateMetrics(entries: CaptureEntry[]): CaptureMetrics {
  const sorted = [...entries].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const windowEntries = sorted.filter((entry) => withinRolling24h(entry.createdAt));

  const pointsByHour = new Map<string, MetricPoint>();

  for (const entry of windowEntries) {
    const hourSlot = new Date(entry.createdAt);
    hourSlot.setMinutes(0, 0, 0);
    const slot = hourSlot.toISOString();

    const current = pointsByHour.get(slot) ?? { slot, words: 0, chars: 0 };
    current.words += entry.wordCount;
    current.chars += entry.charCountNoSpaces;
    pointsByHour.set(slot, current);
  }

  const words24h = windowEntries.reduce((sum, entry) => sum + entry.wordCount, 0);
  const chars24h = windowEntries.reduce((sum, entry) => sum + entry.charCountNoSpaces, 0);

  return {
    words24h,
    chars24h,
    entries24h: windowEntries.length,
    totalCaptures: entries.length,
    avgWordsPerCapture: average(words24h, windowEntries.length),
    points: [...pointsByHour.values()],
    recentEntries: windowEntries.slice(-RECENT_LIMIT).reverse(),
  };
}
