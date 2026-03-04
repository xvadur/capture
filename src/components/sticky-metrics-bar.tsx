"use client";

import { useEffect, useMemo, useState } from "react";
import { AGENTS_POLL_MS, METRICS_POLL_MS } from "@/lib/config";
import { CaptureMetrics, LinearTasksResponse } from "@/lib/types";
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
  const { liveCharsPerMinute, draftWords, draftCharsNoSpaces } = useAppState();
  const [captureMetrics, setCaptureMetrics] = useState<CaptureMetrics | null>(null);
  const [taskSummary, setTaskSummary] = useState<LinearTasksResponse["summary"] | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/linear/tasks", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as LinearTasksResponse;
        if (isMounted) setTaskSummary(data.summary);
      } catch {
        // keep previous snapshot
      }
    };

    const bootstrap = setTimeout(() => {
      void fetchTasks();
    }, 0);
    const interval = setInterval(() => {
      void fetchTasks();
    }, AGENTS_POLL_MS);

    return () => {
      isMounted = false;
      clearTimeout(bootstrap);
      clearInterval(interval);
    };
  }, []);

  const chips = useMemo<MetricChip[]>(() => {
    const blocked = taskSummary?.byPhase.blocked ?? 0;
    const escalation = taskSummary?.blockersOlderThan30m ?? 0;

    return [
      { label: "LIVE CPM", value: String(liveCharsPerMinute) },
      { label: "DRAFT WORDS", value: String(draftWords) },
      { label: "DRAFT CHARS", value: String(draftCharsNoSpaces) },
      { label: "24H WORDS", value: String(captureMetrics?.words24h ?? 0), tone: "positive" },
      { label: "24H ENTRIES", value: String(captureMetrics?.entries24h ?? 0) },
      { label: "AVG/CAPTURE", value: String(captureMetrics?.avgWordsPerCapture ?? 0) },
      { label: "TASKS", value: String(taskSummary?.total ?? 0) },
      { label: "BLOCKED", value: String(blocked), tone: blocked > 0 ? "danger" : "positive" },
      {
        label: "ESCALATE >30M",
        value: String(escalation),
        tone: escalation > 0 ? "danger" : "positive",
      },
    ];
  }, [captureMetrics, draftCharsNoSpaces, draftWords, liveCharsPerMinute, taskSummary]);

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
