/**
 * Calculate XP earned for a writing session.
 *
 * @param {Object} params
 * @param {number} params.wordCount      - Total words written
 * @param {number} params.avgWordLength   - Average word length in characters
 * @param {number} params.cpm             - Characters per minute (sustained rate)
 * @param {number} params.cpmDuration     - Duration in seconds that CPM was sustained
 * @returns {{ baseXP: number, lengthBonus: number, speedMultiplier: number, totalXP: number }}
 */
export function calculateXP({ wordCount, avgWordLength, cpm, cpmDuration }) {
  // Less than 10 words = nothing
  if (wordCount < 10) {
    return { baseXP: 0, lengthBonus: 0, speedMultiplier: 1.0, totalXP: 0 }
  }

  // Base XP: 0-100 based on word count (linear scale, capped at 100)
  const baseXP = Math.min(Math.round((wordCount / 5000) * 100), 100)

  // Length bonus: longer avg word = more XP
  const lengthBonus = Math.round(avgWordLength * 2)

  // Speed multiplier: only if sustained > 10 seconds
  let speedMultiplier = 1.0
  if (cpmDuration > 10) {
    if (cpm >= 70) speedMultiplier = 1.5
    else if (cpm >= 60) speedMultiplier = 1.4
    else if (cpm >= 45) speedMultiplier = 1.2
  }

  const totalXP = Math.round((baseXP + lengthBonus) * speedMultiplier)

  return { baseXP, lengthBonus, speedMultiplier, totalXP }
}
