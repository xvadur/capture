import { NextResponse } from "next/server";
import { LANES } from "@/lib/config";
import { buildLaneLoad, listTasks } from "@/lib/linear";
import { listMissionControlAgents, missionControlEnabled } from "@/lib/mission-control/client";
import { AgentsResponse, LaneStatus } from "@/lib/types";

export async function GET() {
  try {
    if (missionControlEnabled()) {
      try {
        const data = await listMissionControlAgents();
        return NextResponse.json(data);
      } catch (error) {
        const fallback = await listTasks({ includeSla: true });
        const lanes: LaneStatus[] = LANES.map((lane) => {
          const laneTasks = fallback.tasks.filter((task) => task.laneId === lane.id);
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
          ...fallback,
          source: "linear-fallback",
          degraded: true,
          fallbackReason: error instanceof Error ? error.message : "mission-control-unavailable",
          laneLoad: buildLaneLoad(fallback.tasks),
        };

        return NextResponse.json(response);
      }
    }

    const { tasks, summary, missionSummary, throughput, slaBreaches, approvalQueue } = await listTasks({ includeSla: true });

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
      source: "linear-fallback",
      degraded: false,
      missionSummary,
      throughput,
      slaBreaches,
      approvalQueue,
      laneLoad: buildLaneLoad(tasks),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load agents" },
      { status: 500 },
    );
  }
}
