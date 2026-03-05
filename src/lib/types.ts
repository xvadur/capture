export const TASK_PHASES = ["queued", "in_progress", "blocked", "done"] as const;
export type TaskPhase = (typeof TASK_PHASES)[number];

export const BLOCKED_REASONS = ["human", "dependency", "data", "tech", "approval"] as const;
export type BlockedReason = (typeof BLOCKED_REASONS)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type MissionPriority = "P0" | "P1" | "P2";
export type MissionType = "revenue" | "delivery" | "voice" | "biz_admin" | "mixed";
export type MissionStatus = TaskPhase;
export type ApprovalClass = "low" | "medium" | "high";

export type LaneId =
  | "command_center"
  | "sales_outreach"
  | "client_delivery"
  | "ai_recepcia"
  | "content_media"
  | "system_devops"
  | "finance_ops"
  | "research_intel"
  | "voice_builder"
  | "voice_ops"
  | "biz_admin"
  | "sales"
  | "delivery"
  | "runtime"
  | "content"
  | "ops"
  | "automation"
  | "qa"
  | "insights";

export interface LaneDefinition {
  id: LaneId;
  name: string;
  purpose: string;
  ownerHint: string;
}

export interface Mission {
  id: string;
  issueId?: string;
  identifier?: string;
  objective: string;
  context: string;
  deadline: string;
  priority: MissionPriority;
  approvalClass: ApprovalClass;
  successCriteria: string[];
  constraints: string[];
  outputRequired: string;
  status: MissionStatus;
  missionType: MissionType;
  createdAt: string;
}

export interface Packet {
  id: string;
  missionId: string;
  issueId: string;
  identifier?: string;
  laneId: LaneId;
  title: string;
  phase: TaskPhase;
  blockedReason?: BlockedReason;
  approvalRequired: boolean;
  approvalStatus: ApprovalStatus;
  dependencies: string[];
  evidenceCount: number;
  deadline?: string;
}

export interface MissionSummary {
  missionId?: string;
  objective?: string;
  status?: MissionStatus;
  totalPackets: number;
  donePackets: number;
  blockedPackets: number;
  inProgressPackets: number;
  queuedPackets: number;
  approvalPending: number;
}

export interface ThroughputSummary {
  packetsPerDay: number;
  doneRatePct: number;
  meanCycleTimeMinutes: number;
}

export interface SlaSnapshot {
  taskId: string;
  breached: boolean;
  ageMinutes: number;
  thresholdMinutes: number;
  alertedAt?: string;
}

export interface LaneLoad {
  laneId: LaneId;
  p0Active: number;
  p1p2Active: number;
}

export interface CaptureEntry {
  id: string;
  content: string;
  wordCount: number;
  charCount: number;
  charCountNoSpaces: number;
  uniqueWordCount: number;
  lexicalRichnessPct: number;
  avgWordLength: number;
  sentencesCount: number;
  paragraphsCount: number;
  createdAt: string;
}

export interface MetricPoint {
  slot: string;
  words: number;
  chars: number;
}

export interface LinguisticSummary {
  uniqueWords: number;
  richnessPct: number;
  avgWordLength: number;
  sentences: number;
  paragraphs: number;
}

export interface TrendDayPoint {
  day: string;
  words: number;
  uniqueWords: number;
  captures: number;
}

export interface CaptureLatestSnapshot extends LinguisticSummary {
  words24h: number;
  chars24h: number;
  entries24h: number;
  avgWpm24h: number;
  totalCaptures: number;
  avgWordsPerCapture: number;
}

export interface CaptureMetrics {
  words24h: number;
  chars24h: number;
  entries24h: number;
  avgWpm24h: number;
  totalCaptures: number;
  avgWordsPerCapture: number;
  points: MetricPoint[];
  linguistic24h: LinguisticSummary;
  trend30d: TrendDayPoint[];
  latestSnapshot: CaptureLatestSnapshot;
  recentEntries: CaptureEntry[];
}

export interface TaskControlMeta {
  laneId: LaneId;
  phase: TaskPhase;
  phaseUpdatedAt: string;
  blockedReason?: BlockedReason;
  approvalRequired: boolean;
  approvalStatus: ApprovalStatus;
}

export interface AgentTask {
  id: string;
  identifier?: string;
  title: string;
  url?: string;
  description: string;
  laneId: LaneId;
  missionId?: string;
  packetId?: string;
  priority?: MissionPriority;
  deadline?: string;
  dependencies?: string[];
  approvalClass?: ApprovalClass;
  isMissionRoot?: boolean;
  owner?: string;
  phase: TaskPhase;
  phaseUpdatedAt: string;
  blockedReason?: BlockedReason;
  approvalRequired: boolean;
  approvalStatus: ApprovalStatus;
  dodChecklist: string[];
  evidence: string[];
  approvalLog: string[];
  updatedAt?: string;
}

export interface LaneStatus {
  lane: LaneDefinition;
  activeCount: number;
  blockedCount: number;
  doneCount: number;
  tasks: AgentTask[];
}

export interface TaskSummary {
  total: number;
  byPhase: Record<TaskPhase, number>;
  blockedByReason: Partial<Record<BlockedReason, number>>;
  blockersOlderThan30m: number;
}

export interface LinearTasksResponse {
  tasks: AgentTask[];
  summary: TaskSummary;
  source?: "mission-control" | "linear-fallback";
  degraded?: boolean;
  fallbackReason?: string;
  missionSummary?: MissionSummary;
  throughput?: ThroughputSummary;
  slaBreaches?: SlaSnapshot[];
  approvalQueue?: AgentTask[];
}

export interface AgentsResponse extends LinearTasksResponse {
  lanes: LaneStatus[];
  laneLoad?: LaneLoad[];
  currentPacket?: Record<string, string>;
  sla?: {
    breached: number;
    thresholdMinutes: number;
  };
}

export interface CreateTaskInput {
  title: string;
  laneId: LaneId;
  owner?: string;
  payload?: string;
  approvalRequired?: boolean;
  dodChecklist?: string[];
  missionId?: string;
  packetId?: string;
  priority?: MissionPriority;
  deadline?: string;
  dependencies?: string[];
  approvalClass?: ApprovalClass;
  parentId?: string;
  isMissionRoot?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  owner?: string;
  phase?: TaskPhase;
  commandCenterClose?: boolean;
  blockedReason?: BlockedReason;
  approvalRequired?: boolean;
  approvalStatus?: ApprovalStatus;
  dodChecklist?: string[];
  evidence?: string[];
  approvalLog?: string[];
  payloadAppend?: string;
}

export interface MissionIntakeInput {
  missionId: string;
  objective: string;
  context: string;
  deadline: string;
  priority: MissionPriority;
  successCriteria: string[];
  constraints: string[];
  approvalClass: ApprovalClass;
  outputRequired: string;
}

export interface MissionDispatchResponse {
  mission: Mission;
  packets: Packet[];
  dependencyGraph: {
    parallelReady: string[];
    gated: string[];
  };
}
