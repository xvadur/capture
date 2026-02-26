import { useState, useRef, useCallback } from 'react'

export function computeMetrics(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const charCount = text.length
  const avgWordLength = wordCount > 0
    ? parseFloat((words.reduce((s, w) => s + w.length, 0) / wordCount).toFixed(2))
    : 0
  return { wordCount, charCount, avgWordLength }
}

export function useTypingMetrics() {
  const [cpm, setCpm] = useState(0)
  const [cpmDuration, setCpmDuration] = useState(0)
  const typingStart = useRef(null)
  const charsAtStart = useRef(0)
  const lastText = useRef('')
  const pauseTimer = useRef(null)
  const cpmInterval = useRef(null)

  const onTextChange = useCallback((text) => {
    lastText.current = text

    if (pauseTimer.current) clearTimeout(pauseTimer.current)

    if (!typingStart.current) {
      typingStart.current = Date.now()
      charsAtStart.current = text.length

      cpmInterval.current = setInterval(() => {
        const elapsed = Date.now() - typingStart.current
        const elapsedMin = elapsed / 60000
        const charsTyped = lastText.current.length - charsAtStart.current
        if (elapsedMin > 0) {
          setCpm(Math.round(Math.max(0, charsTyped) / elapsedMin))
          setCpmDuration(Math.round(elapsed / 1000))
        }
      }, 1000)
    }

    pauseTimer.current = setTimeout(() => {
      if (cpmInterval.current) clearInterval(cpmInterval.current)
      typingStart.current = null
    }, 3000)
  }, [])

  const reset = useCallback(() => {
    setCpm(0)
    setCpmDuration(0)
    typingStart.current = null
    lastText.current = ''
    if (pauseTimer.current) clearTimeout(pauseTimer.current)
    if (cpmInterval.current) clearInterval(cpmInterval.current)
  }, [])

  return { cpm, cpmDuration, onTextChange, reset }
}
