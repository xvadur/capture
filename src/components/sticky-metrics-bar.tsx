"use client";

import { useEffect, useMemo, useState } from "react";
import { METRICS_POLL_MS } from "@/lib/config";
import { CaptureMetrics } from "@/lib/types";
import { useAppState } from "@/components/app-state-provider";

type MetricChip = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "danger";
};

function chipToneClasses(tone: MetricChip["tone"]): string {
  if (tone === "positive") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (tone === "danger") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-slate-300 bg-white text-slate-700";
}

export function StickyMetricsBar() {
  const { liveWordsPerMinute, draftWords } = useAppState();
  const [captureMetrics, setCaptureMetrics] = useState<CaptureMetrics | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/capture/metrics", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as CaptureMetrics;
        if (isMounted) setCaptureMetrics(data);
      } catch {
        // keep previous snapshot
      }
    };

    const bootstrap = setTimeout(() => {
      void fetchMetrics();
    }, 0);
    const interval = setInterval(() => {
      void fetchMetrics();
    }, METRICS_POLL_MS);

    return () => {
      isMounted = false;
      clearTimeout(bootstrap);
      clearInterval(interval);
    };
  }, []);

  const chips = useMemo<MetricChip[]>(() => {
    const snapshot = captureMetrics?.latestSnapshot;
    const linguistic = captureMetrics?.linguistic24h;

    return [
      { label: "LIVE WPM", value: String(liveWordsPerMinute) },
      { label: "DRAFT WORDS", value: String(draftWords) },
      { label: "24H WORDS", value: String(snapshot?.words24h ?? captureMetrics?.words24h ?? 0), tone: "positive" },
      { label: "24H PROMPTS", value: String(snapshot?.entries24h ?? captureMetrics?.entries24h ?? 0), tone: "positive" },
      { label: "AVG WPM 24H", value: String(snapshot?.avgWpm24h ?? captureMetrics?.avgWpm24h ?? 0), tone: "positive" },
      { label: "24H UNIQUE", value: String(snapshot?.uniqueWords ?? linguistic?.uniqueWords ?? 0), tone: "positive" },
      { label: "RICHNESS %", value: String(snapshot?.richnessPct ?? linguistic?.richnessPct ?? 0) },
      {
        label: "AVG WORD LEN",
        value: String(snapshot?.avgWordLength ?? linguistic?.avgWordLength ?? 0),
      },
      { label: "SENTENCES", value: String(snapshot?.sentences ?? linguistic?.sentences ?? 0) },
      { label: "PARAGRAPHS", value: String(snapshot?.paragraphs ?? linguistic?.paragraphs ?? 0) },
    ];
  }, [captureMetrics, draftWords, liveWordsPerMinute]);

  return (
    <div className="sticky top-0 z-30 border-y border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 py-2 md:px-6">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className={`flex min-w-max items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold ${chipToneClasses(chip.tone)}`}
          >
            <span className="opacity-70">{chip.label}</span>
            <span>{chip.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
