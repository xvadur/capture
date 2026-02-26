import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Zap, Keyboard } from 'lucide-react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { computeMetrics, useTypingMetrics } from '../hooks/useTypingMetrics'

const SPEED_THRESHOLDS = [
  { min: 70, label: '1.5x', variant: 'purple' },
  { min: 60, label: '1.4x', variant: 'blue' },
  { min: 45, label: '1.2x', variant: 'success' },
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

  // Preview XP calculation (mirrors server logic)
  const baseXP = metrics.wordCount < 10 ? 0 : Math.min(Math.round((metrics.wordCount / 5000) * 100), 100)
  const lengthBonus = Math.round(metrics.avgWordLength * 2)
  let speedMultiplier = 1.0
  if (cpmDuration > 10) {
    if (cpm >= 70) speedMultiplier = 1.5
    else if (cpm >= 60) speedMultiplier = 1.4
    else if (cpm >= 45) speedMultiplier = 1.2
  }
  const previewXP = metrics.wordCount < 10 ? 0 : Math.round((baseXP + lengthBonus) * speedMultiplier)

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
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <Keyboard className="w-4 h-4" />
            <span className="text-xs font-medium">Prompt Editor</span>
          </div>
          <AnimatePresence>
            {previewXP > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="warning">
                  <Zap className="w-3 h-3 mr-1" />
                  ~{previewXP} XP
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Textarea */}
        <textarea
          className="w-full min-h-[180px] bg-transparent text-zinc-100 text-base resize-y focus:outline-none font-mono leading-relaxed placeholder:text-zinc-600"
          placeholder="Write your prompt here..."
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="font-mono">
            <strong className="text-zinc-300">{metrics.wordCount}</strong> words
          </span>
          <span className="text-zinc-700">|</span>
          <span className="font-mono">
            <strong className="text-zinc-300">{cpm}</strong> chars/min
          </span>
          {cpmDuration > 0 && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="font-mono text-zinc-500">{cpmDuration}s</span>
            </>
          )}
          <AnimatePresence>
            {speedInfo && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
              >
                <Badge variant={speedInfo.variant}>
                  {speedInfo.label} boost
                </Badge>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
          className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold disabled:opacity-30 transition-colors hover:bg-white"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Send className="w-3.5 h-3.5" />
          {isLoading ? 'Sending...' : 'Send'}
        </motion.button>
      </div>
    </Card>
  )
}
