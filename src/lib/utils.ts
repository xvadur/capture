import { BLOCKED_REASONS, TaskPhase, TASK_PHASES } from "@/lib/types";

export function countWords(value: string): number {
  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function countChars(value: string): number {
  return value.length;
}

export function countCharsNoSpaces(value: string): number {
  return value.replace(/\s+/g, "").length;
}

export function average(value: number, divisor: number): number {
  if (divisor <= 0) {
    return 0;
  }
  return Number((value / divisor).toFixed(2));
}

export function isTaskPhase(value: unknown): value is TaskPhase {
  return typeof value === "string" && (TASK_PHASES as readonly string[]).includes(value);
}

export function isBlockedReason(value: unknown): value is (typeof BLOCKED_REASONS)[number] {
  return typeof value === "string" && (BLOCKED_REASONS as readonly string[]).includes(value);
}

export function humanizePhase(phase: TaskPhase): string {
  if (phase === "in_progress") {
    return "In Progress";
  }
  return phase[0].toUpperCase() + phase.slice(1);
}

export function safeJsonParse<T>(input: string | undefined, fallback: T): T {
  if (!input) {
    return fallback;
  }

  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export function toIsoNow(): string {
  return new Date().toISOString();
}

export function minutesSince(isoDate: string): number {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return (Date.now() - parsed) / 60_000;
}

export function clampToInt(value: number, min = 0): number {
  return Math.max(min, Math.round(value));
}
