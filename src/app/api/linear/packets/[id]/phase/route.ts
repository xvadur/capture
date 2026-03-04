import { NextResponse } from "next/server";
import { z } from "zod";
import { setPacketPhase } from "@/lib/linear";
import { BLOCKED_REASONS, TASK_PHASES } from "@/lib/types";

const phaseSchema = z.object({
  phase: z.enum(TASK_PHASES),
  blockedReason: z.enum(BLOCKED_REASONS).optional(),
  commandCenterClose: z.boolean().optional(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = phaseSchema.parse(await request.json());
    if (payload.phase === "blocked" && !payload.blockedReason) {
      return NextResponse.json({ error: "blockedReason is required when phase is blocked" }, { status: 400 });
    }

    const task = await setPacketPhase(id, payload);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update packet phase" },
      { status: 500 },
    );
  }
}
