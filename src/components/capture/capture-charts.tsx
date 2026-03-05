import dynamic from "next/dynamic";
import { CaptureMetrics } from "@/lib/types";
import { Card } from "@/components/ui/card";

const WordsAreaChart = dynamic(
  () => import("@/components/capture/words-area-chart").then((mod) => mod.WordsAreaChart),
  {
    ssr: false,
    loading: () => <div className="text-sm text-slate-500">Loading chart...</div>,
  },
);

const DailyWordsBarChart = dynamic(
  () => import("@/components/capture/daily-words-bar-chart").then((mod) => mod.DailyWordsBarChart),
  {
    ssr: false,
    loading: () => <div className="text-sm text-slate-500">Loading chart...</div>,
  },
);

export function CaptureCharts({ metrics }: { metrics: CaptureMetrics | null }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="h-[260px] p-4 md:h-[300px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Words (24h)</h3>
          <div className="text-sm font-semibold text-slate-800">{metrics?.words24h ?? 0} words</div>
        </div>
        <WordsAreaChart points={metrics?.points ?? []} />
      </Card>

      <Card className="h-[260px] p-4 md:h-[300px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Words Trend (30d)</h3>
          <div className="text-sm font-semibold text-slate-800">
            {(metrics?.trend30d ?? []).reduce((sum, point) => sum + point.words, 0)} words
          </div>
        </div>
        <DailyWordsBarChart points={metrics?.trend30d ?? []} />
      </Card>
      </div>
  );
}
