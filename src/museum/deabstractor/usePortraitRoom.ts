'use client'
import { useSyncExternalStore } from 'react'

const query = '(max-width: 900px) and (orientation: portrait)'
const read = () => window.matchMedia(query).matches
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
export const usePortraitRoom = () => useSyncExternalStore(subscribe, read, () => false)
