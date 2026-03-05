import { NextResponse } from "next/server";
import { z } from "zod";
import { createTask, listTasks } from "@/lib/linear";
import { listMissionControlTasks, missionControlEnabled } from "@/lib/mission-control/client";
import { BLOCKED_REASONS, LaneId, TASK_PHASES } from "@/lib/types";

const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(200),
  laneId: z.string().trim().min(2).max(80),
  owner: z.string().trim().max(120).optional(),
  payload: z.string().max(20_000).optional(),
  approvalRequired: z.boolean().optional(),
  dodChecklist: z.array(z.string().max(300)).optional(),
});

const updatePreviewSchema = z.object({
  phase: z.enum(TASK_PHASES).optional(),
  blockedReason: z.enum(BLOCKED_REASONS).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = (url.searchParams.get("scope") ?? "mission").toLowerCase();
    const missionId = url.searchParams.get("missionId") ?? undefined;
    const laneId = scope === "lane" ? url.searchParams.get("laneId") ?? undefined : undefined;
    const includeSla = ["1", "true", "yes"].includes((url.searchParams.get("includeSla") ?? "").toLowerCase());

    if (missionControlEnabled()) {
      try {
        const mcData = await listMissionControlTasks({ missionId, includeSla, laneId: laneId as LaneId | undefined });
        return NextResponse.json(mcData);
      } catch (error) {
        const fallback = await listTasks({ missionId, includeSla, laneId: laneId as LaneId | undefined });
        return NextResponse.json({
          ...fallback,
          source: "linear-fallback",
          degraded: true,
          fallbackReason: error instanceof Error ? error.message : "mission-control-unavailable",
        });
      }
    }

    const data = await listTasks({ missionId, includeSla, laneId: laneId as LaneId | undefined });
    return NextResponse.json({ ...data, source: "linear-fallback", degraded: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = createTaskSchema.parse(await request.json());
    const task = await createTask({ ...payload, laneId: payload.laneId as LaneId });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Small helper endpoint used by UI to validate phase+blocked reason pair before submitting real update.
    const payload = updatePreviewSchema.parse(await request.json());
    if (payload.phase === "blocked" && !payload.blockedReason) {
      return NextResponse.json(
        { error: `blockedReason is required when phase is blocked (${BLOCKED_REASONS.join("|")})` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
