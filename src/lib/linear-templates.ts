import { LaneId } from "@/lib/types";

export const LANE_TEMPLATE_SNIPPETS: Record<LaneId, string> = {
  sales: "Deliverables: lead batch exported, reservation link tested, outreach batch ready.",
  delivery: "Deliverables: onboarding checklist complete, owner assigned, handoff scheduled.",
  runtime: "Deliverables: incident state updated, health checks green, rollback path documented.",
  content: "Deliverables: messaging draft complete, QA pass, publication owner assigned.",
  ops: "Deliverables: SOP updated, dependencies confirmed, due date set.",
  automation: "Deliverables: trigger tested, fallback path documented, monitoring enabled.",
  qa: "Deliverables: acceptance checks executed, blocker list reviewed, evidence attached.",
  insights: "Deliverables: KPI snapshot posted, blocker trends reviewed, next actions captured.",
};
