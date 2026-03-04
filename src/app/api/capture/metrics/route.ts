import { NextRequest, NextResponse } from "next/server";
import { aggregateMetrics } from "@/lib/capture-metrics";
import { getLocalCaptures } from "@/lib/local-store";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase";
import { CaptureEntry } from "@/lib/types";

const TABLE = "capture_entries";

async function readEntries(limit: number): Promise<CaptureEntry[]> {
  if (!hasSupabaseConfig()) {
    return getLocalCaptures().slice(0, limit);
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, content, word_count, char_count, char_count_no_spaces, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    content: String(row.content ?? ""),
    wordCount: Number(row.word_count ?? 0),
    charCount: Number(row.char_count ?? 0),
    charCountNoSpaces: Number(row.char_count_no_spaces ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }));
}

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 2000);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 10), 5000) : 2000;

  try {
    const entries = await readEntries(safeLimit);
    const metrics = aggregateMetrics(entries);

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load metrics" },
      { status: 500 },
    );
  }
}
