import { Router } from 'express'
import { supabase } from '../db/supabase.js'
import {
  CONVERSATION_STATUSES,
  FOLLOWUP_PRIORITIES,
  FOLLOWUP_STATUSES,
  PIPELINE_STAGES,
  validateConversationPayload,
  validateDateField,
  validateFollowupPriority,
  validateFollowupStatus,
  validateStage,
} from './os-validation.js'

const router = Router()
const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((stage) => stage !== 'retained')

function validationError(res, details) {
  return res.status(400).json({
    error: 'Validation failed. Fix the fields and retry.',
    details,
  })
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function normalizeNullableText(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized.length ? normalized : null
}

function parseWindow(req, res) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const from = req.query.from ? new Date(req.query.from) : todayStart
  const to = req.query.to ? new Date(req.query.to) : new Date()

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    validationError(res, [{
      field: 'from/to',
      message: 'Invalid from/to date. Use ISO date or datetime query params.',
    }])
    return null
  }

  if (from > to) {
    validationError(res, [{
      field: 'from/to',
      message: 'Invalid date window. "from" must be earlier than or equal to "to".',
    }])
    return null
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

function applyWindow(query, field, window) {
  return query.gte(field, window.from).lte(field, window.to)
}

async function countRows(table, configure = (query) => query) {
  const query = configure(supabase.from(table).select('*', { count: 'exact', head: true }))
  const { count, error } = await query
  if (error) throw error
  return count || 0
}

function sanitizeLeadInput(body = {}, { partial = false } = {}) {
  const errors = []
  const data = {}

  if (!partial || 'full_name' in body) {
    const fullName = normalizeNullableText(body.full_name)
    if (!fullName) {
      errors.push({ field: 'full_name', message: 'full_name is required to create or update a lead.' })
    } else {
      data.full_name = fullName
    }
  }

  const nullableTextFields = ['company_name', 'email', 'phone', 'source', 'notes', 'offer_id']
  for (const field of nullableTextFields) {
    if (field in body) data[field] = normalizeNullableText(body[field])
  }

  if ('stage' in body) {
    const stageError = validateStage(body.stage, 'stage')
    if (stageError) errors.push(stageError)
    else data.stage = body.stage
  }

  if ('estimated_value' in body) {
    const numeric = Number(body.estimated_value)
    if (!Number.isFinite(numeric) || numeric < 0) {
      errors.push({
        field: 'estimated_value',
        message: 'estimated_value must be a non-negative number.',
      })
    } else {
      data.estimated_value = Number(numeric.toFixed(2))
    }
  }

  if ('last_contacted_at' in body) {
    if (!hasValue(body.last_contacted_at)) {
      data.last_contacted_at = null
    } else {
      const dateError = validateDateField(body.last_contacted_at, 'last_contacted_at')
      if (dateError) errors.push(dateError)
      else data.last_contacted_at = new Date(body.last_contacted_at).toISOString()
    }
  }

  return { errors, data }
}

function sanitizeFollowupInput(body = {}, { partial = false } = {}) {
  const errors = []
  const data = {}

  if (!partial || 'lead_id' in body) {
    const leadId = normalizeNullableText(body.lead_id)
    if (!leadId) errors.push({ field: 'lead_id', message: 'lead_id is required for followups.' })
    else data.lead_id = leadId
  }

  if (!partial || 'title' in body) {
    const title = normalizeNullableText(body.title)
    if (!title) errors.push({ field: 'title', message: 'title is required for followups.' })
    else data.title = title
  }

  if (!partial || 'due_at' in body) {
    if (!hasValue(body.due_at)) {
      errors.push({ field: 'due_at', message: 'due_at is required for followups.' })
    } else {
      const dateError = validateDateField(body.due_at, 'due_at')
      if (dateError) errors.push(dateError)
      else data.due_at = new Date(body.due_at).toISOString()
    }
  }

  if ('status' in body) {
    const statusError = validateFollowupStatus(body.status)
    if (statusError) errors.push(statusError)
    else data.status = body.status
  }

  if ('priority' in body) {
    const priorityError = validateFollowupPriority(body.priority)
    if (priorityError) errors.push(priorityError)
    else data.priority = body.priority
  }

  if ('note' in body) data.note = normalizeNullableText(body.note)
  if ('conversation_id' in body) data.conversation_id = normalizeNullableText(body.conversation_id)

  return { errors, data }
}

router.get('/dashboard', async (req, res) => {
  const window = parseWindow(req, res)
  if (!window) return

  try {
    const [leadsContacted, replies, callsBooked, pilotsActive, unresolvedFollowups] = await Promise.all([
      countRows('conversations', (query) => applyWindow(query.eq('direction', 'outbound'), 'created_at', window)),
      countRows('conversations', (query) => applyWindow(query.eq('replied', true), 'created_at', window)),
      countRows('conversations', (query) => applyWindow(query.eq('call_booked', true), 'created_at', window)),
      countRows('pilots', (query) => query.eq('status', 'active')),
      countRows('followups', (query) => query.eq('status', 'pending')),
    ])

    const [{ data: pipelineRows, error: pipelineError }, { data: priorities, error: prioritiesError }] = await Promise.all([
      supabase
        .from('leads')
        .select('estimated_value')
        .in('stage', ACTIVE_PIPELINE_STAGES),
      supabase
        .from('followups')
        .select('id, lead_id, title, due_at, priority, status')
        .eq('status', 'pending')
        .order('due_at', { ascending: true })
        .limit(20),
    ])

    if (pipelineError) return res.status(500).json({ error: pipelineError.message })
    if (prioritiesError) return res.status(500).json({ error: prioritiesError.message })

    const pipelineValue = (pipelineRows || []).reduce((sum, row) => sum + Number(row.estimated_value || 0), 0)
    const now = Date.now()

    res.json({
      window,
      metrics: {
        leadsContacted,
        replies,
        callsBooked,
        pilotsActive,
        pipelineValue: Number(pipelineValue.toFixed(2)),
        unresolvedFollowups,
      },
      priorities: (priorities || []).map((followup) => ({
        ...followup,
        is_overdue: Boolean(followup.due_at && new Date(followup.due_at).getTime() < now),
      })),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/leads', async (req, res) => {
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

  if (req.query.stage) {
    const stageError = validateStage(req.query.stage, 'stage')
    if (stageError) return validationError(res, [stageError])
    query = query.eq('stage', req.query.stage)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/leads', async (req, res) => {
  const { errors, data } = sanitizeLeadInput(req.body)
  if (errors.length) return validationError(res, errors)

  const { data: created, error } = await supabase
    .from('leads')
    .insert(data)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(created)
})

router.patch('/leads/:id', async (req, res) => {
  const { errors, data } = sanitizeLeadInput(req.body, { partial: true })
  if (errors.length) return validationError(res, errors)

  const payload = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(updated)
})

router.patch('/leads/:id/stage', async (req, res) => {
  const stageError = validateStage(req.body.stage, 'stage')
  if (stageError) return validationError(res, [stageError])

  const { data, error } = await supabase
    .from('leads')
    .update({ stage: req.body.stage, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/leads/:id', async (req, res) => {
  const { error } = await supabase.from('leads').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).send()
})

router.get('/conversations', async (req, res) => {
  let query = supabase.from('conversations').select('*').order('created_at', { ascending: false })

  if (req.query.lead_id) query = query.eq('lead_id', req.query.lead_id)
  if (req.query.status) {
    if (!CONVERSATION_STATUSES.includes(req.query.status)) {
      return validationError(res, [{
        field: 'status',
        message: `Invalid status filter. Use one of: ${CONVERSATION_STATUSES.join(', ')}.`,
      }])
    }
    query = query.eq('status', req.query.status)
  }

  if (req.query.stage) {
    const stageError = validateStage(req.query.stage, 'stage')
    if (stageError) return validationError(res, [stageError])
    query = query.eq('stage', req.query.stage)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/conversations', async (req, res) => {
  const leadId = normalizeNullableText(req.body.lead_id)
  if (!leadId) {
    return validationError(res, [{
      field: 'lead_id',
      message: 'lead_id is required to create a conversation.',
    }])
  }

  const { errors, normalized } = validateConversationPayload(req.body)
  if (errors.length) return validationError(res, errors)

  const payload = {
    lead_id: leadId,
    ...normalized,
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert(payload)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.patch('/conversations/:id', async (req, res) => {
  const { errors, normalized } = validateConversationPayload(req.body)
  if (errors.length) return validationError(res, errors)

  const payload = {
    ...normalized,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(payload)
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.patch('/conversations/:id/stage', async (req, res) => {
  const stageError = validateStage(req.body.stage, 'stage')
  if (stageError) return validationError(res, [stageError])

  const { errors, normalized } = validateConversationPayload({
    stage: req.body.stage,
    status: req.body.status,
    next_step: req.body.next_step,
    reminder_at: req.body.reminder_at,
  })
  if (errors.length) return validationError(res, errors)

  const payload = {
    ...normalized,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(payload)
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/conversations/:id', async (req, res) => {
  const { error } = await supabase.from('conversations').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).send()
})

router.get('/followups', async (req, res) => {
  let query = supabase.from('followups').select('*').order('due_at', { ascending: true })

  if (req.query.status) {
    const statusError = validateFollowupStatus(req.query.status)
    if (statusError) return validationError(res, [statusError])
    query = query.eq('status', req.query.status)
  }

  if (req.query.priority) {
    const priorityError = validateFollowupPriority(req.query.priority)
    if (priorityError) return validationError(res, [priorityError])
    query = query.eq('priority', req.query.priority)
  }

  if (req.query.lead_id) query = query.eq('lead_id', req.query.lead_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/followups', async (req, res) => {
  const { errors, data } = sanitizeFollowupInput(req.body)
  if (errors.length) return validationError(res, errors)

  const { data: created, error } = await supabase
    .from('followups')
    .insert(data)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(created)
})

router.patch('/followups/:id', async (req, res) => {
  const { errors, data } = sanitizeFollowupInput(req.body, { partial: true })
  if (errors.length) return validationError(res, errors)

  const payload = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error } = await supabase
    .from('followups')
    .update(payload)
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(updated)
})

router.delete('/followups/:id', async (req, res) => {
  const { error } = await supabase.from('followups').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).send()
})

router.get('/daily-evidence', async (req, res) => {
  const limit = Number(req.query.limit || 20)
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 20

  const { data, error } = await supabase
    .from('daily_evidence')
    .select('*')
    .order('log_date', { ascending: false })
    .limit(safeLimit)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/daily-evidence', async (req, res) => {
  const hardLesson = normalizeNullableText(req.body.hard_lesson)
  const metricName = normalizeNullableText(req.body.metric_name)
  const metricValue = normalizeNullableText(req.body.metric_value)
  const artifactLink = normalizeNullableText(req.body.artifact_link)
  const artifactText = normalizeNullableText(req.body.artifact_text)
  const logDate = req.body.log_date || new Date().toISOString().slice(0, 10)

  const errors = []
  if (!hardLesson) {
    errors.push({
      field: 'hard_lesson',
      message: 'hard_lesson is required. Capture one concrete lesson from execution today.',
    })
  }

  const logDateValue = new Date(logDate)
  if (Number.isNaN(logDateValue.getTime())) {
    errors.push({
      field: 'log_date',
      message: 'Invalid log_date. Use YYYY-MM-DD or ISO datetime.',
    })
  }

  if (errors.length) return validationError(res, errors)

  const payload = {
    log_date: logDateValue.toISOString().slice(0, 10),
    hard_lesson: hardLesson,
    metric_name: metricName,
    metric_value: metricValue,
    artifact_link: artifactLink,
    artifact_text: artifactText,
  }

  const { data, error } = await supabase
    .from('daily_evidence')
    .insert(payload)
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.get('/meta', (req, res) => {
  res.json({
    pipelineStages: PIPELINE_STAGES,
    followupStatuses: FOLLOWUP_STATUSES,
    followupPriorities: FOLLOWUP_PRIORITIES,
    conversationStatuses: CONVERSATION_STATUSES,
  })
})

export default router
