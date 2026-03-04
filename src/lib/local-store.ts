import { AgentTask, CaptureEntry, TaskSummary } from "@/lib/types";
import { DONE_REQUIREMENTS } from "@/lib/config";
import { minutesSince } from "@/lib/utils";

type Store = {
  captures: CaptureEntry[];
  tasks: AgentTask[];
};

declare global {
  var __captureV2Store: Store | undefined;
}

const SEED_TASKS: AgentTask[] = [
  {
    id: "local-1",
    identifier: "LOCAL-1",
    title: "Prepare 10 vetted cold leads",
    description: "Local fallback task",
    laneId: "sales",
    phase: "in_progress",
    phaseUpdatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    approvalRequired: false,
    approvalStatus: "approved",
    dodChecklist: ["Lead list exported", "Reservation link validated"],
    evidence: ["Local seed data"],
    approvalLog: [],
    owner: "sales-agent",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "local-2",
    identifier: "LOCAL-2",
    title: "Resolve dependency in delivery workflow",
    description: "Blocked example",
    laneId: "delivery",
    phase: "blocked",
    blockedReason: "dependency",
    phaseUpdatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    approvalRequired: true,
    approvalStatus: "pending",
    dodChecklist: ["Dependency owner confirmed", "Go-live checklist complete"],
    evidence: [],
    approvalLog: ["2026-03-04T00:20:00Z pending Adam review"],
    owner: "delivery-agent",
    updatedAt: new Date().toISOString(),
  },
];

function getStore(): Store {
  if (!global.__captureV2Store) {
    global.__captureV2Store = { captures: [], tasks: SEED_TASKS };
  }
  return global.__captureV2Store;
}

export function addLocalCapture(entry: CaptureEntry): CaptureEntry {
  const store = getStore();
  store.captures.unshift(entry);
  store.captures = store.captures.slice(0, 1000);
  return entry;
}

export function getLocalCaptures(): CaptureEntry[] {
  return getStore().captures;
}

export function getLocalTasks(): AgentTask[] {
  return getStore().tasks;
}

export function upsertLocalTask(task: AgentTask): AgentTask {
  const store = getStore();
  const idx = store.tasks.findIndex((item) => item.id === task.id);
  if (idx >= 0) {
    store.tasks[idx] = task;
  } else {
    store.tasks.unshift(task);
  }
  return task;
}

export function buildTaskSummary(tasks: AgentTask[]): TaskSummary {
  const byPhase: TaskSummary["byPhase"] = {
    queued: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
  };

  const blockedByReason: TaskSummary["blockedByReason"] = {};

  let blockersOlderThan30m = 0;

  for (const task of tasks) {
    byPhase[task.phase] += 1;

    if (task.phase === "blocked") {
      if (task.blockedReason) {
        blockedByReason[task.blockedReason] = (blockedByReason[task.blockedReason] ?? 0) + 1;
      }
      if (minutesSince(task.phaseUpdatedAt) > DONE_REQUIREMENTS.blockedEscalationMinutes) {
        blockersOlderThan30m += 1;
      }
    }
  }

  return {
    total: tasks.length,
    byPhase,
    blockedByReason,
    blockersOlderThan30m,
  };
}
