import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export function DailyEvidenceLogger({ onSubmit, entries, isSaving }) {
  const [form, setForm] = useState({
    hard_lesson: '',
    metric_name: '',
    metric_value: '',
    artifact_link: '',
    artifact_text: '',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      await onSubmit({
        hard_lesson: form.hard_lesson,
        metric_name: form.metric_name || null,
        metric_value: form.metric_value || null,
        artifact_link: form.artifact_link || null,
        artifact_text: form.artifact_text || null,
      })
      setForm({ hard_lesson: '', metric_name: '', metric_value: '', artifact_link: '', artifact_text: '' })
    } catch {
      // Errors are surfaced from useDeliveryOS hook state.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Evidence Logger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form className="space-y-2" onSubmit={handleSubmit}>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Hard lesson from today's execution"
            value={form.hard_lesson}
            onChange={(event) => setForm((prev) => ({ ...prev, hard_lesson: event.target.value }))}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Metric name (example: calls booked)"
              value={form.metric_name}
              onChange={(event) => setForm((prev) => ({ ...prev, metric_name: event.target.value }))}
            />
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Metric value"
              value={form.metric_value}
              onChange={(event) => setForm((prev) => ({ ...prev, metric_value: event.target.value }))}
            />
          </div>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Artifact link"
            value={form.artifact_link}
            onChange={(event) => setForm((prev) => ({ ...prev, artifact_link: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Artifact note"
            value={form.artifact_text}
            onChange={(event) => setForm((prev) => ({ ...prev, artifact_text: event.target.value }))}
          />
          <button className="rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold px-3 py-2 disabled:opacity-50" type="submit" disabled={isSaving}>
            Log Evidence
          </button>
        </form>

        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <p className="text-sm text-zinc-200">{entry.hard_lesson}</p>
              <p className="text-xs text-zinc-500 mt-1">{entry.log_date}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
