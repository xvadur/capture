function createTone(frequency, duration, type = 'sine') {
  return {
    play() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = type
        osc.frequency.value = frequency
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + duration)
      } catch (e) {
        // Audio not available
      }
    }
  }
}

export const sounds = {
  send: createTone(880, 0.15),
  speedBoost: createTone(660, 0.2, 'triangle'),
  levelUp: createTone(1047, 0.4),
  streak: createTone(523, 0.5, 'triangle'),
}
