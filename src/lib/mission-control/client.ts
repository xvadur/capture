import { MISSION_CONTROL_ENV } from "@/lib/config";
import { AgentsResponse, LaneId, LinearTasksResponse } from "@/lib/types";
import {
  MissionControlAgent,
  MissionControlBoard,
  MissionControlDashboardMetrics,
  MissionControlPage,
  MissionControlRawSnapshot,
  MissionControlTask,
} from "@/lib/mission-control/types";
import { mapMissionControlToAgentsResponse, mapMissionControlToTasksResponse } from "@/lib/mission-control/mappers";

const API_PREFIX = "/api/v1";

function withTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MISSION_CONTROL_ENV.token) {
    headers.Authorization = `Bearer ${MISSION_CONTROL_ENV.token}`;
  }
  return headers;
}

function baseUrl(): string {
  if (!MISSION_CONTROL_ENV.baseUrl) {
    throw new Error("MISSION_CONTROL_BASE_URL is missing");
  }
  return MISSION_CONTROL_ENV.baseUrl.replace(/\/+$/, "");
}

async function missionControlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? withTimeoutSignal(MISSION_CONTROL_ENV.timeoutMs),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Mission control request failed (${response.status}) ${body.slice(0, 220)}`.trim());
  }

  return (await response.json()) as T;
}

async function checkAuthBootstrap(): Promise<void> {
  await missionControlFetch(`${API_PREFIX}/auth/bootstrap`, { method: "POST" });
}

async function listBoards(limit = 100): Promise<MissionControlBoard[]> {
  const response = await missionControlFetch<MissionControlPage<MissionControlBoard>>(`${API_PREFIX}/boards?limit=${limit}&offset=0`);
  return response.items ?? [];
}

async function listAgents(limit = 200): Promise<MissionControlAgent[]> {
  const response = await missionControlFetch<MissionControlPage<MissionControlAgent>>(`${API_PREFIX}/agents?limit=${limit}&offset=0`);
  return response.items ?? [];
}

async function listBoardTasks(boardId: string, limit = 200): Promise<MissionControlTask[]> {
  const encoded = encodeURIComponent(boardId);
  const response = await missionControlFetch<MissionControlPage<MissionControlTask>>(
    `${API_PREFIX}/boards/${encoded}/tasks?limit=${limit}&offset=0`,
  );
  return response.items ?? [];
}

async function dashboardMetrics(): Promise<MissionControlDashboardMetrics> {
  return missionControlFetch<MissionControlDashboardMetrics>(`${API_PREFIX}/metrics/dashboard?range=24h`);
}

function applyLaneFilter(response: LinearTasksResponse, laneId?: LaneId): LinearTasksResponse {
  if (!laneId) {
    return response;
  }

  const tasks = response.tasks.filter((task) => task.laneId === laneId);
  return {
    ...response,
    tasks,
    summary: {
      ...response.summary,
      total: tasks.length,
      byPhase: {
        queued: tasks.filter((task) => task.phase === "queued").length,
        in_progress: tasks.filter((task) => task.phase === "in_progress").length,
        blocked: tasks.filter((task) => task.phase === "blocked").length,
        done: tasks.filter((task) => task.phase === "done").length,
      },
      blockedByReason: tasks.reduce((acc, task) => {
        if (task.blockedReason) {
          acc[task.blockedReason] = (acc[task.blockedReason] ?? 0) + 1;
        }
        return acc;
      }, {} as LinearTasksResponse["summary"]["blockedByReason"]),
      blockersOlderThan30m: tasks.filter((task) => task.phase === "blocked").length,
    },
  };
}

function applyMissionFilter(response: LinearTasksResponse, missionId?: string): LinearTasksResponse {
  if (!missionId) {
    return response;
  }
  const tasks = response.tasks.filter((task) => task.missionId === missionId || task.packetId === missionId);
  return {
    ...response,
    tasks,
    summary: {
      ...response.summary,
      total: tasks.length,
      byPhase: {
        queued: tasks.filter((task) => task.phase === "queued").length,
        in_progress: tasks.filter((task) => task.phase === "in_progress").length,
        blocked: tasks.filter((task) => task.phase === "blocked").length,
        done: tasks.filter((task) => task.phase === "done").length,
      },
      blockedByReason: tasks.reduce((acc, task) => {
        if (task.blockedReason) {
          acc[task.blockedReason] = (acc[task.blockedReason] ?? 0) + 1;
        }
        return acc;
      }, {} as LinearTasksResponse["summary"]["blockedByReason"]),
      blockersOlderThan30m: tasks.filter((task) => task.phase === "blocked").length,
    },
  };
}

async function loadSnapshot(): Promise<MissionControlRawSnapshot> {
  await checkAuthBootstrap();

  const [boards, agents, dashboard] = await Promise.all([listBoards(), listAgents(), dashboardMetrics()]);
  const taskChunks = await Promise.all(boards.map((board) => listBoardTasks(board.id)));
  const tasks = taskChunks.flat();

  return {
    boards,
    agents,
    tasks,
    dashboard,
  };
}

export function missionControlEnabled(): boolean {
  return MISSION_CONTROL_ENV.enabled;
}

export async function listMissionControlTasks(options?: {
  missionId?: string;
  laneId?: LaneId;
  includeSla?: boolean;
}): Promise<LinearTasksResponse> {
  const snapshot = await loadSnapshot();
  let response = mapMissionControlToTasksResponse(snapshot);
  response = applyMissionFilter(response, options?.missionId);
  response = applyLaneFilter(response, options?.laneId);

  if (!options?.includeSla) {
    response.slaBreaches = [];
  }

  return response;
}

export async function listMissionControlAgents(): Promise<AgentsResponse> {
  const snapshot = await loadSnapshot();
  return mapMissionControlToAgentsResponse(snapshot);
}
