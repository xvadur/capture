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

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <CaptureCharts metrics={metrics} />
        <TodayCaptures entries={metrics?.recentEntries ?? []} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-400">Words (24h)</div>
          <div className="text-2xl font-semibold text-slate-900">{metrics?.words24h ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-400">Chars (24h, no spaces)</div>
          <div className="text-2xl font-semibold text-slate-900">{metrics?.chars24h ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-400">Total captures</div>
          <div className="text-2xl font-semibold text-slate-900">{metrics?.totalCaptures ?? 0}</div>
        </Card>
      </div>
    </div>
  );
}
