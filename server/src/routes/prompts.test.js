import { jest } from '@jest/globals'
import request from 'supertest'

// Mock supabase before importing app
jest.unstable_mockModule('../db/supabase.js', () => ({
  supabase: {
    from: () => ({
      insert: (data) => ({
        select: () => ({
          single: async () => ({ data: { id: 'test-id' }, error: null })
        }),
        then: (resolve) => resolve({ error: null })
      }),
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { code: 'PGRST116' } })
        })
      }),
      update: () => ({
        eq: async () => ({ error: null })
      }),
      upsert: async () => ({ error: null })
    })
  }
}))

const { default: app } = await import('../app.js')

describe('POST /api/prompts', () => {
  test('returns 400 if text is missing', async () => {
    const res = await request(app).post('/api/prompts').send({})
    expect(res.status).toBe(400)
  })

  test('returns 400 if text is empty', async () => {
    const res = await request(app).post('/api/prompts').send({ text: '   ' })
    expect(res.status).toBe(400)
  })

  test('returns 201 with xp data on valid prompt', async () => {
    const res = await request(app)
      .post('/api/prompts')
      .send({ text: 'Hello world this is a test prompt with enough words to earn XP here now', cpm: 50, cpmDuration: 15 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('totalXP')
    expect(res.body).toHaveProperty('promptId')
    expect(res.body).toHaveProperty('wordCount')
    expect(res.body.wordCount).toBe(15)
  })
})
