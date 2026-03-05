import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { TaskSummary } from "@/lib/types";

const PhasesBarChart = dynamic(
  () => import("@/components/dashboard/phases-bar-chart").then((mod) => mod.PhasesBarChart),
  {
    ssr: false,
    loading: () => <div className="text-sm text-slate-500">Loading chart...</div>,
  },
);

export function PhasesBoard({ summary }: { summary: TaskSummary }) {
  const data = [
    { phase: "Queued", count: summary.byPhase.queued },
    { phase: "In Progress", count: summary.byPhase.in_progress },
    { phase: "Blocked", count: summary.byPhase.blocked },
    { phase: "Done", count: summary.byPhase.done },
  ];

  return (
    <Card className="h-[290px] p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Phase Distribution</h3>
      <PhasesBarChart data={data} />
    </Card>
  );
}
