import { LaneDefinition, LaneId } from "@/lib/types";

export const APP_NAME = "Capture v2";

export const LANES: LaneDefinition[] = [
  {
    id: "command_center",
    name: "Command Center",
    purpose: "Mission routing, priority lock, and escalation control",
    ownerHint: "agent_orchestrator",
  },
  {
    id: "sales_outreach",
    name: "Sales Outreach",
    purpose: "Outbound pipeline, follow-ups, and reservation flow",
    ownerHint: "agent_sales_outreach",
  },
  {
    id: "client_delivery",
    name: "Client Delivery",
    purpose: "Execution milestones, QA loops, and go-live readiness",
    ownerHint: "agent_client_delivery",
  },
  {
    id: "ai_recepcia",
    name: "AI Recepcia",
    purpose: "Proof capture and measurable evidence artifacts",
    ownerHint: "agent_ai_recepcia",
  },
  {
    id: "content_media",
    name: "Content Media",
    purpose: "Evidence-linked content production and repurposing",
    ownerHint: "agent_content_media",
  },
  {
    id: "system_devops",
    name: "System DevOps",
    purpose: "Runtime diagnostics, mitigation, rollback readiness",
    ownerHint: "agent_system_devops",
  },
  {
    id: "finance_ops",
    name: "Finance Ops",
    purpose: "Runway tracking, spend control, and unit-risk checks",
    ownerHint: "agent_finance_ops",
  },
  {
    id: "research_intel",
    name: "Research Intel",
    purpose: "Signals, positioning briefs, and decision support",
    ownerHint: "agent_research_intel",
  },
  {
    id: "voice_builder",
    name: "Voice Builder",
    purpose: "Voice template design and acceptance packet specs",
    ownerHint: "agent_voice_builder",
  },
  {
    id: "voice_ops",
    name: "Voice Ops",
    purpose: "Voice runtime integration and validation evidence",
    ownerHint: "agent_voice_ops",
  },
  {
    id: "biz_admin",
    name: "Biz Admin",
    purpose: "Legal/admin/compliance execution and deadline control",
    ownerHint: "agent_biz_admin",
  },
];

export const LEGACY_LANE_ALIASES: Partial<Record<LaneId, LaneId>> = {
  sales: "sales_outreach",
  delivery: "client_delivery",
  runtime: "system_devops",
  content: "content_media",
  ops: "command_center",
  automation: "system_devops",
  qa: "client_delivery",
  insights: "research_intel",
};

export const LANE_MAP: Partial<Record<LaneId, LaneDefinition>> = LANES.reduce(
  (acc, lane) => {
    acc[lane.id] = lane;
    return acc;
  },
  {} as Partial<Record<LaneId, LaneDefinition>>,
);

export const LINEAR_ENV = {
  apiKey: process.env.LINEAR_API_KEY,
  teamKey: process.env.LINEAR_DEFAULT_TEAM,
};

function envBool(value: string | undefined, fallback = false): boolean {
  if (!value) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function envNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const SUPABASE_ENV = {
  url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export const MISSION_CONTROL_ENV = {
  enabled: envBool(process.env.MISSION_CONTROL_ENABLED, false),
  baseUrl: process.env.MISSION_CONTROL_BASE_URL,
  token: process.env.MISSION_CONTROL_TOKEN,
  timeoutMs: envNumber(process.env.MISSION_CONTROL_TIMEOUT_MS, 8_000),
};

export const METRICS_POLL_MS = 15_000;
export const AGENTS_POLL_MS = 30_000;

export const DONE_REQUIREMENTS = {
  minEvidenceItems: 1,
  blockedEscalationMinutes: 30,
};
