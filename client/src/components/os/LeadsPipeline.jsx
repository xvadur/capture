import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'

const stageOptions = [
  'lead_opened',
  'fit_confirmed',
  'pilot_proposed',
  'pilot_active',
  'retained',
]

function stageBadgeVariant(stage) {
  if (stage === 'retained') return 'success'
  if (stage === 'pilot_active') return 'warning'
  if (stage === 'pilot_proposed') return 'blue'
  return 'secondary'
}

export function LeadsPipeline({ leads, onCreateLead, onStageChange, onCreateConversation, isSaving }) {
  const [leadForm, setLeadForm] = useState({
    full_name: '',
    company_name: '',
    estimated_value: '',
  })
  const [conversationForm, setConversationForm] = useState({
    lead_id: '',
    summary: '',
    status: 'active',
    next_step: '',
    reminder_at: '',
  })

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const left = stageOptions.indexOf(a.stage)
      const right = stageOptions.indexOf(b.stage)
      return left - right
    })
  }, [leads])

  async function handleCreateLead(event) {
    event.preventDefault()
    try {
      await onCreateLead({
        full_name: leadForm.full_name,
        company_name: leadForm.company_name || null,
        estimated_value: leadForm.estimated_value ? Number(leadForm.estimated_value) : 0,
      })
      setLeadForm({ full_name: '', company_name: '', estimated_value: '' })
    } catch {
      // Errors are surfaced from useDeliveryOS hook state.
    }
  }

  async function handleCreateConversation(event) {
    event.preventDefault()
    try {
      await onCreateConversation({
        lead_id: conversationForm.lead_id,
        summary: conversationForm.summary,
        status: conversationForm.status,
        next_step: conversationForm.next_step || null,
        reminder_at: conversationForm.reminder_at ? new Date(conversationForm.reminder_at).toISOString() : null,
      })
      setConversationForm({ lead_id: '', summary: '', status: 'active', next_step: '', reminder_at: '' })
    } catch {
      // Errors are surfaced from useDeliveryOS hook state.
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Leads Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4" onSubmit={handleCreateLead}>
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Lead name"
              value={leadForm.full_name}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, full_name: event.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Company"
              value={leadForm.company_name}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, company_name: event.target.value }))}
            />
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Value"
              type="number"
              min="0"
              value={leadForm.estimated_value}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, estimated_value: event.target.value }))}
            />
            <button className="rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold px-3 py-2 disabled:opacity-50" type="submit" disabled={isSaving}>
              Add Lead
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 pr-2">Lead</th>
                  <th className="py-2 pr-2">Company</th>
                  <th className="py-2 pr-2">Value</th>
                  <th className="py-2 pr-2">Stage</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-zinc-900 text-zinc-200">
                    <td className="py-2 pr-2">{lead.full_name}</td>
                    <td className="py-2 pr-2">{lead.company_name || '-'}</td>
                    <td className="py-2 pr-2 font-mono">${Number(lead.estimated_value || 0).toLocaleString()}</td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={stageBadgeVariant(lead.stage)}>{lead.stage}</Badge>
                        <select
                          className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
                          value={lead.stage}
                          onChange={(event) => onStageChange(lead.id, event.target.value)}
                          disabled={isSaving}
                        >
                          {stageOptions.map((stage) => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedLeads.length === 0 && (
              <p className="text-sm text-zinc-500 py-3">No leads yet. Add first lead to start pipeline tracking.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-2" onSubmit={handleCreateConversation}>
            <select
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={conversationForm.lead_id}
              onChange={(event) => setConversationForm((prev) => ({ ...prev, lead_id: event.target.value }))}
              required
            >
              <option value="">Select lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>{lead.full_name}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={conversationForm.status}
              onChange={(event) => setConversationForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="active">active</option>
              <option value="awaiting_reply">awaiting_reply</option>
              <option value="done">done</option>
            </select>
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 md:col-span-2"
              placeholder="Summary"
              value={conversationForm.summary}
              onChange={(event) => setConversationForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Next step"
              value={conversationForm.next_step}
              onChange={(event) => setConversationForm((prev) => ({ ...prev, next_step: event.target.value }))}
            />
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              type="datetime-local"
              value={conversationForm.reminder_at}
              onChange={(event) => setConversationForm((prev) => ({ ...prev, reminder_at: event.target.value }))}
            />
            <button className="rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold px-3 py-2 md:col-span-2 disabled:opacity-50" type="submit" disabled={isSaving}>
              Save Conversation
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
