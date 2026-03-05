import { LaneId, TaskPhase } from "@/lib/types";

export type DataSourceTag = "mission-control" | "linear-fallback";

export interface MissionControlPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface MissionControlBoard {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  updated_at?: string;
}

export interface MissionControlTask {
  id: string;
  board_id: string;
  title: string;
  description?: string | null;
  status: "inbox" | "in_progress" | "review" | "done";
  priority?: string | null;
  due_at?: string | null;
  assigned_agent_id?: string | null;
  depends_on_task_ids?: string[];
  blocked_by_task_ids?: string[];
  is_blocked?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: Array<{ id: string; name?: string | null }>;
}

export interface MissionControlAgent {
  id: string;
  board_id?: string | null;
  name: string;
  status?: string | null;
  is_board_lead?: boolean;
  openclaw_session_id?: string | null;
  last_seen_at?: string | null;
  updated_at?: string;
}

export interface MissionControlPendingApproval {
  id?: string;
  task_id?: string;
  status?: string;
  created_at?: string;
}

export interface MissionControlDashboardKpis {
  active_agents: number;
  tasks_in_progress: number;
  inbox_tasks: number;
  in_progress_tasks: number;
  review_tasks: number;
  done_tasks: number;
  error_rate_pct?: number;
  median_cycle_time_hours_7d?: number | null;
}

export interface MissionControlDashboardMetrics {
  range: string;
  generated_at: string;
  kpis: MissionControlDashboardKpis;
  pending_approvals?: {
    total: number;
    items: MissionControlPendingApproval[];
  };
}

export interface MissionControlRawSnapshot {
  boards: MissionControlBoard[];
  tasks: MissionControlTask[];
  agents: MissionControlAgent[];
  dashboard: MissionControlDashboardMetrics;
}

export interface MissionControlTaskView {
  id: string;
  laneId: LaneId;
  phase: TaskPhase;
  blockedReason?: "dependency";
  updatedAt: string;
  title: string;
}
