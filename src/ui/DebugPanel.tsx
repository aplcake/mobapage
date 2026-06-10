'use client'

import { useEffect } from 'react'
import { useGameStore } from '../stores/useGameStore'

declare global {
  interface Window {
    __PSYCHEDELIC_SLURPER_STATS__?: {
      tier: ReturnType<typeof useGameStore.getState>['performanceTier']
      stats: ReturnType<typeof useGameStore.getState>['stats']
    }
    __PSYCHEDELIC_SLURPER_CONTROLS__?: {
      setTier: ReturnType<typeof useGameStore.getState>['setPerformanceTier']
    }
  }
}

export function DebugPanel() {
  const debug = useGameStore((state) => state.debug)
  const setDebug = useGameStore((state) => state.setDebug)
  const stats = useGameStore((state) => state.stats)
  const tier = useGameStore((state) => state.performanceTier)
  const setTier = useGameStore((state) => state.setPerformanceTier)

  useEffect(() => {
    window.__PSYCHEDELIC_SLURPER_STATS__ = { tier, stats }
    window.__PSYCHEDELIC_SLURPER_CONTROLS__ = { setTier }
  }, [setTier, stats, tier])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'd') setDebug(!useGameStore.getState().debug)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setDebug])

  if (!debug) {
    return (
      <button className="debugTab" onClick={() => setDebug(true)} aria-label="Open debug panel">
        DBG
      </button>
    )
  }

  return (
    <section className="debugPanel" aria-label="Debug panel">
      <button className="debugClose" onClick={() => setDebug(false)} aria-label="Close debug panel">
        X
      </button>
      <div>FPS {Math.round(stats.fps)}</div>
      <div>SLM {stats.activeSlime}</div>
      <div>PULL {Math.round(stats.affectedSlime)}</div>
      <div>IN {Math.round(stats.inwardPassRate * 100)}%</div>
      <div>SMP {stats.inwardSamples}</div>
      <div>AVG {stats.inwardAverageDistanceDelta.toFixed(3)}</div>
      <div>GULP {stats.gulpedTotal}</div>
      <label>
        TIER
        <select value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}>
          <option value="low">LOW</option>
          <option value="mid">MID</option>
          <option value="high">HIGH</option>
        </select>
      </label>
    </section>
  )
}
