import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'

export function FollowupQueue({ followups, leads, onCreateFollowup, onUpdateFollowup, isSaving }) {
  const [form, setForm] = useState({
    lead_id: '',
    title: '',
    due_at: '',
    priority: 'medium',
  })

  const queue = useMemo(() => {
    return [...followups].sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
  }, [followups])

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      await onCreateFollowup({
        lead_id: form.lead_id,
        title: form.title,
        due_at: new Date(form.due_at).toISOString(),
        priority: form.priority,
        status: 'pending',
      })
      setForm({ lead_id: '', title: '', due_at: '', priority: 'medium' })
    } catch {
      // Errors are surfaced from useDeliveryOS hook state.
    }
  }

  const nowTs = new Date().getTime()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-2" onSubmit={handleSubmit}>
          <select
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={form.lead_id}
            onChange={(event) => setForm((prev) => ({ ...prev, lead_id: event.target.value }))}
            required
          >
            <option value="">Lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.full_name}</option>
            ))}
          </select>
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Follow-up title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            type="datetime-local"
            value={form.due_at}
            onChange={(event) => setForm((prev) => ({ ...prev, due_at: event.target.value }))}
            required
          />
          <button className="rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold px-3 py-2 disabled:opacity-50" type="submit" disabled={isSaving}>
            Queue Follow-up
          </button>
        </form>

        <div className="space-y-2">
          {queue.length === 0 && (
            <p className="text-sm text-zinc-500">No pending followups.</p>
          )}
          {queue.map((item) => {
            const isOverdue = new Date(item.due_at).getTime() < nowTs
            const leadName = leads.find((lead) => lead.id === item.lead_id)?.full_name || 'Unknown lead'

            return (
              <div key={item.id} className={`rounded-lg border px-3 py-2 ${isOverdue ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-800 bg-zinc-900/50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-zinc-100">{item.title}</p>
                    <p className="text-xs text-zinc-500">{leadName} • {new Date(item.due_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isOverdue ? 'destructive' : 'secondary'}>{isOverdue ? 'Overdue' : item.priority}</Badge>
                    <button
                      className="rounded-md bg-emerald-500/15 text-emerald-300 text-xs px-2 py-1"
                      onClick={() => onUpdateFollowup(item.id, { status: 'completed' })}
                      disabled={isSaving}
                    >
                      Mark done
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
