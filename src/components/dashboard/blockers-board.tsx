import { Card } from "@/components/ui/card";
import { AgentTask } from "@/lib/types";

export function BlockersBoard({ tasks }: { tasks: AgentTask[] }) {
  const blockers = tasks.filter((task) => task.phase === "blocked");

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Blockers</h3>

      <div className="space-y-2">
        {blockers.length ? (
          blockers.map((task) => (
            <article key={task.id} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <div className="text-sm font-semibold text-rose-900">{task.identifier ? `${task.identifier} · ` : ""}{task.title}</div>
              <div className="text-xs text-rose-700">
                lane: {task.laneId} · reason: {task.blockedReason ?? "n/a"} · updated: {new Date(task.phaseUpdatedAt).toLocaleString()}
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No blocked tasks right now.</p>
        )}
      </div>
    </Card>
  );
}
