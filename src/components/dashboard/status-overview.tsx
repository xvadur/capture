import { Card } from "@/components/ui/card";
import { TaskSummary } from "@/lib/types";

export function StatusOverview({ summary }: { summary: TaskSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Card>
        <div className="text-xs uppercase tracking-wide text-slate-400">Total</div>
        <div className="text-2xl font-semibold text-slate-900">{summary.total}</div>
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-wide text-slate-400">Queued</div>
        <div className="text-2xl font-semibold text-slate-900">{summary.byPhase.queued}</div>
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-wide text-slate-400">In Progress</div>
        <div className="text-2xl font-semibold text-slate-900">{summary.byPhase.in_progress}</div>
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-wide text-slate-400">Blocked</div>
        <div className="text-2xl font-semibold text-rose-700">{summary.byPhase.blocked}</div>
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-wide text-slate-400">Escalate &gt;30m</div>
        <div className="text-2xl font-semibold text-rose-700">{summary.blockersOlderThan30m}</div>
      </Card>
    </div>
  );
}
