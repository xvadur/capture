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
  const [timedOut, setTimedOut] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setTimedOut(true);
      controller.abort();
    }, 9_000);
    try {
      setLoading(true);
      const response = await fetch("/api/linear/tasks", { cache: "no-store", signal: controller.signal });
      if (!response.ok) return;
      const payload = (await response.json()) as LinearTasksResponse;
      setData(payload);
      setTimedOut(false);
    } catch {
      // keep previous state
    } finally {
      clearTimeout(timeout);
      setLoading(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Operations Cockpit</h2>
          <p className="text-sm text-slate-500">
            See what moved, what is pending, what got blocked, and who is shipping.
          </p>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-slate-600">
          Data Source: {data.source === "mission-control" ? "mission-control" : "linear-fallback"}
        </div>
      </div>

      {timedOut ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Dashboard refresh timed out after 9s. Showing last known snapshot.
        </div>
      ) : null}

      {data.degraded ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Mission-control is degraded, fallback data is active.
          {data.fallbackReason ? ` (${data.fallbackReason})` : ""}
        </div>
      ) : null}

      <StatusOverview summary={data.summary} />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Mission Packets</div>
          <div className="text-2xl font-semibold text-slate-900">{data.missionSummary?.totalPackets ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Approval Queue</div>
          <div className="text-2xl font-semibold text-amber-700">{data.approvalQueue?.length ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">SLA Breaches</div>
          <div className="text-2xl font-semibold text-rose-700">{data.slaBreaches?.length ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Packets / Day</div>
          <div className="text-2xl font-semibold text-slate-900">{data.throughput?.packetsPerDay ?? 0}</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <PhasesBoard summary={data.summary} />
        <BlockersBoard tasks={data.tasks} />
      </div>

      <ExecutionBoard tasks={data.tasks} />
      <AgentLeaderboard tasks={data.tasks} />
      <div className="text-xs text-slate-500">{loading ? "Refreshing..." : "Live sync active"}</div>
    </div>
  );
}
