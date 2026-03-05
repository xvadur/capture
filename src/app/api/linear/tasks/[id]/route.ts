import { NextResponse } from "next/server";
import { z } from "zod";
import { updateTask } from "@/lib/linear";
import { APPROVAL_STATUSES, BLOCKED_REASONS, TASK_PHASES } from "@/lib/types";

const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  owner: z.string().trim().max(120).optional(),
  phase: z.enum(TASK_PHASES).optional(),
  commandCenterClose: z.boolean().optional(),
  blockedReason: z.enum(BLOCKED_REASONS).optional(),
  approvalRequired: z.boolean().optional(),
  approvalStatus: z.enum(APPROVAL_STATUSES).optional(),
  dodChecklist: z.array(z.string().max(300)).optional(),
  evidence: z.array(z.string().max(400)).optional(),
  approvalLog: z.array(z.string().max(400)).optional(),
  payloadAppend: z.string().max(20_000).optional(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = updateTaskSchema.parse(await request.json());
    const task = await updateTask(id, payload);

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update task" },
      { status: 500 },
    );
  }
}
