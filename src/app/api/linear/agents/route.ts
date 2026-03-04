import { NextResponse } from "next/server";
import { LANES } from "@/lib/config";
import { listTasks } from "@/lib/linear";
import { AgentsResponse, LaneStatus } from "@/lib/types";

export async function GET() {
  try {
    const { tasks, summary } = await listTasks();

    const lanes: LaneStatus[] = LANES.map((lane) => {
      const laneTasks = tasks.filter((task) => task.laneId === lane.id);
      return {
        lane,
        tasks: laneTasks,
        activeCount: laneTasks.filter((task) => task.phase === "in_progress" || task.phase === "queued").length,
        blockedCount: laneTasks.filter((task) => task.phase === "blocked").length,
        doneCount: laneTasks.filter((task) => task.phase === "done").length,
      };
    });

    const response: AgentsResponse = {
      lanes,
      tasks,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load agents" },
      { status: 500 },
    );
  }
}
