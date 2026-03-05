import { CaptureEntry, CaptureMetrics, MetricPoint, TrendDayPoint } from "@/lib/types";
import { average, tokenizeNormalizedWords } from "@/lib/utils";

const WINDOW_HOURS = 24;
const TREND_DAYS = 30;
const RECENT_LIMIT = 15;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_GAP_LIMIT_MINUTES = 15;
const MIN_ACTIVE_MINUTES_PER_ENTRY = 1;

export function withinRolling24h(isoDate: string): boolean {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp >= Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
}

function dayKeyUtc(isoDate: string): string {
  const date = new Date(isoDate);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function isWithinLastDays(isoDate: string, days: number): boolean {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp >= Date.now() - days * DAY_MS;
}

function buildLastNDays(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * DAY_MS);
    out.push(day.toISOString().slice(0, 10));
  }

  return out;
}

export function aggregateTrend30dFromEntries(entries: CaptureEntry[]): TrendDayPoint[] {
  const trendMap = new Map<string, { words: number; captures: number; unique: Set<string> }>();
  const recent = entries.filter((entry) => isWithinLastDays(entry.createdAt, TREND_DAYS));

  for (const entry of recent) {
    const key = dayKeyUtc(entry.createdAt);
    const row = trendMap.get(key) ?? { words: 0, captures: 0, unique: new Set<string>() };
    row.words += Number(entry.wordCount ?? 0);
    row.captures += 1;

    for (const token of tokenizeNormalizedWords(entry.content)) {
      row.unique.add(token);
    }

    trendMap.set(key, row);
  }

  return buildLastNDays(TREND_DAYS).map((day) => {
    const row = trendMap.get(day);
    return {
      day,
      words: row?.words ?? 0,
      uniqueWords: row?.unique.size ?? 0,
      captures: row?.captures ?? 0,
    };
  });
}

export function aggregateMetrics(entries: CaptureEntry[]): CaptureMetrics {
  const sorted = [...entries].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const windowEntries = sorted.filter((entry) => withinRolling24h(entry.createdAt));

  const pointsByHour = new Map<string, MetricPoint>();
  const unique24h = new Set<string>();
  let totalWordChars24h = 0;
  let sentences24h = 0;
  let paragraphs24h = 0;

  for (const entry of windowEntries) {
    const wordCount = Number(entry.wordCount ?? 0);
    const charsNoSpaces = Number(entry.charCountNoSpaces ?? 0);
    const avgWordLengthPerEntry = Number(entry.avgWordLength ?? 0);
    const sentencesCount = Number(entry.sentencesCount ?? 0);
    const paragraphsCount = Number(entry.paragraphsCount ?? 0);

    const hourSlot = new Date(entry.createdAt);
    hourSlot.setMinutes(0, 0, 0);
    const slot = hourSlot.toISOString();

    const current = pointsByHour.get(slot) ?? { slot, words: 0, chars: 0 };
    current.words += wordCount;
    current.chars += charsNoSpaces;
    pointsByHour.set(slot, current);

    totalWordChars24h += avgWordLengthPerEntry * wordCount;
    sentences24h += sentencesCount;
    paragraphs24h += paragraphsCount;
    for (const token of tokenizeNormalizedWords(entry.content)) {
      unique24h.add(token);
    }
  }

  const words24h = windowEntries.reduce((sum, entry) => sum + Number(entry.wordCount ?? 0), 0);
  const chars24h = windowEntries.reduce((sum, entry) => sum + Number(entry.charCountNoSpaces ?? 0), 0);
  let activeMinutes24h = 0;
  for (let i = 0; i < windowEntries.length; i += 1) {
    if (i === 0) {
      activeMinutes24h += MIN_ACTIVE_MINUTES_PER_ENTRY;
      continue;
    }

    const current = Date.parse(windowEntries[i].createdAt);
    const previous = Date.parse(windowEntries[i - 1].createdAt);
    if (Number.isNaN(current) || Number.isNaN(previous)) {
      activeMinutes24h += MIN_ACTIVE_MINUTES_PER_ENTRY;
      continue;
    }

    const gapMinutes = Math.max(0, (current - previous) / 60_000);
    activeMinutes24h += gapMinutes <= ACTIVE_GAP_LIMIT_MINUTES ? gapMinutes : MIN_ACTIVE_MINUTES_PER_ENTRY;
  }

  const avgWpm24h = activeMinutes24h > 0 ? average(words24h, activeMinutes24h) : 0;
  const uniqueWords24h = unique24h.size;
  const richnessPct = words24h > 0 ? average(uniqueWords24h * 100, words24h) : 0;
  const avgWordLength = words24h > 0 ? average(totalWordChars24h, words24h) : 0;

  const points = [...pointsByHour.values()].sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot));
  const trend30d = aggregateTrend30dFromEntries(entries);

  return {
    words24h,
    chars24h,
    entries24h: windowEntries.length,
    avgWpm24h,
    totalCaptures: entries.length,
    avgWordsPerCapture: average(words24h, windowEntries.length),
    points,
    linguistic24h: {
      uniqueWords: uniqueWords24h,
      richnessPct,
      avgWordLength,
      sentences: sentences24h,
      paragraphs: paragraphs24h,
    },
    trend30d,
    latestSnapshot: {
      words24h,
      chars24h,
      entries24h: windowEntries.length,
      avgWpm24h,
      totalCaptures: entries.length,
      avgWordsPerCapture: average(words24h, windowEntries.length),
      uniqueWords: uniqueWords24h,
      richnessPct,
      avgWordLength,
      sentences: sentences24h,
      paragraphs: paragraphs24h,
    },
    recentEntries: windowEntries.slice(-RECENT_LIMIT).reverse(),
  };
}
