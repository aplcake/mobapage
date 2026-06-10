'use client'

import { useGameStore } from '../stores/useGameStore'

export function MutePlate() {
  const muted = useGameStore(s => s.muted)
  const setMuted = useGameStore(s => s.setMuted)
  return (
    <button className="mutePlate" onClick={() => setMuted(!muted)} aria-pressed={!muted}>
      {muted ? 'MUTE' : 'SND'}
    </button>
  )
}
