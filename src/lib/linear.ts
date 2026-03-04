import { DONE_REQUIREMENTS, LANE_MAP, LINEAR_ENV } from "@/lib/config";
import { buildTaskSummary, getLocalTasks, upsertLocalTask } from "@/lib/local-store";
import {
  AgentTask,
  ApprovalStatus,
  BLOCKED_REASONS,
  BlockedReason,
  CreateTaskInput,
  LaneId,
  LinearTasksResponse,
  TaskControlMeta,
  TaskPhase,
  UpdateTaskInput,
} from "@/lib/types";
import { isBlockedReason, isTaskPhase, safeJsonParse, toIsoNow } from "@/lib/utils";

const CAPTURE_META_PREFIX = "<!-- CAPTURE_META ";

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

function parseMeta(description: string): TaskControlMeta {
  const metaMatch = description.match(/<!-- CAPTURE_META\s+([\s\S]*?)\s*-->/);

  if (metaMatch?.[1]) {
    const parsed = safeJsonParse<Partial<TaskControlMeta>>(metaMatch[1], {});
    const laneId = parsed.laneId && parsed.laneId in LANE_MAP ? parsed.laneId : "ops";
    const phase: TaskPhase = isTaskPhase(parsed.phase) ? parsed.phase : "queued";
    const blockedReason = isBlockedReason(parsed.blockedReason) ? parsed.blockedReason : undefined;
    const approvalStatus: ApprovalStatus = ["pending", "approved", "rejected"].includes(
      String(parsed.approvalStatus),
    )
      ? (parsed.approvalStatus as ApprovalStatus)
      : "pending";

    return {
      laneId: laneId as LaneId,
      phase,
      blockedReason,
      phaseUpdatedAt: parsed.phaseUpdatedAt ?? toIsoNow(),
      approvalRequired: Boolean(parsed.approvalRequired),
      approvalStatus,
    };
  }

  const control = parseControl(description);
  const laneId = control.lane_id && control.lane_id in LANE_MAP ? (control.lane_id as LaneId) : "ops";
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
): string {
  const checklist = dodChecklist.length
    ? dodChecklist.map((item) => toChecklistLine(item)).join("\n")
    : "- [ ] Define done criteria";

  const evidenceBlock = evidence.length ? evidence.map((item) => `- ${item}`).join("\n") : "- Pending";
  const approvalLogBlock = approvalLog.length ? approvalLog.map((item) => `- ${item}`).join("\n") : "- None";

  const metaLine = `${CAPTURE_META_PREFIX}${JSON.stringify(meta)} -->`;

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
  const checklistItems = parseChecklist(sectionContent(description, "Definition of Done"));
  const evidence = parseBullets(sectionContent(description, "Evidence")).filter((item) => item.toLowerCase() !== "pending");
  const approvalLog = parseBullets(sectionContent(description, "Approval Log")).filter((item) => item.toLowerCase() !== "none");

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    description,
    laneId: meta.laneId,
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

export async function listTasks(): Promise<LinearTasksResponse> {
  if (!hasLinearConfig()) {
    const localTasks = getLocalTasks();
    return { tasks: localTasks, summary: buildTaskSummary(localTasks) };
  }

  try {
    const issues = await listLinearIssues();
    const tasks = issues
      .map(fromLinearIssue)
      .sort((a, b) => Date.parse(b.phaseUpdatedAt) - Date.parse(a.phaseUpdatedAt));

    return {
      tasks,
      summary: buildTaskSummary(tasks),
    };
  } catch {
    const localTasks = getLocalTasks();
    return { tasks: localTasks, summary: buildTaskSummary(localTasks) };
  }
}

export async function createTask(input: CreateTaskInput): Promise<AgentTask> {
  const lane = input.laneId in LANE_MAP ? input.laneId : "ops";
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
  );

  if (!hasLinearConfig()) {
    const localTask: AgentTask = {
      id: `local-${Math.random().toString(16).slice(2, 10)}`,
      identifier: `LOCAL-${Math.floor(Math.random() * 9000) + 1000}`,
      title: input.title,
      description: body,
      laneId: lane,
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
