import { Card } from "@/components/ui/card";
import { CaptureEntry } from "@/lib/types";

export function TodayCaptures({ entries }: { entries: CaptureEntry[] }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Captures</h3>
        <span className="text-xs text-slate-500">{entries.length} in rolling 24h</span>
      </div>

      <div className="max-h-64 space-y-2 overflow-auto pr-2">
        {entries.length ? (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-[var(--line)] bg-white p-3">
              <div className="mb-1 text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
              <p className="line-clamp-2 text-sm text-slate-700">{entry.content}</p>
              <div className="mt-2 text-xs text-slate-500">{entry.wordCount} words</div>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No captures yet in this 24h window.</p>
        )}
      </div>
    </Card>
  );
}
