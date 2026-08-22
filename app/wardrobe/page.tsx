'use client'

import dynamic from 'next/dynamic'

const GlowbudDisplayRoom = dynamic(
  () => import('../../docs/asset-generation/preview/red-shell/display').then((module) => module.GlowbudDisplayRoom),
  { ssr: false },
)

export default function WardrobePage() {
  return (
    <div className="museumWardrobeRoute">
      <GlowbudDisplayRoom />
    </div>
  )
}
