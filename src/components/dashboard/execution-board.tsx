import { Card } from "@/components/ui/card";
import { AgentTask } from "@/lib/types";

function sortNewest(tasks: AgentTask[]): AgentTask[] {
  return [...tasks].sort((a, b) => Date.parse(b.phaseUpdatedAt) - Date.parse(a.phaseUpdatedAt));
}

function renderTask(task: AgentTask) {
  return (
    <article key={task.id} className="rounded-lg border border-[var(--line)] bg-white p-2">
      <div className="text-sm font-medium text-slate-900">
        {task.identifier ? `${task.identifier} · ` : ""}
        {task.title}
      </div>
      <div className="text-xs text-slate-500">
        lane: {task.laneId} · owner: {task.owner ?? "n/a"} · {new Date(task.phaseUpdatedAt).toLocaleString()}
      </div>
    </article>
  );
}

export function ExecutionBoard({ tasks }: { tasks: AgentTask[] }) {
  const done = sortNewest(tasks.filter((task) => task.phase === "done")).slice(0, 8);
  const pending = sortNewest(tasks.filter((task) => task.phase === "queued" || task.phase === "in_progress")).slice(0, 8);
  const blocked = sortNewest(tasks.filter((task) => task.phase === "blocked")).slice(0, 8);

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Execution Board</h3>
      <div className="grid gap-3 xl:grid-cols-3">
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</div>
          {pending.length ? pending.map(renderTask) : <p className="text-sm text-slate-500">No pending tasks.</p>}
        </section>
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Done</div>
          {done.length ? done.map(renderTask) : <p className="text-sm text-slate-500">No completed tasks yet.</p>}
        </section>
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked</div>
          {blocked.length ? blocked.map(renderTask) : <p className="text-sm text-slate-500">No blocked tasks.</p>}
        </section>
      </div>
    </Card>
  );
}
