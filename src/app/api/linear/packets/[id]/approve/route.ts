import { NextResponse } from "next/server";
import { z } from "zod";
import { approvePacket } from "@/lib/linear";
import { APPROVAL_STATUSES } from "@/lib/types";

const approveSchema = z.object({
  decision: z.enum(APPROVAL_STATUSES),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = approveSchema.parse(await request.json());
    const task = await approvePacket(id, payload.decision);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply approval decision" },
      { status: 500 },
    );
  }
}
