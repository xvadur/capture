"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { countCharsNoSpaces, countWords } from "@/lib/utils";

type TypingSample = { timestamp: number; words: number };

type AppStateValue = {
  draft: string;
  draftWords: number;
  draftCharsNoSpaces: number;
  liveWordsPerMinute: number;
  updateDraft: (value: string) => void;
  resetDraft: () => void;
};

const WINDOW_MS = 20_000;

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState("");
  const [samples, setSamples] = useState<TypingSample[]>([]);

  const updateDraft = useCallback((value: string) => {
    const now = Date.now();
    const words = countWords(value);

    setDraft(value);
    setSamples((current) => {
      const next = [...current, { timestamp: now, words }].filter(
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

    let liveWordsPerMinute = 0;
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const deltaWords = Math.max(0, last.words - first.words);
      const deltaSeconds = Math.max(1, (last.timestamp - first.timestamp) / 1000);
      if (deltaSeconds >= 3) {
        liveWordsPerMinute = Math.round((deltaWords / deltaSeconds) * 60);
      }
    }

    return {
      draft,
      draftWords,
      draftCharsNoSpaces,
      liveWordsPerMinute,
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
