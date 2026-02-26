import { useState } from 'react'
import { computeMetrics, useTypingMetrics } from '../hooks/useTypingMetrics'

const SPEED_THRESHOLDS = [
  { min: 70, label: '1.5x', color: 'text-purple-400' },
  { min: 60, label: '1.4x', color: 'text-blue-400' },
  { min: 45, label: '1.2x', color: 'text-green-400' },
]

function getSpeedInfo(cpm, cpmDuration) {
  if (cpmDuration <= 10) return null
  return SPEED_THRESHOLDS.find(t => cpm >= t.min) || null
}

export function PromptEditor({ onSubmit, isLoading }) {
  const [text, setText] = useState('')
  const { cpm, cpmDuration, onTextChange, reset } = useTypingMetrics()

  const metrics = computeMetrics(text)
  const speedInfo = getSpeedInfo(cpm, cpmDuration)

  function handleChange(e) {
    setText(e.target.value)
    onTextChange(e.target.value)
  }

  function handleSubmit() {
    if (!text.trim() || isLoading) return
    onSubmit({ text, cpm, cpmDuration })
    setText('')
    reset()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="w-full min-h-[200px] bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-xl p-4 text-base resize-y focus:outline-none focus:border-zinc-500 font-mono"
        placeholder="Write your prompt here... (Ctrl+Enter to send)"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      <div className="flex items-center gap-4 text-sm text-zinc-400 px-1">
        <span>Words: <strong className="text-zinc-200">{metrics.wordCount}</strong></span>
        <span>Chars/min: <strong className="text-zinc-200">{cpm}</strong></span>
        {cpmDuration > 0 && (
          <span className="text-zinc-500">{cpmDuration}s</span>
        )}
        {speedInfo && (
          <span className={`font-bold ${speedInfo.color}`}>
            {speedInfo.label} speed boost
          </span>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !text.trim()}
        className="self-end px-6 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-semibold hover:bg-white disabled:opacity-40 transition-colors"
      >
        {isLoading ? 'Sending...' : 'Send prompt'}
      </button>
    </div>
  )
}
