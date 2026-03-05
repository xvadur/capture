"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { useAppState } from "@/components/app-state-provider";
import { Card } from "@/components/ui/card";
import { countWords } from "@/lib/utils";

export function CaptureEditor({ onCaptured }: { onCaptured: () => void }) {
  const { draft, updateDraft, resetDraft, draftWords, draftCharsNoSpaces, liveWordsPerMinute, liveCharsPerMinute } =
    useAppState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");

  const quickReadMinutes = useMemo(() => {
    if (!draftWords) return 0;
    return Number((draftWords / 200).toFixed(1));
  }, [draftWords]);

  async function submitCapture() {
    if (!draft.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Capture save failed");
      }

      resetDraft();
      setStatus("Captured.");
      onCaptured();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Capture failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitCapture();
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const wantsShortcutSubmit =
      (event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter") &&
      (event.metaKey || event.ctrlKey);
    if (!wantsShortcutSubmit || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    if (isSubmitting || !draft.trim()) {
      return;
    }

    void submitCapture();
  }

  return (
    <Card className="space-y-4 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Capture Inbox</h2>
          <p className="text-sm text-slate-500">Write fast. Press Cmd/Ctrl + Enter to capture.</p>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {countWords(draft) > 0 ? `${countWords(draft)} words in draft` : "Ready"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="Capture a thought, idea, insight..."
          className="h-44 w-full resize-y rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400"
        />

        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-5">
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Live WPM</div>
            <div className="text-lg font-semibold text-slate-900">{liveWordsPerMinute}</div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Live CPM</div>
            <div className="text-lg font-semibold text-slate-900">{liveCharsPerMinute}</div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Draft Words</div>
            <div className="text-lg font-semibold text-slate-900">{draftWords}</div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Chars (No Spaces)</div>
            <div className="text-lg font-semibold text-slate-900">{draftCharsNoSpaces}</div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Read Time</div>
            <div className="text-lg font-semibold text-slate-900">{quickReadMinutes}m</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">{status}</div>
          <button
            type="submit"
            disabled={isSubmitting || !draft.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Capturing..." : "Capture"}
          </button>
        </div>
      </form>
    </Card>
  );
}
