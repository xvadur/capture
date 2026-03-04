import { BLOCKED_REASONS, TaskPhase, TASK_PHASES } from "@/lib/types";

function stripEdgePunctuation(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function tokenizeNormalizedWords(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\s+/)
    .map((token) => stripEdgePunctuation(token))
    .filter(Boolean);
}

export function countWords(value: string): number {
  return tokenizeNormalizedWords(value).length;
}

export function countChars(value: string): number {
  return value.length;
}

export function countCharsNoSpaces(value: string): number {
  return value.replace(/\s+/g, "").length;
}

export function countSentences(value: string): number {
  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }

  const matches = normalized.match(/[.?!]+/g);
  return matches?.length ?? 0;
}

export function countParagraphs(value: string): number {
  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }

  return normalized.split(/\n\s*\n+/).filter((paragraph) => paragraph.trim().length > 0).length;
}

export function averageWordLength(value: string): number {
  const tokens = tokenizeNormalizedWords(value);
  if (tokens.length === 0) {
    return 0;
  }

  const letters = tokens.reduce((sum, token) => sum + token.length, 0);
  return average(letters, tokens.length);
}

export function lexicalRichnessPct(value: string): number {
  const tokens = tokenizeNormalizedWords(value);
  if (tokens.length === 0) {
    return 0;
  }

  return average(new Set(tokens).size * 100, tokens.length);
}

export function uniqueWordsCount(value: string): number {
  const tokens = tokenizeNormalizedWords(value);
  if (tokens.length === 0) {
    return 0;
  }
  return new Set(tokens).size;
}

export function analyzeCaptureText(value: string) {
  return {
    wordCount: countWords(value),
    charCount: countChars(value),
    charCountNoSpaces: countCharsNoSpaces(value),
    uniqueWordCount: uniqueWordsCount(value),
    lexicalRichnessPct: lexicalRichnessPct(value),
    avgWordLength: averageWordLength(value),
    sentencesCount: countSentences(value),
    paragraphsCount: countParagraphs(value),
  };
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
