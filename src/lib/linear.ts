import { DONE_REQUIREMENTS, LANE_MAP, LEGACY_LANE_ALIASES, LINEAR_ENV } from "@/lib/config";
import { buildTaskSummary, getLocalTasks, upsertLocalTask } from "@/lib/local-store";
import {
  AgentTask,
  ApprovalClass,
  ApprovalStatus,
  BLOCKED_REASONS,
  BlockedReason,
  CreateTaskInput,
  LaneLoad,
  LaneId,
  LinearTasksResponse,
  Mission,
  MissionDispatchResponse,
  MissionIntakeInput,
  MissionPriority,
  MissionType,
  Packet,
  SlaSnapshot,
  TaskControlMeta,
  TaskPhase,
  UpdateTaskInput,
} from "@/lib/types";
import { isBlockedReason, isTaskPhase, minutesSince, safeJsonParse, toIsoNow } from "@/lib/utils";

const CAPTURE_META_PREFIX = "<!-- CAPTURE_META ";
const PHASE_TRANSITIONS: Record<TaskPhase, TaskPhase[]> = {
  queued: ["in_progress", "blocked"],
  in_progress: ["blocked", "done"],
  blocked: ["in_progress"],
  done: [],
};
const P0_LIMIT_PER_LANE = 1;
const P1_P2_LIMIT_PER_LANE = 2;

const MISSION_LANE_MAP: Record<MissionType, LaneId[]> = {
  revenue: ["command_center", "sales_outreach", "content_media", "research_intel", "client_delivery"],
  delivery: ["command_center", "client_delivery", "system_devops", "ai_recepcia"],
  voice: ["command_center", "voice_builder", "voice_ops", "system_devops", "client_delivery"],
  biz_admin: ["command_center", "biz_admin", "finance_ops", "research_intel"],
  mixed: ["command_center", "sales_outreach", "client_delivery", "system_devops", "research_intel"],
};

function normalizeLaneId(raw: LaneId | string | undefined): LaneId {
  if (!raw) return "command_center";
  const lane = String(raw) as LaneId;
  if (LANE_MAP[lane]) {
    return lane;
  }
  const aliased = LEGACY_LANE_ALIASES[lane];
  if (aliased && LANE_MAP[aliased]) {
    return aliased;
  }
  return "command_center";
}

type LinearIssue = {
  id: string;
  identifier?: string;
  title: string;
  url?: string;
  description?: string;
  updatedAt?: string;
  assignee?: { name?: string | null } | null;
  team?: { id?: string | null; key?: string | null; name?: string | null } | null;
};

type ComposeDescriptionOptions = {
  missionId?: string;
  packetId?: string;
  priority?: MissionPriority;
  deadline?: string;
  dependencies?: string[];
  approvalClass?: ApprovalClass;
  isMissionRoot?: boolean;
};

function hasLinearConfig(): boolean {
  return Boolean(LINEAR_ENV.apiKey);
}

async function linearGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!hasLinearConfig()) {
    throw new Error("Linear configuration missing.");
  }

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_ENV.apiKey as string,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(payload.errors?.[0]?.message ?? `Linear request failed with ${response.status}`);
  }

  return payload.data;
}

function normalizeChecklist(input?: string[]): string[] {
  return (input ?? []).map((item) => item.trim()).filter(Boolean);
}

function toChecklistLine(item: string): string {
  if (/^- \[( |x|X)\]\s+/.test(item)) {
    return item;
  }
  if (/^\[( |x|X)\]\s+/.test(item)) {
    return `- ${item}`;
  }
  return `- [ ] ${item}`;
}

function normalizeBullets(input?: string[]): string[] {
  return (input ?? []).map((item) => item.trim()).filter(Boolean);
}

function toYesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function parseYesNo(value: string | undefined, fallback = false): boolean {
  if (!value) {
    return fallback;
  }
  return ["yes", "true", "1", "y"].includes(value.toLowerCase());
}

function parseBullets(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean);
}

function parseChecklist(section: string): { label: string; checked: boolean }[] {
  return section
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^- \[( |x|X)\]\s+(.+)$/);
      if (!match) {
        return null;
      }
      return {
        label: match[2].trim(),
        checked: match[1].toLowerCase() === "x",
      };
    })
    .filter((item): item is { label: string; checked: boolean } => Boolean(item));
}

function sectionContent(description: string, sectionName: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |\\n<!-- CAPTURE_META |$)`);
  return (description.match(regex)?.[1] ?? "").trim();
}

function parseControl(description: string): Record<string, string> {
  const control = sectionContent(description, "Capture Control");
  return control
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .reduce<Record<string, string>>((acc, line) => {
      const [key, ...rest] = line.replace(/^-\s+/, "").split(":");
      if (!key || rest.length === 0) {
        return acc;
      }
      acc[key.trim()] = rest.join(":").trim();
      return acc;
    }, {});
}

function parseMetaBlob(description: string): Record<string, unknown> {
  const metaMatch = description.match(/<!-- CAPTURE_META\s+([\s\S]*?)\s*-->/);
  if (!metaMatch?.[1]) {
    return {};
  }
  return safeJsonParse<Record<string, unknown>>(metaMatch[1], {});
}

function parseMeta(description: string): TaskControlMeta {
  const parsed = parseMetaBlob(description);
  if (Object.keys(parsed).length > 0) {
    const laneId = normalizeLaneId(typeof parsed.laneId === "string" ? parsed.laneId : undefined);
    const phase: TaskPhase = isTaskPhase(parsed.phase) ? parsed.phase : "queued";
    const blockedReason = isBlockedReason(parsed.blockedReason) ? parsed.blockedReason : undefined;
    const approvalStatus: ApprovalStatus = ["pending", "approved", "rejected"].includes(
      String(parsed.approvalStatus),
    )
      ? (parsed.approvalStatus as ApprovalStatus)
      : "pending";

    return {
      laneId,
      phase,
      blockedReason,
      phaseUpdatedAt: typeof parsed.phaseUpdatedAt === "string" ? parsed.phaseUpdatedAt : toIsoNow(),
      approvalRequired: Boolean(parsed.approvalRequired),
      approvalStatus,
    };
  }

  const control = parseControl(description);
  const laneId = normalizeLaneId(control.lane_id);
  const phase = isTaskPhase(control.phase) ? control.phase : "queued";
  const blockedReason = isBlockedReason(control.blocked_reason) ? (control.blocked_reason as BlockedReason) : undefined;

  return {
    laneId,
    phase,
    blockedReason,
    phaseUpdatedAt: control.phase_updated_at ?? toIsoNow(),
    approvalRequired: parseYesNo(control.approval_required),
    approvalStatus: ["pending", "approved", "rejected"].includes(control.approval_status)
      ? (control.approval_status as ApprovalStatus)
      : "pending",
  };
}

function splitBody(description: string): string {
  const withoutMeta = description.replace(/<!-- CAPTURE_META\s+[\s\S]*?-->/g, "").trim();
  const sectionStart = withoutMeta.indexOf("## Capture Control");
  return (sectionStart >= 0 ? withoutMeta.slice(0, sectionStart) : withoutMeta).trim();
}

function composeDescription(
  baseBody: string,
  meta: TaskControlMeta,
  dodChecklist: string[],
  evidence: string[],
  approvalLog: string[],
  options?: ComposeDescriptionOptions,
): string {
  const checklist = dodChecklist.length
    ? dodChecklist.map((item) => toChecklistLine(item)).join("\n")
    : "- [ ] Define done criteria";

  const evidenceBlock = evidence.length ? evidence.map((item) => `- ${item}`).join("\n") : "- Pending";
  const approvalLogBlock = approvalLog.length ? approvalLog.map((item) => `- ${item}`).join("\n") : "- None";

  const metaLine = `${CAPTURE_META_PREFIX}${JSON.stringify({
    ...meta,
    missionId: options?.missionId,
    packetId: options?.packetId,
    priority: options?.priority,
    deadline: options?.deadline,
    dependencies: options?.dependencies ?? [],
    approvalClass: options?.approvalClass,
    isMissionRoot: Boolean(options?.isMissionRoot),
  })} -->`;

  return [
    baseBody.trim(),
    "",
    "## Capture Control",
    `- lane_id: ${meta.laneId}`,
    `- phase: ${meta.phase}`,
    `- phase_updated_at: ${meta.phaseUpdatedAt}`,
    `- blocked_reason: ${meta.blockedReason ?? "n/a"}`,
    `- approval_required: ${toYesNo(meta.approvalRequired)}`,
    `- approval_status: ${meta.approvalStatus}`,
    `- mission_id: ${options?.missionId ?? "n/a"}`,
    `- packet_id: ${options?.packetId ?? "n/a"}`,
    `- priority: ${options?.priority ?? "P2"}`,
    `- deadline: ${options?.deadline ?? "n/a"}`,
    `- dependencies: ${options?.dependencies?.join(", ") ?? "none"}`,
    `- approval_class: ${options?.approvalClass ?? "medium"}`,
    "",
    "## Definition of Done",
    checklist,
    "",
    "## Evidence",
    evidenceBlock,
    "",
    "## Approval Log",
    approvalLogBlock,
    "",
    metaLine,
  ]
    .join("\n")
    .trim();
}

function fromLinearIssue(issue: LinearIssue): AgentTask {
  const description = issue.description ?? "";
  const meta = parseMeta(description);
  const rawMeta = parseMetaBlob(description);
  const checklistItems = parseChecklist(sectionContent(description, "Definition of Done"));
  const evidence = parseBullets(sectionContent(description, "Evidence")).filter((item) => item.toLowerCase() !== "pending");
  const approvalLog = parseBullets(sectionContent(description, "Approval Log")).filter((item) => item.toLowerCase() !== "none");
  const missionId = typeof rawMeta.missionId === "string" ? rawMeta.missionId : undefined;
  const packetId = typeof rawMeta.packetId === "string" ? rawMeta.packetId : undefined;
  const priority = typeof rawMeta.priority === "string" ? (rawMeta.priority as MissionPriority) : undefined;
  const deadline = typeof rawMeta.deadline === "string" ? rawMeta.deadline : undefined;
  const dependencies = Array.isArray(rawMeta.dependencies)
    ? rawMeta.dependencies.map((item) => String(item)).filter(Boolean)
    : [];
  const approvalClass = typeof rawMeta.approvalClass === "string" ? (rawMeta.approvalClass as ApprovalClass) : undefined;
  const isMissionRoot = Boolean(rawMeta.isMissionRoot);

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    description,
    laneId: meta.laneId,
    missionId,
    packetId,
    priority,
    deadline,
    dependencies,
    approvalClass,
    isMissionRoot,
    owner: issue.assignee?.name ?? undefined,
    phase: meta.phase,
    phaseUpdatedAt: meta.phaseUpdatedAt,
    blockedReason: meta.blockedReason,
    approvalRequired: meta.approvalRequired,
    approvalStatus: meta.approvalStatus,
    dodChecklist: checklistItems.map((item) => (item.checked ? `[x] ${item.label}` : item.label)),
    evidence,
    approvalLog,
    updatedAt: issue.updatedAt,
  };
}

function ensureCompletionGate(task: AgentTask, nextEvidence: string[], description: string): void {
  const checklist = parseChecklist(sectionContent(description, "Definition of Done"));
  if (!checklist.length || checklist.some((item) => !item.checked)) {
    throw new Error("Done transition blocked: Definition of Done checklist must exist and all items must be checked.");
  }

  const evidenceFromDescription = parseBullets(sectionContent(description, "Evidence")).filter(
    (item) => item.toLowerCase() !== "pending",
  );
  const mergedEvidence = new Set([...task.evidence, ...evidenceFromDescription, ...nextEvidence]);

  if (mergedEvidence.size < DONE_REQUIREMENTS.minEvidenceItems) {
    throw new Error("Done transition blocked: add at least one evidence item.");
  }
}

async function getTeamId(): Promise<string> {
  const query = `
    query Teams {
      teams(first: 50) {
        nodes {
          id
          key
          name
        }
      }
    }
  `;

  const data = await linearGraphQL<{
    teams: { nodes: Array<{ id: string; key?: string | null; name?: string | null }> };
  }>(query);

  const teamHint = LINEAR_ENV.teamKey?.toLowerCase();
  const selectedTeam =
    data.teams.nodes.find((team) => {
      if (!teamHint) return false;
      return [team.id, team.key, team.name]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .includes(teamHint);
    }) ?? data.teams.nodes[0];

  if (!selectedTeam?.id) {
    throw new Error("Linear team not found.");
  }

  return selectedTeam.id;
}

function matchesTeamFilter(issue: LinearIssue): boolean {
  const hint = LINEAR_ENV.teamKey?.toLowerCase();
  if (!hint) {
    return true;
  }

  return [issue.team?.id, issue.team?.key, issue.team?.name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .includes(hint);
}

async function listLinearIssues(): Promise<LinearIssue[]> {
  const query = `
    query RecentIssues {
      issues(first: 150) {
        nodes {
          id
          identifier
          title
          url
          description
          updatedAt
          assignee {
            name
          }
          team {
            id
            key
            name
          }
        }
      }
    }
  `;

  const data = await linearGraphQL<{
    issues: {
      nodes: LinearIssue[];
    };
  }>(query);

  const issues = data.issues.nodes ?? [];
  const filtered = issues.filter(matchesTeamFilter);
  return filtered.length ? filtered : issues;
}

async function getLinearIssueById(id: string): Promise<LinearIssue> {
  const query = `
    query Issue($id: String!) {
      issue(id: $id) {
        id
        team {
          id
          key
          name
        }
      }
    }
  `;

  const data = await linearGraphQL<{ issue: { id: string } | null }>(query, { id });
  if (!data.issue?.id) {
    throw new Error("Linear issue not found.");
  }

  const detailQuery = `
    query IssueDetail($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        url
        description
        updatedAt
        assignee {
          name
        }
        team {
          id
          key
          name
        }
      }
    }
  `;

  const detail = await linearGraphQL<{ issue: LinearIssue | null }>(detailQuery, { id });
  if (!detail.issue) {
    throw new Error("Linear issue not found.");
  }

  return detail.issue;
}

type ListTaskOptions = {
  missionId?: string;
  includeSla?: boolean;
  laneId?: LaneId;
};

function buildThroughput(tasks: AgentTask[]) {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const last24h = tasks.filter((task) => {
    const updated = Date.parse(task.phaseUpdatedAt);
    return !Number.isNaN(updated) && updated >= now - oneDayMs;
  });
  const done = tasks.filter((task) => task.phase === "done").length;
  const doneRatePct = tasks.length > 0 ? Number(((done / tasks.length) * 100).toFixed(1)) : 0;

  const cycleTimes: number[] = [];
  for (const task of tasks) {
    if (task.phase !== "done") continue;
    const updatedAt = Date.parse(task.updatedAt ?? task.phaseUpdatedAt);
    const phaseAt = Date.parse(task.phaseUpdatedAt);
    if (!Number.isNaN(updatedAt) && !Number.isNaN(phaseAt) && updatedAt >= phaseAt) {
      cycleTimes.push((updatedAt - phaseAt) / 60_000);
    }
  }

  return {
    packetsPerDay: last24h.length,
    doneRatePct,
    meanCycleTimeMinutes: cycleTimes.length
      ? Number((cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length).toFixed(1))
      : 0,
  };
}

function buildMissionSummary(tasks: AgentTask[], missionId?: string) {
  const packets = tasks.filter((task) => !task.isMissionRoot);
  const missionPackets = missionId ? packets.filter((task) => task.missionId === missionId) : packets;
  if (!missionPackets.length) {
    return {
      missionId,
      totalPackets: 0,
      donePackets: 0,
      blockedPackets: 0,
      inProgressPackets: 0,
      queuedPackets: 0,
      approvalPending: 0,
    };
  }

  const rootMission = tasks.find((task) => task.isMissionRoot && (missionId ? task.missionId === missionId : true));
  const byPhase = missionPackets.reduce(
    (acc, task) => {
      acc[task.phase] += 1;
      return acc;
    },
    { queued: 0, in_progress: 0, blocked: 0, done: 0 },
  );

  return {
    missionId: rootMission?.missionId ?? missionId,
    objective: rootMission?.title,
    status: rootMission?.phase,
    totalPackets: missionPackets.length,
    donePackets: byPhase.done,
    blockedPackets: byPhase.blocked,
    inProgressPackets: byPhase.in_progress,
    queuedPackets: byPhase.queued,
    approvalPending: missionPackets.filter((task) => task.approvalRequired && task.approvalStatus !== "approved").length,
  };
}

function buildSlaBreaches(tasks: AgentTask[]): SlaSnapshot[] {
  return tasks
    .filter((task) => task.phase === "blocked")
    .map((task) => ({
      taskId: task.id,
      breached: minutesSince(task.phaseUpdatedAt) > DONE_REQUIREMENTS.blockedEscalationMinutes,
      ageMinutes: Number(minutesSince(task.phaseUpdatedAt).toFixed(1)),
      thresholdMinutes: DONE_REQUIREMENTS.blockedEscalationMinutes,
      alertedAt: task.updatedAt,
    }))
    .filter((item) => item.breached);
}

export function buildLaneLoad(tasks: AgentTask[]): LaneLoad[] {
  const load = new Map<LaneId, LaneLoad>();
  for (const task of tasks) {
    if (task.phase !== "in_progress") continue;
    const laneId = normalizeLaneId(task.laneId);
    const current = load.get(laneId) ?? { laneId, p0Active: 0, p1p2Active: 0 };
    if (task.priority === "P0") {
      current.p0Active += 1;
    } else {
      current.p1p2Active += 1;
    }
    load.set(laneId, current);
  }
  return [...load.values()];
}

export async function listTasks(options?: ListTaskOptions): Promise<LinearTasksResponse> {
  const missionFilter = options?.missionId;
  const laneFilter = options?.laneId ? normalizeLaneId(options.laneId) : undefined;

  const finalize = (inputTasks: AgentTask[]): LinearTasksResponse => {
    const normalized = inputTasks.map((task) => ({ ...task, laneId: normalizeLaneId(task.laneId) }));
    const missionScoped = missionFilter ? normalized.filter((task) => task.missionId === missionFilter) : normalized;
    const tasks = laneFilter ? missionScoped.filter((task) => task.laneId === laneFilter) : missionScoped;
    return {
      tasks,
      summary: buildTaskSummary(tasks),
      missionSummary: buildMissionSummary(normalized, missionFilter),
      throughput: buildThroughput(tasks),
      slaBreaches: options?.includeSla ? buildSlaBreaches(tasks) : [],
      approvalQueue: tasks.filter(
        (task) => task.approvalRequired && task.approvalStatus !== "approved" && task.phase !== "done",
      ),
    };
  };

  if (!hasLinearConfig()) {
    return finalize(getLocalTasks());
  }

  try {
    const issues = await listLinearIssues();
    const tasks = issues
      .map(fromLinearIssue)
      .sort((a, b) => Date.parse(b.phaseUpdatedAt) - Date.parse(a.phaseUpdatedAt));

    return finalize(tasks);
  } catch {
    return finalize(getLocalTasks());
  }
}

export async function createTask(input: CreateTaskInput): Promise<AgentTask> {
  const lane = normalizeLaneId(input.laneId);
  const now = toIsoNow();
  const meta: TaskControlMeta = {
    laneId: lane,
    phase: "queued",
    phaseUpdatedAt: now,
    blockedReason: undefined,
    approvalRequired: Boolean(input.approvalRequired),
    approvalStatus: input.approvalRequired ? "pending" : "approved",
  };

  const body = composeDescription(
    input.payload?.trim() || "Task payload",
    meta,
    normalizeChecklist(input.dodChecklist),
    [],
    [],
    {
      missionId: input.missionId,
      packetId: input.packetId,
      priority: input.priority,
      deadline: input.deadline,
      dependencies: input.dependencies,
      approvalClass: input.approvalClass,
      isMissionRoot: input.isMissionRoot,
    },
  );

  if (!hasLinearConfig()) {
    const localTask: AgentTask = {
      id: `local-${Math.random().toString(16).slice(2, 10)}`,
      identifier: `LOCAL-${Math.floor(Math.random() * 9000) + 1000}`,
      title: input.title,
      description: body,
      laneId: lane,
      missionId: input.missionId,
      packetId: input.packetId,
      priority: input.priority,
      deadline: input.deadline,
      dependencies: input.dependencies ?? [],
      approvalClass: input.approvalClass,
      isMissionRoot: Boolean(input.isMissionRoot),
      owner: input.owner,
      phase: meta.phase,
      phaseUpdatedAt: meta.phaseUpdatedAt,
      blockedReason: undefined,
      approvalRequired: meta.approvalRequired,
      approvalStatus: meta.approvalStatus,
      dodChecklist: normalizeChecklist(input.dodChecklist),
      evidence: [],
      approvalLog: [],
      updatedAt: now,
    };

    return upsertLocalTask(localTask);
  }

  const teamId = await getTeamId();
  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
          description
          updatedAt
          assignee {
            name
          }
        }
      }
    }
  `;

  const data = await linearGraphQL<{
    issueCreate: { success: boolean; issue: LinearIssue | null };
  }>(mutation, {
    input: {
      teamId,
      title: input.title,
      description: body,
      parentId: input.parentId,
    },
  });

  if (!data.issueCreate.success || !data.issueCreate.issue) {
    throw new Error("Linear issue creation failed.");
  }

  return fromLinearIssue(data.issueCreate.issue);
}

export async function updateTask(issueId: string, input: UpdateTaskInput): Promise<AgentTask> {
  const existing = hasLinearConfig() ? fromLinearIssue(await getLinearIssueById(issueId)) : getLocalTasks().find((task) => task.id === issueId);

  if (!existing) {
    throw new Error("Task not found.");
  }

  const requestedPhase = input.phase ?? existing.phase;
  const blockedReason = input.blockedReason ?? existing.blockedReason;

  if (requestedPhase !== existing.phase && !PHASE_TRANSITIONS[existing.phase].includes(requestedPhase)) {
    throw new Error(`Invalid phase transition: ${existing.phase} -> ${requestedPhase}`);
  }

  if (requestedPhase === "blocked" && !blockedReason) {
    throw new Error(`Blocked transition requires blocked_reason: ${BLOCKED_REASONS.join("|")}`);
  }

  const nextMeta: TaskControlMeta = {
    laneId: existing.laneId,
    phase: requestedPhase,
    phaseUpdatedAt: input.phase && input.phase !== existing.phase ? toIsoNow() : existing.phaseUpdatedAt,
    blockedReason: requestedPhase === "blocked" ? blockedReason : undefined,
    approvalRequired: input.approvalRequired ?? existing.approvalRequired,
    approvalStatus: (input.approvalStatus ?? existing.approvalStatus) as ApprovalStatus,
  };

  const nextChecklist = normalizeChecklist(input.dodChecklist ?? existing.dodChecklist);
  const nextEvidence = normalizeBullets(input.evidence ?? existing.evidence);
  const nextApprovalLog = normalizeBullets(input.approvalLog ?? existing.approvalLog);

  const updatedDescription = composeDescription(
    [splitBody(existing.description), input.payloadAppend?.trim()].filter(Boolean).join("\n\n"),
    nextMeta,
    nextChecklist,
    nextEvidence,
    nextApprovalLog,
    {
      missionId: existing.missionId,
      packetId: existing.packetId,
      priority: existing.priority,
      deadline: existing.deadline,
      dependencies: existing.dependencies ?? [],
      approvalClass: existing.approvalClass,
      isMissionRoot: existing.isMissionRoot,
    },
  );

  if (requestedPhase === "done") {
    if (!input.commandCenterClose) {
      throw new Error("Done transition blocked: only command-center can close tasks.");
    }
    ensureCompletionGate(existing, nextEvidence, updatedDescription);
  }

  if (nextMeta.approvalRequired && nextMeta.approvalStatus !== "approved" && requestedPhase === "done") {
    throw new Error("Done transition blocked: approval_status must be approved for approval_required tasks.");
  }

  if (!hasLinearConfig()) {
    const task: AgentTask = {
      ...existing,
      title: input.title ?? existing.title,
      owner: input.owner ?? existing.owner,
      phase: nextMeta.phase,
      phaseUpdatedAt: nextMeta.phaseUpdatedAt,
      blockedReason: nextMeta.blockedReason,
      approvalRequired: nextMeta.approvalRequired,
      approvalStatus: nextMeta.approvalStatus,
      dodChecklist: nextChecklist,
      evidence: nextEvidence,
      approvalLog: nextApprovalLog,
      description: updatedDescription,
      updatedAt: toIsoNow(),
    };

    return upsertLocalTask(task);
  }

  const mutation = `
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          title
          url
          description
          updatedAt
          assignee {
            name
          }
        }
      }
    }
  `;

  const data = await linearGraphQL<{
    issueUpdate: { success: boolean; issue: LinearIssue | null };
  }>(mutation, {
    id: issueId,
    input: {
      title: input.title ?? existing.title,
      description: updatedDescription,
    },
  });

  if (!data.issueUpdate.success || !data.issueUpdate.issue) {
    throw new Error("Linear update failed.");
  }

  return fromLinearIssue(data.issueUpdate.issue);
}

function classifyMissionType(input: MissionIntakeInput): MissionType {
  const haystack = `${input.objective} ${input.context}`.toLowerCase();
  if (haystack.includes("voice")) return "voice";
  if (haystack.includes("biz") || haystack.includes("legal") || haystack.includes("zivnost")) return "biz_admin";
  if (haystack.includes("delivery") || haystack.includes("onboard")) return "delivery";
  if (haystack.includes("sales") || haystack.includes("revenue") || haystack.includes("lead")) return "revenue";
  return "mixed";
}

function dependencyForLane(laneId: LaneId, missionType: MissionType): string[] {
  if (missionType === "voice" && laneId === "voice_ops") {
    return ["voice_builder"];
  }
  if (missionType === "revenue" && laneId === "client_delivery") {
    return ["sales_outreach"];
  }
  if (missionType === "biz_admin" && laneId === "finance_ops") {
    return ["biz_admin"];
  }
  return [];
}

function laneDefaultChecklist(laneId: LaneId): string[] {
  if (laneId === "command_center") {
    return ["Mission packet routing posted", "Owners assigned", "Checkpoint cadence active"];
  }
  return ["Objective delivered", "Evidence attached", "Handoff notes posted"];
}

function approvalRequiredForLane(laneId: LaneId, approvalClass: ApprovalClass): boolean {
  if (approvalClass === "high") return true;
  if (laneId === "sales_outreach" || laneId === "system_devops" || laneId === "finance_ops") return true;
  return false;
}

export async function createMission(input: MissionIntakeInput): Promise<MissionDispatchResponse> {
  const missionType = classifyMissionType(input);
  const now = toIsoNow();

  const missionRoot = await createTask({
    title: `MISSION: ${input.objective.slice(0, 160)}`,
    laneId: "command_center",
    payload: [
      "EXECUTE MISSION",
      `Mission ID: ${input.missionId}`,
      `Objective: ${input.objective}`,
      `Context: ${input.context}`,
      `Deadline: ${input.deadline}`,
      `Priority: ${input.priority}`,
      `Success Criteria: ${input.successCriteria.join(" | ")}`,
      `Constraints: ${input.constraints.join(" | ")}`,
      `Approval Class: ${input.approvalClass}`,
      `Output Required: ${input.outputRequired}`,
    ].join("\n"),
    approvalRequired: input.approvalClass === "high",
    dodChecklist: [
      "Mission intake validated",
      "Packet graph published",
      "Final summary posted with evidence ledger",
    ],
    missionId: input.missionId,
    packetId: "mission-root",
    priority: input.priority,
    deadline: input.deadline,
    approvalClass: input.approvalClass,
    isMissionRoot: true,
  });

  const targetLanes = MISSION_LANE_MAP[missionType];
  const packets: Packet[] = [];
  const parallelReady: string[] = [];
  const gated: string[] = [];

  for (let index = 0; index < targetLanes.length; index += 1) {
    const laneId = targetLanes[index];
    const packetId = `${input.missionId}-P${index + 1}`;
    const dependencies = dependencyForLane(laneId, missionType);
    const approvalRequired = approvalRequiredForLane(laneId, input.approvalClass);

    const task = await createTask({
      title: `PACKET: ${laneId} :: ${input.objective.slice(0, 90)}`,
      laneId,
      payload: `Mission packet for ${laneId}.\nObjective: ${input.objective}`,
      approvalRequired,
      dodChecklist: laneDefaultChecklist(laneId),
      missionId: input.missionId,
      packetId,
      priority: input.priority,
      deadline: input.deadline,
      dependencies,
      approvalClass: input.approvalClass,
      parentId: missionRoot.id,
    });

    packets.push({
      id: packetId,
      missionId: input.missionId,
      issueId: task.id,
      identifier: task.identifier,
      laneId,
      title: task.title,
      phase: task.phase,
      blockedReason: task.blockedReason,
      approvalRequired: task.approvalRequired,
      approvalStatus: task.approvalStatus,
      dependencies,
      evidenceCount: task.evidence.length,
      deadline: task.deadline,
    });

    if (dependencies.length > 0) {
      gated.push(packetId);
    } else {
      parallelReady.push(packetId);
    }
  }

  const mission: Mission = {
    id: input.missionId,
    issueId: missionRoot.id,
    identifier: missionRoot.identifier,
    objective: input.objective,
    context: input.context,
    deadline: input.deadline,
    priority: input.priority,
    approvalClass: input.approvalClass,
    successCriteria: input.successCriteria,
    constraints: input.constraints,
    outputRequired: input.outputRequired,
    status: "queued",
    missionType,
    createdAt: now,
  };

  return {
    mission,
    packets,
    dependencyGraph: {
      parallelReady,
      gated,
    },
  };
}

async function getTaskById(taskId: string): Promise<AgentTask> {
  const { tasks } = await listTasks();
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Packet not found.");
  }
  return task;
}

function enforceLaneConcurrency(tasks: AgentTask[], candidate: AgentTask): void {
  if (candidate.phase === "in_progress") return;

  const inProgress = tasks.filter((task) => task.id !== candidate.id && task.laneId === candidate.laneId && task.phase === "in_progress");
  const p0Active = inProgress.filter((task) => task.priority === "P0").length;
  const p1p2Active = inProgress.filter((task) => task.priority !== "P0").length;

  if (candidate.priority === "P0" && p0Active >= P0_LIMIT_PER_LANE) {
    throw new Error("Lane concurrency guard: max 1 active P0 packet per lane.");
  }
  if (candidate.priority !== "P0" && p1p2Active >= P1_P2_LIMIT_PER_LANE) {
    throw new Error("Lane concurrency guard: max 2 active P1/P2 packets per lane.");
  }
}

export async function setPacketPhase(
  taskId: string,
  input: { phase: TaskPhase; blockedReason?: BlockedReason; commandCenterClose?: boolean },
): Promise<AgentTask> {
  const current = await getTaskById(taskId);
  if (input.phase === "in_progress") {
    const { tasks } = await listTasks({ missionId: current.missionId });
    enforceLaneConcurrency(tasks, current);
  }

  return updateTask(taskId, {
    phase: input.phase,
    blockedReason: input.blockedReason,
    commandCenterClose: input.commandCenterClose ?? input.phase === "done",
  });
}

export async function approvePacket(taskId: string, decision: ApprovalStatus): Promise<AgentTask> {
  const current = await getTaskById(taskId);
  const logEntry = `${toIsoNow()} approval ${decision}`;

  let updated = await updateTask(taskId, {
    approvalRequired: true,
    approvalStatus: decision,
    approvalLog: [...(current.approvalLog ?? []), logEntry],
  });

  if (decision === "approved" && updated.phase === "blocked" && updated.blockedReason === "approval") {
    updated = await updateTask(taskId, { phase: "in_progress", blockedReason: undefined });
  }

  return updated;
}
