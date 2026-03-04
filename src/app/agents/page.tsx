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

  const loadAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/linear/agents", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as AgentsResponse;
      setData(payload);
    } catch {
      // ignore transient failures
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
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Agents Command Center</h2>
        <p className="text-sm text-slate-500">
          Assign tasks, track each lane&apos;s current mission, and control phase transitions.
        </p>
      </div>

      <TaskPayloadForm onCreated={loadAgents} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
        <AgentList lanes={data.lanes} />
        <TaskControlPanel tasks={data.tasks} onUpdated={loadAgents} />
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Lane Runtime Summary</div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">Queued: {data.summary.byPhase.queued}</div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">In Progress: {data.summary.byPhase.in_progress}</div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">Blocked: {data.summary.byPhase.blocked}</div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">Done: {data.summary.byPhase.done}</div>
        </div>
      </Card>
    </div>
  );
}
