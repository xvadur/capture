import { DONE_REQUIREMENTS, LANES } from "@/lib/config";
import {
  AgentTask,
  AgentsResponse,
  LaneId,
  LaneLoad,
  LaneStatus,
  LinearTasksResponse,
  SlaSnapshot,
  TaskPhase,
} from "@/lib/types";
import {
  MissionControlAgent,
  MissionControlBoard,
  MissionControlDashboardMetrics,
  MissionControlRawSnapshot,
  MissionControlTask,
  MissionControlTaskView,
} from "@/lib/mission-control/types";
import { minutesSince } from "@/lib/utils";
import { buildTaskSummary } from "@/lib/local-store";

const LANE_KEYWORDS: Array<{ laneId: LaneId; keywords: string[] }> = [
  { laneId: "command_center", keywords: ["command", "orchestrator", "control"] },
  { laneId: "sales_outreach", keywords: ["sales", "outreach", "lead"] },
  { laneId: "client_delivery", keywords: ["delivery", "onboard", "qa"] },
  { laneId: "ai_recepcia", keywords: ["recepcia", "proof"] },
  { laneId: "content_media", keywords: ["content", "media"] },
  { laneId: "system_devops", keywords: ["devops", "runtime", "infra", "system"] },
  { laneId: "finance_ops", keywords: ["finance", "runway", "spend"] },
  { laneId: "research_intel", keywords: ["research", "intel", "signals"] },
  { laneId: "voice_builder", keywords: ["voice builder", "voice-design", "voice-build"] },
  { laneId: "voice_ops", keywords: ["voice ops", "voice runtime", "voice-integration"] },
  { laneId: "biz_admin", keywords: ["biz", "admin", "legal", "compliance"] },
];

function isoNow(): string {
  return new Date().toISOString();
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inferLaneFromText(text: string): LaneId {
  const normalized = normalize(text);
  for (const entry of LANE_KEYWORDS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.laneId;
    }
  }
  return "command_center";
}

function inferLaneFromBoard(board?: MissionControlBoard): LaneId {
  if (!board) {
    return "command_center";
  }
  return inferLaneFromText(`${board.name} ${board.description ?? ""}`);
}

function inferLaneFromAgent(agent?: MissionControlAgent): LaneId | undefined {
  if (!agent) {
    return undefined;
  }
  return inferLaneFromText(agent.name);
}

function mapPhase(task: MissionControlTask): { phase: TaskPhase; blockedReason?: "dependency" } {
  if (task.is_blocked || (task.blocked_by_task_ids?.length ?? 0) > 0) {
    return { phase: "blocked", blockedReason: "dependency" };
  }

  switch (task.status) {
    case "inbox":
      return { phase: "queued" };
    case "in_progress":
      return { phase: "in_progress" };
    case "review":
      // Capture uses a narrower phase set; review is treated as in-progress unless explicitly blocked.
      return { phase: "in_progress" };
    case "done":
      return { phase: "done" };
    default:
      return { phase: "queued" };
  }
}

function mapPriority(raw?: string | null): "P0" | "P1" | "P2" {
  const normalized = (raw ?? "").toLowerCase();
  if (normalized.includes("urgent") || normalized.includes("high")) {
    return "P0";
  }
  if (normalized.includes("medium")) {
    return "P1";
  }
  return "P2";
}

function buildLaneLoad(tasks: AgentTask[]): LaneLoad[] {
  const byLane = new Map<LaneId, LaneLoad>();
  for (const task of tasks) {
    if (task.phase !== "in_progress") continue;
    const current = byLane.get(task.laneId) ?? { laneId: task.laneId, p0Active: 0, p1p2Active: 0 };
    if (task.priority === "P0") {
      current.p0Active += 1;
    } else {
      current.p1p2Active += 1;
    }
    byLane.set(task.laneId, current);
  }
  return [...byLane.values()];
}

function buildSla(tasks: AgentTask[]): SlaSnapshot[] {
  return tasks
    .filter((task) => task.phase === "blocked")
    .map((task) => {
      const ageMinutes = Number(minutesSince(task.phaseUpdatedAt).toFixed(1));
      return {
        taskId: task.id,
        ageMinutes,
        thresholdMinutes: DONE_REQUIREMENTS.blockedEscalationMinutes,
        breached: ageMinutes > DONE_REQUIREMENTS.blockedEscalationMinutes,
        alertedAt: task.updatedAt,
      };
    })
    .filter((item) => item.breached);
}

function buildMissionSummary(tasks: AgentTask[]) {
  const byPhase = buildTaskSummary(tasks).byPhase;
  return {
    missionId: "mission-control-live",
    objective: "Mission Control Live Snapshot",
    status: (byPhase.blocked > 0 ? "blocked" : byPhase.in_progress > 0 ? "in_progress" : "queued") as
      | "queued"
      | "in_progress"
      | "blocked"
      | "done",
    totalPackets: tasks.length,
    donePackets: byPhase.done,
    blockedPackets: byPhase.blocked,
    inProgressPackets: byPhase.in_progress,
    queuedPackets: byPhase.queued,
    approvalPending: tasks.filter((task) => task.approvalRequired && task.approvalStatus !== "approved").length,
  };
}

function buildThroughput(tasks: AgentTask[], dashboard: MissionControlDashboardMetrics) {
  const done = tasks.filter((task) => task.phase === "done").length;
  const total = tasks.length;
  const doneRatePct = total > 0 ? Number(((done / total) * 100).toFixed(1)) : 0;

  return {
    packetsPerDay: dashboard.kpis.done_tasks,
    doneRatePct,
    meanCycleTimeMinutes: dashboard.kpis.median_cycle_time_hours_7d
      ? Number((dashboard.kpis.median_cycle_time_hours_7d * 60).toFixed(1))
      : 0,
  };
}

function toAgentTask(
  task: MissionControlTask,
  board?: MissionControlBoard,
  agent?: MissionControlAgent,
  approvalPendingTaskIds?: Set<string>,
): AgentTask {
  const phaseInfo = mapPhase(task);
  const laneId = inferLaneFromAgent(agent) ?? inferLaneFromBoard(board);
  const updatedAt = task.updated_at ?? task.created_at ?? isoNow();

  const approvalRequired = approvalPendingTaskIds?.has(task.id) ?? false;

  return {
    id: task.id,
    identifier: `MC-${task.id.slice(0, 8)}`,
    title: task.title,
    description: task.description ?? "",
    laneId,
    phase: phaseInfo.phase,
    blockedReason: phaseInfo.blockedReason,
    phaseUpdatedAt: updatedAt,
    approvalRequired,
    approvalStatus: approvalRequired ? "pending" : "approved",
    dodChecklist: [],
    evidence: [],
    approvalLog: [],
    owner: agent?.name,
    missionId: board?.id,
    packetId: task.id,
    priority: mapPriority(task.priority),
    deadline: task.due_at ?? undefined,
    dependencies: task.depends_on_task_ids ?? [],
    approvalClass: approvalRequired ? "high" : "medium",
    isMissionRoot: false,
    updatedAt,
  };
}

function buildLanes(tasks: AgentTask[]): LaneStatus[] {
  return LANES.map((lane) => {
    const laneTasks = tasks.filter((task) => task.laneId === lane.id);
    return {
      lane,
      tasks: laneTasks,
      activeCount: laneTasks.filter((task) => task.phase === "in_progress" || task.phase === "queued").length,
      blockedCount: laneTasks.filter((task) => task.phase === "blocked").length,
      doneCount: laneTasks.filter((task) => task.phase === "done").length,
    };
  });
}

export function mapMissionControlTaskViews(snapshot: MissionControlRawSnapshot): MissionControlTaskView[] {
  const boardsById = new Map(snapshot.boards.map((board) => [board.id, board]));
  const agentsById = new Map(snapshot.agents.map((agent) => [agent.id, agent]));
  return snapshot.tasks.map((task) => {
    const board = boardsById.get(task.board_id);
    const agent = task.assigned_agent_id ? agentsById.get(task.assigned_agent_id) : undefined;
    const phaseInfo = mapPhase(task);
    return {
      id: task.id,
      laneId: inferLaneFromAgent(agent) ?? inferLaneFromBoard(board),
      phase: phaseInfo.phase,
      blockedReason: phaseInfo.blockedReason,
      updatedAt: task.updated_at ?? task.created_at ?? isoNow(),
      title: task.title,
    };
  });
}

export function mapMissionControlToTasksResponse(snapshot: MissionControlRawSnapshot): LinearTasksResponse {
  const boardsById = new Map(snapshot.boards.map((board) => [board.id, board]));
  const agentsById = new Map(snapshot.agents.map((agent) => [agent.id, agent]));
  const approvalIds = new Set((snapshot.dashboard.pending_approvals?.items ?? []).map((item) => item.task_id).filter(Boolean) as string[]);

  const tasks = snapshot.tasks.map((task) => {
    const board = boardsById.get(task.board_id);
    const agent = task.assigned_agent_id ? agentsById.get(task.assigned_agent_id) : undefined;
    return toAgentTask(task, board, agent, approvalIds);
  });

  const summary = buildTaskSummary(tasks);
  const slaBreaches = buildSla(tasks);

  return {
    tasks,
    summary,
    source: "mission-control",
    degraded: false,
    missionSummary: buildMissionSummary(tasks),
    throughput: buildThroughput(tasks, snapshot.dashboard),
    slaBreaches,
    approvalQueue: tasks.filter((task) => task.approvalRequired && task.approvalStatus !== "approved"),
  };
}

export function mapMissionControlToAgentsResponse(snapshot: MissionControlRawSnapshot): AgentsResponse {
  const taskResponse = mapMissionControlToTasksResponse(snapshot);
  const laneLoad = buildLaneLoad(taskResponse.tasks);
  const lanes = buildLanes(taskResponse.tasks);
  const currentPacket = Object.fromEntries(
    lanes.map((lane) => {
      const current = lane.tasks.find((task) => task.phase === "in_progress") ?? lane.tasks[0];
      return [lane.lane.id, current?.title ?? "idle"];
    }),
  );

  return {
    ...taskResponse,
    lanes,
    laneLoad,
    currentPacket,
    sla: {
      breached: taskResponse.slaBreaches?.length ?? 0,
      thresholdMinutes: DONE_REQUIREMENTS.blockedEscalationMinutes,
    },
  };
}
