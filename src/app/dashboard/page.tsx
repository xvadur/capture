"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentLeaderboard } from "@/components/dashboard/agent-leaderboard";
import { BlockersBoard } from "@/components/dashboard/blockers-board";
import { ExecutionBoard } from "@/components/dashboard/execution-board";
import { PhasesBoard } from "@/components/dashboard/phases-board";
import { StatusOverview } from "@/components/dashboard/status-overview";
import { AGENTS_POLL_MS } from "@/lib/config";
import { LinearTasksResponse } from "@/lib/types";

const emptySummary: LinearTasksResponse["summary"] = {
  total: 0,
  byPhase: { queued: 0, in_progress: 0, blocked: 0, done: 0 },
  blockedByReason: {},
  blockersOlderThan30m: 0,
};

export default function DashboardPage() {
  const [data, setData] = useState<LinearTasksResponse>({ tasks: [], summary: emptySummary });

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/linear/tasks", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as LinearTasksResponse;
      setData(payload);
    } catch {
      // keep previous state
    }
  }, []);

  useEffect(() => {
    const bootstrap = setTimeout(() => {
      void loadTasks();
    }, 0);
    const interval = setInterval(() => {
      void loadTasks();
    }, AGENTS_POLL_MS);
    return () => {
      clearTimeout(bootstrap);
      clearInterval(interval);
    };
  }, [loadTasks]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Operations Cockpit</h2>
        <p className="text-sm text-slate-500">
          See what moved, what is pending, what got blocked, and who is shipping.
        </p>
      </div>

      <StatusOverview summary={data.summary} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <PhasesBoard summary={data.summary} />
        <BlockersBoard tasks={data.tasks} />
      </div>

      <ExecutionBoard tasks={data.tasks} />
      <AgentLeaderboard tasks={data.tasks} />
    </div>
  );
}
