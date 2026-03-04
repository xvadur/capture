"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { countCharsNoSpaces, countWords } from "@/lib/utils";

type TypingSample = {
  timestamp: number;
  words: number;
  charsNoSpaces: number;
  bulkEdit: boolean;
};

type AppStateValue = {
  draft: string;
  draftWords: number;
  draftCharsNoSpaces: number;
  liveWordsPerMinute: number;
  liveCharsPerMinute: number;
  updateDraft: (value: string) => void;
  resetDraft: () => void;
};

const WINDOW_MS = 20_000;
const MIN_WINDOW_SECONDS = 5;
const MAX_CHARS_DELTA_PER_TYPED_SAMPLE = 8;
const MAX_LIVE_WPM = 220;
const MAX_LIVE_CPM = 1200;

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState("");
  const [samples, setSamples] = useState<TypingSample[]>([]);

  const updateDraft = useCallback((value: string) => {
    const now = Date.now();
    const words = countWords(value);
    const charsNoSpaces = countCharsNoSpaces(value);

    setDraft(value);
    setSamples((current) => {
      const last = current[current.length - 1];
      const charsDelta = last ? Math.abs(charsNoSpaces - last.charsNoSpaces) : 0;
      const bulkEdit = charsDelta > MAX_CHARS_DELTA_PER_TYPED_SAMPLE;
      const next = [...current, { timestamp: now, words, charsNoSpaces, bulkEdit }].filter(
        (sample) => now - sample.timestamp <= WINDOW_MS,
      );
      return next.slice(-40);
    });
  }, []);

  const resetDraft = useCallback(() => {
    setDraft("");
    setSamples([]);
  }, []);

  const value = useMemo<AppStateValue>(() => {
    const draftWords = countWords(draft);
    const draftCharsNoSpaces = countCharsNoSpaces(draft);

    const typedSamples = samples.filter((sample) => !sample.bulkEdit);
    let liveWordsPerMinute = 0;
    let liveCharsPerMinute = 0;
    if (typedSamples.length >= 2) {
      const first = typedSamples[0];
      const last = typedSamples[typedSamples.length - 1];
      const deltaWords = Math.max(0, last.words - first.words);
      const deltaChars = Math.max(0, last.charsNoSpaces - first.charsNoSpaces);
      const deltaSeconds = Math.max(1, (last.timestamp - first.timestamp) / 1000);
      if (deltaSeconds >= MIN_WINDOW_SECONDS) {
        liveWordsPerMinute = Math.min(MAX_LIVE_WPM, Math.round((deltaWords / deltaSeconds) * 60));
        liveCharsPerMinute = Math.min(MAX_LIVE_CPM, Math.round((deltaChars / deltaSeconds) * 60));
      }
    }

    return {
      draft,
      draftWords,
      draftCharsNoSpaces,
      liveWordsPerMinute,
      liveCharsPerMinute,
      updateDraft,
      resetDraft,
    };
  }, [draft, samples, updateDraft, resetDraft]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider.");
  }
  return context;
}
