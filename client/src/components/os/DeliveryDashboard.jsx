import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { MessageCircle, Phone, Signal, Users, Wallet, ClockAlert } from 'lucide-react'

const metricConfig = [
  { key: 'leadsContacted', label: 'Leads Contacted', icon: Users, color: 'text-cyan-300' },
  { key: 'replies', label: 'Replies', icon: MessageCircle, color: 'text-emerald-300' },
  { key: 'callsBooked', label: 'Calls Booked', icon: Phone, color: 'text-indigo-300' },
  { key: 'pilotsActive', label: 'Pilots Active', icon: Signal, color: 'text-amber-300' },
  { key: 'pipelineValue', label: 'Pipeline Value', icon: Wallet, color: 'text-fuchsia-300' },
  { key: 'unresolvedFollowups', label: 'Unresolved Followups', icon: ClockAlert, color: 'text-rose-300' },
]

function formatMetricValue(key, value) {
  if (key === 'pipelineValue') return `$${Number(value || 0).toLocaleString()}`
  return Number(value || 0).toLocaleString()
}

function PriorityRow({ item }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${item.is_overdue ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-100">{item.title}</p>
        <Badge variant={item.is_overdue ? 'destructive' : 'secondary'}>
          {item.is_overdue ? 'Overdue' : item.priority}
        </Badge>
      </div>
      <p className="text-xs text-zinc-500 mt-1">Due: {item.due_at ? new Date(item.due_at).toLocaleString() : 'No due date'}</p>
    </div>
  )
}

export function DeliveryDashboard({ dashboard, isLoading }) {
  const metrics = dashboard?.metrics || {}
  const priorities = dashboard?.priorities || []

  return (
    <div className="space-y-4">
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {metricConfig.map((metric) => (
          <Card key={metric.key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">{metric.label}</span>
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
              </div>
              <div className="text-2xl font-mono font-semibold text-zinc-100">
                {isLoading && !dashboard ? '...' : formatMetricValue(metric.key, metrics[metric.key])}
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Today Priorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {priorities.length === 0 && (
            <p className="text-sm text-zinc-500">No pending followups. Inbox is clear.</p>
          )}
          {priorities.map((item) => (
            <PriorityRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
