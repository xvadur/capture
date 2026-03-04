import { DeliveryDashboard } from './DeliveryDashboard'
import { LeadsPipeline } from './LeadsPipeline'
import { FollowupQueue } from './FollowupQueue'
import { DailyEvidenceLogger } from './DailyEvidenceLogger'

export function DeliveryOSView({
  dashboard,
  leads,
  followups,
  dailyEvidence,
  isLoading,
  isSaving,
  error,
  onRefresh,
  onCreateLead,
  onStageChange,
  onCreateConversation,
  onCreateFollowup,
  onUpdateFollowup,
  onCreateEvidence,
}) {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Singularity Delivery OS</h2>
          <p className="text-sm text-zinc-500">Operational dashboard for outreach, pipeline, and execution evidence.</p>
        </div>
        <button
          className="rounded-lg border border-zinc-700 text-zinc-200 text-sm px-3 py-2 hover:bg-zinc-900"
          onClick={onRefresh}
          disabled={isLoading || isSaving}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <DeliveryDashboard dashboard={dashboard} isLoading={isLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <LeadsPipeline
          leads={leads}
          onCreateLead={onCreateLead}
          onStageChange={onStageChange}
          onCreateConversation={onCreateConversation}
          isSaving={isSaving}
        />
        <div className="space-y-4">
          <FollowupQueue
            followups={followups}
            leads={leads}
            onCreateFollowup={onCreateFollowup}
            onUpdateFollowup={onUpdateFollowup}
            isSaving={isSaving}
          />
          <DailyEvidenceLogger
            onSubmit={onCreateEvidence}
            entries={dailyEvidence}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
