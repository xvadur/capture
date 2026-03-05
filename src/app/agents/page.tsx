"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentList } from "@/components/agents/agent-list";
import { TaskControlPanel } from "@/components/agents/task-control-panel";
import { TaskPayloadForm } from "@/components/agents/task-payload-form";
import { Card } from "@/components/ui/card";
import { AGENTS_POLL_MS } from "@/lib/config";
import { AgentsResponse } from "@/lib/types";

const emptyData: AgentsResponse = {
  lanes: [],
  tasks: [],
  summary: {
    total: 0,
    byPhase: { queued: 0, in_progress: 0, blocked: 0, done: 0 },
    blockedByReason: {},
    blockersOlderThan30m: 0,
  },
};

export default function AgentsPage() {
  const [data, setData] = useState<AgentsResponse>(emptyData);
  const [timedOut, setTimedOut] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAgents = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setTimedOut(true);
      controller.abort();
    }, 9_000);
    try {
      setLoading(true);
      const response = await fetch("/api/linear/agents", { cache: "no-store", signal: controller.signal });
      if (!response.ok) return;
      const payload = (await response.json()) as AgentsResponse;
      setData(payload);
      setTimedOut(false);
    } catch {
      // ignore transient failures
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = setTimeout(() => {
      void loadAgents();
    }, 0);
    const interval = setInterval(() => {
      void loadAgents();
    }, AGENTS_POLL_MS);
    return () => {
      clearTimeout(bootstrap);
      clearInterval(interval);
    };
  }, [loadAgents]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Agents Command Center</h2>
          <p className="text-sm text-slate-500">
            Assign tasks, track each lane&apos;s current mission, and control phase transitions.
          </p>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-slate-600">
          Data Source: {data.source === "mission-control" ? "mission-control" : "linear-fallback"}
        </div>
      </div>

      {timedOut ? (
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          Loading agents timed out after 9s. Keeping last known state.
        </Card>
      ) : null}

      {data.degraded ? (
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          Mission-control is degraded, running on fallback source.
          {data.fallbackReason ? ` (${data.fallbackReason})` : ""}
        </Card>
      ) : null}

      {data.source !== "mission-control" ? (
        <TaskPayloadForm onCreated={loadAgents} />
      ) : (
        <Card className="border-sky-200 bg-sky-50 text-sky-900">Read-only mode: updates are managed in Mission Control.</Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
        <AgentList lanes={data.lanes} />
        {data.source !== "mission-control" ? (
          <TaskControlPanel tasks={data.tasks} onUpdated={loadAgents} />
        ) : (
          <Card className="border-sky-200 bg-sky-50 text-sky-900">
            Task control panel is disabled while data source is mission-control (read-only integration).
          </Card>
        )}
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Lane Runtime Summary</div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">Queued: {data.summary.byPhase.queued}</div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">In Progress: {data.summary.byPhase.in_progress}</div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">Blocked: {data.summary.byPhase.blocked}</div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">Done: {data.summary.byPhase.done}</div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
            Mission Packets: {data.missionSummary?.totalPackets ?? 0}
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
            Approval Queue: {data.approvalQueue?.length ?? 0}
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
            SLA Breaches: {data.slaBreaches?.length ?? 0}
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
            Packets / Day: {data.throughput?.packetsPerDay ?? 0}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">{loading ? "Refreshing..." : "Live sync active"}</div>
      </Card>
    </div>
  );
}
