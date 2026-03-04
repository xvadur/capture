export const TASK_PHASES = ["queued", "in_progress", "blocked", "done"] as const;
export type TaskPhase = (typeof TASK_PHASES)[number];

export const BLOCKED_REASONS = ["human", "dependency", "data", "tech", "approval"] as const;
export type BlockedReason = (typeof BLOCKED_REASONS)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type LaneId =
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
}

export interface AgentsResponse extends LinearTasksResponse {
  lanes: LaneStatus[];
}

export interface CreateTaskInput {
  title: string;
  laneId: LaneId;
  owner?: string;
  payload?: string;
  approvalRequired?: boolean;
  dodChecklist?: string[];
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
