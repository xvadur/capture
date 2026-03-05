import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LaneStatus } from "@/lib/types";
import { humanizePhase } from "@/lib/utils";

export function AgentList({ lanes }: { lanes: LaneStatus[] }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lane Agents</h3>

      <div className="grid gap-3 md:grid-cols-2">
        {lanes.map((laneStatus) => {
          const orderedTasks = [...laneStatus.tasks].sort(
            (a, b) => Date.parse(b.phaseUpdatedAt) - Date.parse(a.phaseUpdatedAt),
          );
          const currentTask =
            orderedTasks.find((task) => task.phase === "in_progress") ??
            orderedTasks.find((task) => task.phase === "queued") ??
            orderedTasks.find((task) => task.phase === "blocked") ??
            null;

          return (
            <article key={laneStatus.lane.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{laneStatus.lane.name}</h4>
                <p className="text-xs text-slate-500">{laneStatus.lane.ownerHint}</p>
              </div>

              <div className="flex items-center gap-1">
                <Badge tone="neutral">active {laneStatus.activeCount}</Badge>
                <Badge tone={laneStatus.blockedCount > 0 ? "danger" : "ok"}>blocked {laneStatus.blockedCount}</Badge>
              </div>
            </div>

            <p className="text-sm text-slate-600">{laneStatus.lane.purpose}</p>

            <div className="mt-3 rounded-lg border border-[var(--line)] bg-slate-50 p-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Current Task
              </div>
              {currentTask ? (
                <>
                  <div className="text-sm font-medium text-slate-900">
                    {currentTask.identifier ? `${currentTask.identifier} · ` : ""}
                    {currentTask.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    phase: {humanizePhase(currentTask.phase)} · updated:{" "}
                    {new Date(currentTask.phaseUpdatedAt).toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">No active task in this lane.</div>
              )}
            </div>
          </article>
          );
        })}
      </div>
    </Card>
  );
}
