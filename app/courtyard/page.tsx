'use client'

import dynamic from 'next/dynamic'

const LongApproachControlApp = dynamic(
  () => import('../../docs/asset-generation/preview/pogo-orb-v2/control').then((module) => module.App),
  { ssr: false },
)

export default function Page() {
  return <LongApproachControlApp defaultSpawn="museum" polished />
}
