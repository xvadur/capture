import { NextResponse } from "next/server";
import { z } from "zod";
import { createMission } from "@/lib/linear";

const createMissionSchema = z.object({
  missionId: z.string().trim().min(3).max(80),
  objective: z.string().trim().min(5).max(500),
  context: z.string().trim().min(2).max(2000),
  deadline: z.string().trim().min(5).max(120),
  priority: z.enum(["P0", "P1", "P2"]),
  successCriteria: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
  constraints: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  approvalClass: z.enum(["low", "medium", "high"]),
  outputRequired: z.string().trim().min(2).max(500),
});

export async function POST(request: Request) {
  try {
    const payload = createMissionSchema.parse(await request.json());
    const mission = await createMission(payload);
    return NextResponse.json(mission, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispatch mission" },
      { status: 500 },
    );
  }
}
