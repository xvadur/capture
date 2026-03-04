import { NextRequest, NextResponse } from "next/server";
import { aggregateMetrics, aggregateTrend30dFromEntries } from "@/lib/capture-metrics";
import { getLocalCaptures } from "@/lib/local-store";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase";
import { CaptureEntry, TrendDayPoint } from "@/lib/types";
import { toIsoNow } from "@/lib/utils";

const TABLE = "capture_entries";
const DAILY_TABLE = "capture_daily_metrics";
const DAY_MS = 24 * 60 * 60 * 1000;

type MetricsWindow = "24h" | "30d" | "all";

function parseWindow(value: string | null): MetricsWindow {
  if (value === "24h" || value === "30d") {
    return value;
  }
  return "all";
}

function buildLast30Days(): string[] {
  const out: string[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * DAY_MS);
    out.push(day.toISOString().slice(0, 10));
  }

  return out;
}

function normalizeTrendRows(rows: TrendDayPoint[]): TrendDayPoint[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return buildLast30Days().map((day) => byDay.get(day) ?? { day, words: 0, uniqueWords: 0, captures: 0 });
}

function mapCaptureRow(row: Record<string, unknown>): CaptureEntry {
  return {
    id: String(row.id),
    content: String(row.content ?? ""),
    wordCount: Number(row.word_count ?? 0),
    charCount: Number(row.char_count ?? 0),
    charCountNoSpaces: Number(row.char_count_no_spaces ?? 0),
    uniqueWordCount: Number(row.unique_word_count ?? 0),
    lexicalRichnessPct: Number(row.lexical_richness_pct ?? 0),
    avgWordLength: Number(row.avg_word_length ?? 0),
    sentencesCount: Number(row.sentences_count ?? 0),
    paragraphsCount: Number(row.paragraphs_count ?? 0),
    createdAt: String(row.created_at ?? toIsoNow()),
  };
}

async function readEntries(limit: number, window: MetricsWindow): Promise<CaptureEntry[]> {
  if (!hasSupabaseConfig()) {
    const local = getLocalCaptures().slice(0, limit);
    if (window === "all") {
      return local;
    }

    const now = Date.now();
    const threshold = window === "24h" ? now - 24 * 60 * 60 * 1000 : now - 30 * DAY_MS;
    return local.filter((entry) => {
      const timestamp = Date.parse(entry.createdAt);
      return !Number.isNaN(timestamp) && timestamp >= threshold;
    });
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from(TABLE)
    .select(
      "id, content, word_count, char_count, char_count_no_spaces, unique_word_count, lexical_richness_pct, avg_word_length, sentences_count, paragraphs_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (window === "24h") {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", cutoff);
  }

  if (window === "30d") {
    const cutoff = new Date(Date.now() - 30 * DAY_MS).toISOString();
    query = query.gte("created_at", cutoff);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapCaptureRow(row as Record<string, unknown>));
}

async function readTrend30dFromDailyTable(): Promise<TrendDayPoint[]> {
  const supabase = getSupabaseServerClient();
  const startDay = new Date(Date.now() - 29 * DAY_MS);
  startDay.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from(DAILY_TABLE)
    .select("day, total_words, total_unique_words, captures_count")
    .gte("day", startDay.toISOString().slice(0, 10))
    .order("day", { ascending: true });

  if (error) {
    throw error;
  }

  const points: TrendDayPoint[] = (data ?? []).map((row) => ({
    day: String(row.day),
    words: Number(row.total_words ?? 0),
    uniqueWords: Number(row.total_unique_words ?? 0),
    captures: Number(row.captures_count ?? 0),
  }));

  return normalizeTrendRows(points);
}

export async function GET(request: NextRequest) {
  const window = parseWindow(request.nextUrl.searchParams.get("window"));
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 2000);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 10), 5000) : 2000;

  try {
    const entries = await readEntries(safeLimit, window);
    const metrics = aggregateMetrics(entries);
    let trend30d = metrics.trend30d;

    if (hasSupabaseConfig()) {
      try {
        trend30d = await readTrend30dFromDailyTable();
      } catch {
        trend30d = normalizeTrendRows(aggregateTrend30dFromEntries(entries));
      }
    } else {
      trend30d = normalizeTrendRows(aggregateTrend30dFromEntries(entries));
    }

    return NextResponse.json({ ...metrics, trend30d });
  } catch {
    const entries = getLocalCaptures().slice(0, safeLimit);
    const metrics = aggregateMetrics(entries);
    const trend30d = normalizeTrendRows(aggregateTrend30dFromEntries(entries));

    return NextResponse.json({ ...metrics, trend30d, storage: "local_fallback" });
  }
}
