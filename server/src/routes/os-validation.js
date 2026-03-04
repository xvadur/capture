export const PIPELINE_STAGES = [
  'lead_opened',
  'fit_confirmed',
  'pilot_proposed',
  'pilot_active',
  'retained',
]

export const CONVERSATION_STATUSES = ['active', 'awaiting_reply', 'done']
export const FOLLOWUP_STATUSES = ['pending', 'completed', 'canceled']
export const FOLLOWUP_PRIORITIES = ['low', 'medium', 'high']

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function isValidDateTime(value) {
  if (!hasValue(value)) return false
  const timestamp = Date.parse(value)
  return !Number.isNaN(timestamp)
}

function normalizeNullableText(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized.length ? normalized : null
}

export function validateStage(stage, field = 'stage') {
  if (!PIPELINE_STAGES.includes(stage)) {
    return {
      field,
      message: `Invalid ${field}. Use one of: ${PIPELINE_STAGES.join(', ')}.`,
    }
  }
  return null
}

export function validateConversationPayload(payload = {}) {
  const errors = []
  const normalized = {}

  if ('stage' in payload) {
    const stageError = validateStage(payload.stage, 'stage')
    if (stageError) errors.push(stageError)
    else normalized.stage = payload.stage
  }

  if ('status' in payload) {
    if (!CONVERSATION_STATUSES.includes(payload.status)) {
      errors.push({
        field: 'status',
        message: `Invalid status. Use one of: ${CONVERSATION_STATUSES.join(', ')}.`,
      })
    } else {
      normalized.status = payload.status
    }
  }

  if ('channel' in payload) {
    normalized.channel = normalizeNullableText(payload.channel)
  }

  if ('direction' in payload) {
    const direction = normalizeNullableText(payload.direction)
    if (direction && !['outbound', 'inbound', 'internal'].includes(direction)) {
      errors.push({
        field: 'direction',
        message: 'Invalid direction. Use outbound, inbound, or internal.',
      })
    } else {
      normalized.direction = direction || 'outbound'
    }
  }

  if ('summary' in payload) normalized.summary = normalizeNullableText(payload.summary)
  if ('next_step' in payload) normalized.next_step = normalizeNullableText(payload.next_step)

  if ('reminder_at' in payload) {
    if (!hasValue(payload.reminder_at)) {
      normalized.reminder_at = null
    } else if (!isValidDateTime(payload.reminder_at)) {
      errors.push({
        field: 'reminder_at',
        message: 'Invalid reminder_at. Provide an ISO datetime (example: 2026-03-05T09:30:00Z).',
      })
    } else {
      normalized.reminder_at = new Date(payload.reminder_at).toISOString()
    }
  }

  if ('call_booked' in payload) normalized.call_booked = Boolean(payload.call_booked)
  if ('replied' in payload) normalized.replied = Boolean(payload.replied)

  const status = normalized.status ?? payload.status
  const nextStep = normalized.next_step ?? payload.next_step
  const reminderAt = normalized.reminder_at ?? payload.reminder_at

  if (status === 'done') {
    if (!hasValue(nextStep)) {
      errors.push({
        field: 'next_step',
        message: 'Cannot mark conversation as done without next_step. Add the concrete next action.',
      })
    }
    if (!hasValue(reminderAt)) {
      errors.push({
        field: 'reminder_at',
        message: 'Cannot mark conversation as done without reminder_at. Schedule the next-step reminder.',
      })
    }
  }

  return { errors, normalized }
}

export function validateFollowupStatus(status) {
  if (!FOLLOWUP_STATUSES.includes(status)) {
    return {
      field: 'status',
      message: `Invalid status. Use one of: ${FOLLOWUP_STATUSES.join(', ')}.`,
    }
  }
  return null
}

export function validateFollowupPriority(priority) {
  if (!FOLLOWUP_PRIORITIES.includes(priority)) {
    return {
      field: 'priority',
      message: `Invalid priority. Use one of: ${FOLLOWUP_PRIORITIES.join(', ')}.`,
    }
  }
  return null
}

export function validateDateField(value, field) {
  if (!isValidDateTime(value)) {
    return {
      field,
      message: `Invalid ${field}. Provide an ISO datetime (example: 2026-03-05T09:30:00Z).`,
    }
  }
  return null
}
