import { Card } from "@/components/ui/card";
import { AgentTask } from "@/lib/types";

type LeaderboardRow = {
  agent: string;
  assigned: number;
  done: number;
  pending: number;
  blocked: number;
  completionPct: number;
};

function buildLeaderboard(tasks: AgentTask[]): LeaderboardRow[] {
  const byAgent = new Map<string, LeaderboardRow>();

  for (const task of tasks) {
    const agent = task.owner?.trim() || `${task.laneId}-agent`;
    const current =
      byAgent.get(agent) ??
      {
        agent,
        assigned: 0,
        done: 0,
        pending: 0,
        blocked: 0,
        completionPct: 0,
      };

    current.assigned += 1;
    if (task.phase === "done") {
      current.done += 1;
    } else if (task.phase === "blocked") {
      current.blocked += 1;
    } else {
      current.pending += 1;
    }

    byAgent.set(agent, current);
  }

  return [...byAgent.values()]
    .map((row) => ({
      ...row,
      completionPct: row.assigned > 0 ? Number(((row.done / row.assigned) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => {
      if (b.done !== a.done) return b.done - a.done;
      if (b.completionPct !== a.completionPct) return b.completionPct - a.completionPct;
      return a.agent.localeCompare(b.agent);
    });
}

export function AgentLeaderboard({ tasks }: { tasks: AgentTask[] }) {
  const rows = buildLeaderboard(tasks);

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Agent Activity Leaderboard</h3>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <article key={row.agent} className="rounded-lg border border-[var(--line)] bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  #{index + 1} {row.agent}
                </div>
                <div className="text-xs font-semibold text-slate-600">{row.completionPct}% done</div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                assigned: {row.assigned} · done: {row.done} · pending: {row.pending} · blocked: {row.blocked}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No agent activity yet.</p>
      )}
    </Card>
  );
}
