import { NextResponse } from "next/server";
import { z } from "zod";
import { addLocalCapture, getLocalCaptures } from "@/lib/local-store";
import { countChars, countCharsNoSpaces, countWords, toIsoNow } from "@/lib/utils";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase";
import { CaptureEntry } from "@/lib/types";

const createCaptureSchema = z.object({
  content: z.string().trim().min(1).max(50_000),
});

const TABLE = "capture_entries";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ entries: getLocalCaptures().slice(0, 30) });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, content, word_count, char_count, char_count_no_spaces, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      throw error;
    }

    const entries: CaptureEntry[] = (data ?? []).map((row) => ({
      id: String(row.id),
      content: String(row.content ?? ""),
      wordCount: Number(row.word_count ?? 0),
      charCount: Number(row.char_count ?? 0),
      charCountNoSpaces: Number(row.char_count_no_spaces ?? 0),
      createdAt: String(row.created_at ?? toIsoNow()),
    }));

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: getLocalCaptures().slice(0, 30), storage: "local_fallback" });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createCaptureSchema.parse(await request.json());

    const entry: CaptureEntry = {
      id: crypto.randomUUID(),
      content: parsed.content,
      wordCount: countWords(parsed.content),
      charCount: countChars(parsed.content),
      charCountNoSpaces: countCharsNoSpaces(parsed.content),
      createdAt: toIsoNow(),
    };

    if (!hasSupabaseConfig()) {
      addLocalCapture(entry);
      return NextResponse.json({ entry, storage: "local" }, { status: 201 });
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
          created_at: entry.createdAt,
        })
        .select("id, content, word_count, char_count, char_count_no_spaces, created_at")
        .single();

      if (error) {
        throw error;
      }

      const persisted: CaptureEntry = {
        id: String(data.id),
        content: String(data.content ?? ""),
        wordCount: Number(data.word_count ?? 0),
        charCount: Number(data.char_count ?? 0),
        charCountNoSpaces: Number(data.char_count_no_spaces ?? 0),
        createdAt: String(data.created_at ?? entry.createdAt),
      };

      return NextResponse.json({ entry: persisted, storage: "supabase" }, { status: 201 });
    } catch {
      addLocalCapture(entry);
      return NextResponse.json({ entry, storage: "local_fallback" }, { status: 201 });
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
