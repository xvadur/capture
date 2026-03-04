"use client";

import { FormEvent, useState } from "react";
import { LANES } from "@/lib/config";
import { LaneId } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function TaskPayloadForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [laneId, setLaneId] = useState<LaneId>("sales");
  const [payload, setPayload] = useState("");
  const [owner, setOwner] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [checklistText, setChecklistText] = useState("Define done criteria");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/linear/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          laneId,
          owner: owner || undefined,
          payload,
          approvalRequired,
          dodChecklist: checklistText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create task");
      }

      setTitle("");
      setPayload("");
      setOwner("");
      setChecklistText("Define done criteria");
      setApprovalRequired(false);
      setStatus("Task created.");
      onCreated();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Task creation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Command Center · New Agent Task</h3>
      <p className="text-sm text-slate-500">
        Assign a concrete payload to one lane agent. This becomes the agent&apos;s current mission input.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={laneId}
            onChange={(event) => setLaneId(event.target.value as LaneId)}
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          >
            {LANES.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {lane.name}
              </option>
            ))}
          </select>

          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner (optional)"
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>

        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          placeholder="Payload for lane agent"
          className="h-28 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
        />

        <textarea
          value={checklistText}
          onChange={(event) => setChecklistText(event.target.value)}
          placeholder="DoD checklist, one per line"
          className="h-20 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={approvalRequired}
            onChange={(event) => setApprovalRequired(event.target.checked)}
          />
          High-risk approval required
        </label>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">{status}</span>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {submitting ? "Creating..." : "Create task"}
          </button>
        </div>
      </form>
    </Card>
  );
}
