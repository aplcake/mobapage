import { durationFor, MECHANICAL_TIMING as M, printerTiming, smoothRange, type Procedure } from './sequence'

// Lighting follows scene time, never wall time: pause, replay and skip stay exact.
export function galleryLightingPose(elapsed: number, procedure: Procedure, reducedMotion = false, holdTime = 0) {
  const t = Math.max(0, Math.min(durationFor(procedure), elapsed))
  const timing = printerTiming(procedure)
  const warning = procedure === 'evacuation'
    ? smoothRange(t, 0.8, 3.5) * (1 - smoothRange(t, M.arrival, timing.contact - 0.2)) : 0
  const clearance = smoothRange(t, timing.feedEnd - 0.45, Math.min(durationFor(procedure), timing.clear + 0.4))
  const focus = smoothRange(t, timing.start - 0.5, timing.start + 0.25)
    * (1 - smoothRange(t, timing.feedStart + 0.45, Math.min(durationFor(procedure), timing.clear + 0.5)))
  const phase = reducedMotion ? 0 : (Math.max(0, Math.min(t - 0.8, 11)) + Math.max(0, holdTime) * .45) * Math.PI * 0.7
  const variation = reducedMotion ? 0 : Math.sin(phase) * 0.25
  const pressure = procedure === 'evacuation' ? smoothRange(t, 3.2, M.launch) * warning : 0
  // One broad victory swell, after the paper is clear; never a repeating flash.
  const celebration = procedure === 'evacuation' && !reducedMotion
    ? smoothRange(t, timing.clear, timing.clear + 0.55)
      * (1 - smoothRange(t, timing.clear + 0.85, durationFor(procedure))) : 0
  return {
    warning: warning * (reducedMotion ? 0.38 : 1),
    clearance: clearance * (reducedMotion ? 0.5 : 1),
    focus: focus * (reducedMotion ? 0.4 : 1),
    pressure: pressure * (reducedMotion ? 0.25 : 1), celebration,
    phase, left: 0.75 + variation, right: 0.75 - variation,
    sweep: reducedMotion ? 0 : Math.sin(phase * 0.65) * 2.5,
  }
}
