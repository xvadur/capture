import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LaneStatus } from "@/lib/types";

export function AgentList({ lanes }: { lanes: LaneStatus[] }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lane Agents</h3>

      <div className="grid gap-3 md:grid-cols-2">
        {lanes.map((laneStatus) => (
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
          </article>
        ))}
      </div>
    </Card>
  );
}
