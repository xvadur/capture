"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { APPROVAL_STATUSES, BLOCKED_REASONS, AgentTask, TASK_PHASES, TaskPhase } from "@/lib/types";
import { humanizePhase } from "@/lib/utils";

export function TaskControlPanel({ tasks, onUpdated }: { tasks: AgentTask[]; onUpdated: () => void }) {
  const [selectedId, setSelectedId] = useState<string>(tasks[0]?.id ?? "");
  const [phase, setPhase] = useState<TaskPhase>("queued");
  const [blockedReason, setBlockedReason] = useState<string>("");
  const [approvalStatus, setApprovalStatus] = useState<(typeof APPROVAL_STATUSES)[number]>("pending");
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [checklistText, setChecklistText] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [approvalLogText, setApprovalLogText] = useState("");
  const [status, setStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedId) ?? null, [selectedId, tasks]);

  function hydrateFromTask(task: AgentTask) {
    setPhase(task.phase);
    setBlockedReason(task.blockedReason ?? "");
    setApprovalRequired(task.approvalRequired);
    setApprovalStatus(task.approvalStatus);
    setChecklistText(task.dodChecklist.join("\n"));
    setEvidenceText(task.evidence.join("\n"));
    setApprovalLogText(task.approvalLog.join("\n"));
  }

  useEffect(() => {
    if (!tasks.length) {
      return;
    }
    const current = tasks.find((task) => task.id === selectedId);
    if (current) {
      return;
    }
    setSelectedId(tasks[0].id);
    hydrateFromTask(tasks[0]);
  }, [tasks, selectedId]);

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;

    setUpdating(true);
    setStatus("");

    try {
      const response = await fetch(`/api/linear/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase,
          commandCenterClose: phase === "done",
          blockedReason: phase === "blocked" ? blockedReason || undefined : undefined,
          approvalRequired,
          approvalStatus,
          dodChecklist: checklistText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          evidence: evidenceText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          approvalLog: approvalLogText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          payloadAppend: phase === "done" ? "Closed by command-center control panel." : undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Task update failed");
      }

      setStatus("Task updated.");
      onUpdated();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Task update failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Command Center Control Panel</h3>

      <div className="rounded-lg border border-[var(--line)] bg-slate-50 p-3 text-xs text-slate-600">
        Done transition is gated: all DoD items checked + at least one Evidence item + approval for high-risk tasks.
      </div>

      <select
        value={selectedId}
        onChange={(event) => {
          const nextId = event.target.value;
          setSelectedId(nextId);
          const nextTask = tasks.find((task) => task.id === nextId);
          if (nextTask) hydrateFromTask(nextTask);
        }}
        className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
      >
        <option value="">Select task...</option>
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.identifier ? `${task.identifier}: ` : ""}
            {task.title}
          </option>
        ))}
      </select>

      {selectedTask ? (
        <form onSubmit={submitUpdate} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="neutral">{selectedTask.laneId}</Badge>
            <Badge tone={selectedTask.phase === "blocked" ? "danger" : "ok"}>{humanizePhase(selectedTask.phase)}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select value={phase} onChange={(event) => setPhase(event.target.value as TaskPhase)} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
              {TASK_PHASES.map((item) => (
                <option key={item} value={item}>
                  {humanizePhase(item)}
                </option>
              ))}
            </select>

            <select
              value={phase === "blocked" ? blockedReason : ""}
              onChange={(event) => setBlockedReason(event.target.value)}
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              disabled={phase !== "blocked"}
            >
              <option value="">blocked reason...</option>
              {BLOCKED_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={approvalRequired}
              onChange={(event) => setApprovalRequired(event.target.checked)}
            />
            approval required
          </label>

          <select
            value={approvalStatus}
            onChange={(event) => setApprovalStatus(event.target.value as (typeof APPROVAL_STATUSES)[number])}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          >
            {APPROVAL_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <textarea
            value={checklistText}
            onChange={(event) => setChecklistText(event.target.value)}
            className="h-24 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            placeholder="DoD checklist lines. Use [x] prefix for completed items."
          />
          <textarea
            value={evidenceText}
            onChange={(event) => setEvidenceText(event.target.value)}
            className="h-20 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            placeholder="Evidence lines"
          />
          <textarea
            value={approvalLogText}
            onChange={(event) => setApprovalLogText(event.target.value)}
            className="h-20 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            placeholder="Approval log lines"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{status}</span>
            <button
              type="submit"
              disabled={updating}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {updating ? "Updating..." : "Update task"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-slate-500">Select a task to edit phase and approvals.</p>
      )}
    </Card>
  );
}
