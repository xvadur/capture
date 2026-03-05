import { LaneId } from "@/lib/types";

export const LANE_TEMPLATE_SNIPPETS: Record<LaneId, string> = {
  command_center: "Deliverables: top priorities posted, blockers triaged, checkpoint published.",
  sales_outreach: "Deliverables: lead batch exported, reservation link tested, outreach sequence ready.",
  client_delivery: "Deliverables: onboarding checklist complete, acceptance criteria confirmed, handoff scheduled.",
  ai_recepcia: "Deliverables: baseline captured, delta measured, proof artifact attached.",
  content_media: "Deliverables: draft package complete, claims evidence-linked, publication owner assigned.",
  system_devops: "Deliverables: runtime health checked, mitigation path documented, rollback path confirmed.",
  finance_ops: "Deliverables: runway impact estimated, risk actions listed, owner assigned.",
  research_intel: "Deliverables: signal brief published, action recommendations captured, handoff targets set.",
  voice_builder: "Deliverables: voice template spec complete, QA contract prepared, implementation packet ready.",
  voice_ops: "Deliverables: n8n/voice runtime validated, evidence links attached, rollback notes prepared.",
  biz_admin: "Deliverables: legal/admin checklist updated, deadlines captured, blockers escalated.",
  sales: "Deliverables: lead batch exported, reservation link tested, outreach batch ready.",
  delivery: "Deliverables: onboarding checklist complete, owner assigned, handoff scheduled.",
  runtime: "Deliverables: incident state updated, health checks green, rollback path documented.",
  content: "Deliverables: messaging draft complete, QA pass, publication owner assigned.",
  ops: "Deliverables: SOP updated, dependencies confirmed, due date set.",
  automation: "Deliverables: trigger tested, fallback path documented, monitoring enabled.",
  qa: "Deliverables: acceptance checks executed, blocker list reviewed, evidence attached.",
  insights: "Deliverables: KPI snapshot posted, blocker trends reviewed, next actions captured.",
};
