import { calculateXP } from './xp.js'

describe('calculateXP', () => {
  test('returns 0 for fewer than 10 words', () => {
    expect(calculateXP({ wordCount: 9, avgWordLength: 5, cpm: 0, cpmDuration: 0 })).toEqual({
      baseXP: 0, lengthBonus: 0, speedMultiplier: 1.0, totalXP: 0
    })
  })

  test('returns 100 base XP for 5000+ words', () => {
    const result = calculateXP({ wordCount: 5000, avgWordLength: 5, cpm: 0, cpmDuration: 0 })
    expect(result.baseXP).toBe(100)
  })

  test('scales linearly between 10 and 5000 words', () => {
    const result = calculateXP({ wordCount: 2500, avgWordLength: 5, cpm: 0, cpmDuration: 0 })
    expect(result.baseXP).toBe(50)
  })

  test('length bonus = round(avgWordLength * 2)', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 8, cpm: 0, cpmDuration: 0 })
    expect(result.lengthBonus).toBe(16)
  })

  test('speed multiplier 1.2 for cpm >= 45 sustained > 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 50, cpmDuration: 15 })
    expect(result.speedMultiplier).toBe(1.2)
  })

  test('speed multiplier 1.4 for cpm >= 60 sustained > 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 65, cpmDuration: 15 })
    expect(result.speedMultiplier).toBe(1.4)
  })

  test('speed multiplier 1.5 for cpm >= 70 sustained > 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 75, cpmDuration: 15 })
    expect(result.speedMultiplier).toBe(1.5)
  })

  test('no speed multiplier if duration <= 10s', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 80, cpmDuration: 9 })
    expect(result.speedMultiplier).toBe(1.0)
  })

  test('total XP = round((baseXP + lengthBonus) * speedMultiplier)', () => {
    const result = calculateXP({ wordCount: 100, avgWordLength: 5, cpm: 70, cpmDuration: 15 })
    // baseXP = round(100/5000 * 100) = 2, lengthBonus = 10, multiplier = 1.5
    // total = round((2 + 10) * 1.5) = round(18) = 18
    expect(result.totalXP).toBe(18)
  })

  test('fewer than 10 words returns 0 for everything including length bonus', () => {
    const result = calculateXP({ wordCount: 5, avgWordLength: 10, cpm: 80, cpmDuration: 20 })
    expect(result.totalXP).toBe(0)
    expect(result.baseXP).toBe(0)
    expect(result.lengthBonus).toBe(0)
    expect(result.speedMultiplier).toBe(1.0)
  })
})
