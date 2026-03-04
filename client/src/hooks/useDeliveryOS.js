import { useCallback, useEffect, useState } from 'react'

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const detailMessage = payload?.details
      ? payload.details.map((item) => item.message).join(' ')
      : ''
    const message = [payload?.error || 'Request failed.', detailMessage].filter(Boolean).join(' ')
    throw new Error(message)
  }

  return payload
}

export function useDeliveryOS(enabled = true) {
  const [dashboard, setDashboard] = useState(null)
  const [leads, setLeads] = useState([])
  const [followups, setFollowups] = useState([])
  const [dailyEvidence, setDailyEvidence] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    const data = await requestJson('/api/os/dashboard')
    setDashboard(data)
    return data
  }, [])

  const fetchLeads = useCallback(async () => {
    const data = await requestJson('/api/os/leads')
    setLeads(data)
    return data
  }, [])

  const fetchFollowups = useCallback(async () => {
    const data = await requestJson('/api/os/followups?status=pending')
    setFollowups(data)
    return data
  }, [])

  const fetchDailyEvidence = useCallback(async () => {
    const data = await requestJson('/api/os/daily-evidence?limit=10')
    setDailyEvidence(data)
    return data
  }, [])

  const refetchAll = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError('')
    try {
      await Promise.all([
        fetchDashboard(),
        fetchLeads(),
        fetchFollowups(),
        fetchDailyEvidence(),
      ])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, fetchDashboard, fetchDailyEvidence, fetchFollowups, fetchLeads])

  useEffect(() => {
    refetchAll()
  }, [refetchAll])

  const runMutation = useCallback(async (operation) => {
    setIsSaving(true)
    setError('')
    try {
      const result = await operation()
      await Promise.all([fetchDashboard(), fetchLeads(), fetchFollowups(), fetchDailyEvidence()])
      return result
    } catch (mutationError) {
      setError(mutationError.message)
      throw mutationError
    } finally {
      setIsSaving(false)
    }
  }, [fetchDashboard, fetchDailyEvidence, fetchFollowups, fetchLeads])

  const createLead = useCallback((payload) => {
    return runMutation(() => requestJson('/api/os/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }))
  }, [runMutation])

  const updateLeadStage = useCallback((leadId, stage) => {
    return runMutation(() => requestJson(`/api/os/leads/${leadId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }))
  }, [runMutation])

  const createConversation = useCallback((payload) => {
    return runMutation(() => requestJson('/api/os/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }))
  }, [runMutation])

  const createFollowup = useCallback((payload) => {
    return runMutation(() => requestJson('/api/os/followups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }))
  }, [runMutation])

  const updateFollowup = useCallback((followupId, payload) => {
    return runMutation(() => requestJson(`/api/os/followups/${followupId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }))
  }, [runMutation])

  const createDailyEvidence = useCallback((payload) => {
    return runMutation(() => requestJson('/api/os/daily-evidence', {
      method: 'POST',
      body: JSON.stringify(payload),
    }))
  }, [runMutation])

  return {
    dashboard,
    leads,
    followups,
    dailyEvidence,
    isLoading,
    isSaving,
    error,
    refetchAll,
    createLead,
    updateLeadStage,
    createConversation,
    createFollowup,
    updateFollowup,
    createDailyEvidence,
  }
}
