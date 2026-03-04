import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { addLocalCapture, getLocalCaptures } from "@/lib/local-store";
import { analyzeCaptureText, toIsoNow, tokenizeNormalizedWords } from "@/lib/utils";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase";
import { CaptureEntry } from "@/lib/types";

const createCaptureSchema = z.object({
  content: z.string().trim().min(1).max(50_000),
});

const TABLE = "capture_entries";
const DAILY_TABLE = "capture_daily_metrics";

function toUtcDay(isoDate: string): string {
  const parsed = new Date(isoDate);
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed.toISOString().slice(0, 10);
}

function mapDbRowToCaptureEntry(row: Record<string, unknown>, fallbackCreatedAt: string): CaptureEntry {
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
    createdAt: String(row.created_at ?? fallbackCreatedAt),
  };
}

async function upsertDailyMetrics(supabase: SupabaseClient, day: string) {
  const start = `${day}T00:00:00.000Z`;
  const endDate = new Date(`${day}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = endDate.toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .select("content, word_count, char_count_no_spaces, sentences_count, paragraphs_count")
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const unique = new Set<string>();

  let totalWords = 0;
  let totalCharsNoSpaces = 0;
  let totalSentences = 0;
  let totalParagraphs = 0;

  for (const row of rows) {
    totalWords += Number(row.word_count ?? 0);
    totalCharsNoSpaces += Number(row.char_count_no_spaces ?? 0);
    totalSentences += Number(row.sentences_count ?? 0);
    totalParagraphs += Number(row.paragraphs_count ?? 0);

    for (const token of tokenizeNormalizedWords(String(row.content ?? ""))) {
      unique.add(token);
    }
  }

  const { error: upsertError } = await supabase.from(DAILY_TABLE).upsert(
    {
      day,
      total_words: totalWords,
      total_chars_no_spaces: totalCharsNoSpaces,
      total_unique_words: unique.size,
      total_sentences: totalSentences,
      total_paragraphs: totalParagraphs,
      captures_count: rows.length,
      updated_at: toIsoNow(),
    },
    { onConflict: "day" },
  );

  if (upsertError) {
    throw upsertError;
  }
}

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ entries: getLocalCaptures().slice(0, 30) });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        "id, content, word_count, char_count, char_count_no_spaces, unique_word_count, lexical_richness_pct, avg_word_length, sentences_count, paragraphs_count, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      throw error;
    }

    const entries: CaptureEntry[] = (data ?? []).map((row) =>
      mapDbRowToCaptureEntry(row as Record<string, unknown>, toIsoNow()),
    );

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: getLocalCaptures().slice(0, 30), storage: "local_fallback" });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createCaptureSchema.parse(await request.json());
    const analyzed = analyzeCaptureText(parsed.content);

    const entry: CaptureEntry = {
      id: crypto.randomUUID(),
      content: parsed.content,
      wordCount: analyzed.wordCount,
      charCount: analyzed.charCount,
      charCountNoSpaces: analyzed.charCountNoSpaces,
      uniqueWordCount: analyzed.uniqueWordCount,
      lexicalRichnessPct: analyzed.lexicalRichnessPct,
      avgWordLength: analyzed.avgWordLength,
      sentencesCount: analyzed.sentencesCount,
      paragraphsCount: analyzed.paragraphsCount,
      createdAt: toIsoNow(),
    };

    if (!hasSupabaseConfig()) {
      addLocalCapture(entry);
      return NextResponse.json(
        {
          entry,
          linguistic: {
            uniqueWordCount: entry.uniqueWordCount,
            lexicalRichnessPct: entry.lexicalRichnessPct,
            avgWordLength: entry.avgWordLength,
            sentencesCount: entry.sentencesCount,
            paragraphsCount: entry.paragraphsCount,
          },
          storage: "local",
        },
        { status: 201 },
      );
    }

    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          content: entry.content,
          word_count: entry.wordCount,
          char_count: entry.charCount,
          char_count_no_spaces: entry.charCountNoSpaces,
          unique_word_count: entry.uniqueWordCount,
          lexical_richness_pct: entry.lexicalRichnessPct,
          avg_word_length: entry.avgWordLength,
          sentences_count: entry.sentencesCount,
          paragraphs_count: entry.paragraphsCount,
          created_at: entry.createdAt,
        })
        .select(
          "id, content, word_count, char_count, char_count_no_spaces, unique_word_count, lexical_richness_pct, avg_word_length, sentences_count, paragraphs_count, created_at",
        )
        .single();

      if (error) {
        throw error;
      }

      const persisted = mapDbRowToCaptureEntry(data as Record<string, unknown>, entry.createdAt);
      const day = toUtcDay(persisted.createdAt);
      try {
        await upsertDailyMetrics(supabase, day);
      } catch {
        // Non-blocking to preserve capture ingestion.
      }

      return NextResponse.json(
        {
          entry: persisted,
          linguistic: {
            uniqueWordCount: persisted.uniqueWordCount,
            lexicalRichnessPct: persisted.lexicalRichnessPct,
            avgWordLength: persisted.avgWordLength,
            sentencesCount: persisted.sentencesCount,
            paragraphsCount: persisted.paragraphsCount,
          },
          storage: "supabase",
        },
        { status: 201 },
      );
    } catch {
      addLocalCapture(entry);
      return NextResponse.json(
        {
          entry,
          linguistic: {
            uniqueWordCount: entry.uniqueWordCount,
            lexicalRichnessPct: entry.lexicalRichnessPct,
            avgWordLength: entry.avgWordLength,
            sentencesCount: entry.sentencesCount,
            paragraphsCount: entry.paragraphsCount,
          },
          storage: "local_fallback",
        },
        { status: 201 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create capture" },
      { status: 500 },
    );
  }
}
