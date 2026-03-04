import { jest } from '@jest/globals'
import request from 'supertest'

const now = Date.now()

const mockData = {
  conversations: [
    { id: 'c1', direction: 'outbound', replied: true, call_booked: true, created_at: new Date(now - 30 * 60 * 1000).toISOString() },
    { id: 'c2', direction: 'outbound', replied: false, call_booked: false, created_at: new Date(now - 90 * 60 * 1000).toISOString() },
    { id: 'c3', direction: 'inbound', replied: true, call_booked: false, created_at: new Date(now - 45 * 60 * 1000).toISOString() },
    { id: 'c4', direction: 'outbound', replied: true, call_booked: true, created_at: new Date(now - 30 * 60 * 60 * 1000).toISOString() },
  ],
  pilots: [
    { id: 'p1', status: 'active' },
    { id: 'p2', status: 'proposed' },
  ],
  leads: [
    { id: 'l1', stage: 'lead_opened', estimated_value: 1200 },
    { id: 'l2', stage: 'pilot_active', estimated_value: 800 },
    { id: 'l3', stage: 'retained', estimated_value: 500 },
  ],
  followups: [
    { id: 'f1', lead_id: 'l1', title: 'Call back lead', due_at: new Date(now - 60 * 60 * 1000).toISOString(), priority: 'high', status: 'pending' },
    { id: 'f2', lead_id: 'l2', title: 'Send proposal', due_at: new Date(now + 60 * 60 * 1000).toISOString(), priority: 'medium', status: 'pending' },
    { id: 'f3', lead_id: 'l3', title: 'Archived', due_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(), priority: 'low', status: 'completed' },
  ],
}

function toComparable(value) {
  if (value === null || value === undefined) return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0

  const timestamp = Date.parse(value)
  if (!Number.isNaN(timestamp) && typeof value === 'string') {
    return timestamp
  }

  return value
}

class QueryBuilder {
  constructor(rows) {
    this.rows = rows
    this.filters = []
    this.sort = null
    this.maxRows = null
    this.countOnly = false
  }

  select(_columns, options = {}) {
    if (options.count === 'exact' && options.head === true) {
      this.countOnly = true
    }
    return this
  }

  eq(field, value) {
    this.filters.push((row) => row[field] === value)
    return this
  }

  in(field, values) {
    this.filters.push((row) => values.includes(row[field]))
    return this
  }

  gte(field, value) {
    this.filters.push((row) => toComparable(row[field]) >= toComparable(value))
    return this
  }

  lte(field, value) {
    this.filters.push((row) => toComparable(row[field]) <= toComparable(value))
    return this
  }

  order(field, { ascending = true } = {}) {
    this.sort = { field, ascending }
    return this
  }

  limit(value) {
    this.maxRows = value
    return this
  }

  execute() {
    let result = [...this.rows]
    for (const filter of this.filters) result = result.filter(filter)

    if (this.sort) {
      const { field, ascending } = this.sort
      const factor = ascending ? 1 : -1
      result.sort((a, b) => {
        const left = toComparable(a[field])
        const right = toComparable(b[field])
        if (left === right) return 0
        return left > right ? factor : -factor
      })
    }

    if (typeof this.maxRows === 'number') {
      result = result.slice(0, this.maxRows)
    }

    if (this.countOnly) return { count: result.length, error: null }
    return { data: result, error: null }
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }
}

jest.unstable_mockModule('../db/supabase.js', () => ({
  supabase: {
    from: (table) => new QueryBuilder(mockData[table] || []),
  },
}))

const { default: app } = await import('../app.js')

describe('Delivery OS routes', () => {
  test('blocks done conversation without next-step and reminder', async () => {
    const res = await request(app)
      .post('/api/os/conversations')
      .send({ lead_id: 'l1', status: 'done', summary: 'Wrapped call' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed. Fix the fields and retry.')
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'next_step' }),
        expect.objectContaining({ field: 'reminder_at' }),
      ]),
    )
  })

  test('returns dashboard metrics and prioritized followups', async () => {
    const res = await request(app).get('/api/os/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.metrics).toMatchObject({
      leadsContacted: 2,
      replies: 2,
      callsBooked: 1,
      pilotsActive: 1,
      pipelineValue: 2000,
      unresolvedFollowups: 2,
    })
    expect(Array.isArray(res.body.priorities)).toBe(true)
    expect(res.body.priorities[0]).toHaveProperty('is_overdue', true)
  })
})
