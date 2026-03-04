import { LaneDefinition, LaneId } from "@/lib/types";

export const APP_NAME = "Capture v2";

export const LANES: LaneDefinition[] = [
  { id: "sales", name: "Sales Batch Prep", purpose: "Prospecting and booking pipeline", ownerHint: "sales-agent" },
  { id: "delivery", name: "Delivery Readiness", purpose: "Onboarding and fulfillment readiness", ownerHint: "delivery-agent" },
  { id: "runtime", name: "Runtime Health", purpose: "Core system uptime and incidents", ownerHint: "runtime-agent" },
  { id: "content", name: "Content Ops", purpose: "Messaging, writing, and assets", ownerHint: "content-agent" },
  { id: "ops", name: "Ops Backbone", purpose: "Process consistency and runbooks", ownerHint: "ops-agent" },
  { id: "automation", name: "Automation", purpose: "Workflow and integrations", ownerHint: "automation-agent" },
  { id: "qa", name: "QA Guard", purpose: "Checks and acceptance quality", ownerHint: "qa-agent" },
  { id: "insights", name: "Insights", purpose: "Reporting, analytics, and feedback", ownerHint: "insights-agent" },
];

export const LANE_MAP: Record<LaneId, LaneDefinition> = LANES.reduce(
  (acc, lane) => {
    acc[lane.id] = lane;
    return acc;
  },
  {} as Record<LaneId, LaneDefinition>,
);

export const LINEAR_ENV = {
  apiKey: process.env.LINEAR_API_KEY,
  teamKey: process.env.LINEAR_DEFAULT_TEAM,
};

export const SUPABASE_ENV = {
  url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export const METRICS_POLL_MS = 15_000;
export const AGENTS_POLL_MS = 30_000;

export const DONE_REQUIREMENTS = {
  minEvidenceItems: 1,
  blockedEscalationMinutes: 30,
};
