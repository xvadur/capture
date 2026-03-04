"use client";

import { useCallback, useEffect, useState } from "react";
import { CaptureCharts } from "@/components/capture/capture-charts";
import { CaptureEditor } from "@/components/capture/capture-editor";
import { TodayCaptures } from "@/components/capture/today-captures";
import { Card } from "@/components/ui/card";
import { METRICS_POLL_MS } from "@/lib/config";
import { CaptureMetrics } from "@/lib/types";

export default function CapturePage() {
  const [metrics, setMetrics] = useState<CaptureMetrics | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/capture/metrics", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as CaptureMetrics;
      setMetrics(data);
    } catch {
      // keep stale data
    }
  }, []);

  useEffect(() => {
    const bootstrap = setTimeout(() => {
      void loadMetrics();
    }, 0);
    const interval = setInterval(() => {
      void loadMetrics();
    }, METRICS_POLL_MS);
    return () => {
      clearTimeout(bootstrap);
      clearInterval(interval);
    };
  }, [loadMetrics]);

  return (
    <div className="space-y-4">
      <CaptureEditor onCaptured={loadMetrics} />

      <Card>
        <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">24h Focus Metrics</div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Words (24h)</div>
            <div className="text-3xl font-semibold text-slate-900">{metrics?.words24h ?? 0}</div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Prompts Sent (24h)</div>
            <div className="text-3xl font-semibold text-slate-900">{metrics?.entries24h ?? 0}</div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Avg WPM (24h est.)</div>
            <div className="text-3xl font-semibold text-slate-900">{metrics?.avgWpm24h ?? 0}</div>
          </div>
        </div>
      </Card>

      <CaptureCharts metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <TodayCaptures entries={metrics?.recentEntries ?? []} />
        <Card>
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Latest Snapshot</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">24h Words</div>
              <div className="text-2xl font-semibold text-slate-900">{metrics?.latestSnapshot?.words24h ?? 0}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">24h Unique</div>
              <div className="text-2xl font-semibold text-slate-900">
                {metrics?.latestSnapshot?.uniqueWords ?? metrics?.linguistic24h?.uniqueWords ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">24h Prompts</div>
              <div className="text-2xl font-semibold text-slate-900">
                {metrics?.latestSnapshot?.entries24h ?? metrics?.entries24h ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Richness %</div>
              <div className="text-2xl font-semibold text-slate-900">
                {metrics?.latestSnapshot?.richnessPct ?? metrics?.linguistic24h?.richnessPct ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Avg Word Len</div>
              <div className="text-2xl font-semibold text-slate-900">
                {metrics?.latestSnapshot?.avgWordLength ?? metrics?.linguistic24h?.avgWordLength ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Avg WPM (24h est.)</div>
              <div className="text-2xl font-semibold text-slate-900">
                {metrics?.latestSnapshot?.avgWpm24h ?? metrics?.avgWpm24h ?? 0}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">Writing Market</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            { label: "Words (24h)", value: metrics?.words24h ?? 0 },
            { label: "Chars (24h)", value: metrics?.chars24h ?? 0 },
            { label: "Entries (24h)", value: metrics?.entries24h ?? 0 },
            { label: "Avg / Capture", value: metrics?.avgWordsPerCapture ?? 0 },
            { label: "Total Captures", value: metrics?.totalCaptures ?? 0 },
            { label: "Unique (24h)", value: metrics?.linguistic24h.uniqueWords ?? 0 },
            { label: "Richness %", value: metrics?.linguistic24h.richnessPct ?? 0 },
            { label: "Avg Word Length", value: metrics?.linguistic24h.avgWordLength ?? 0 },
            { label: "Sentences (24h)", value: metrics?.linguistic24h.sentences ?? 0 },
            { label: "Paragraphs (24h)", value: metrics?.linguistic24h.paragraphs ?? 0 },
          ].map((tile) => (
            <div key={tile.label} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{tile.label}</div>
              <div className="text-xl font-semibold text-slate-900">{tile.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
