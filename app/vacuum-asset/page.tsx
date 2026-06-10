'use client'

import dynamic from 'next/dynamic'

const VacuumAssetInspect = dynamic(
  () => import('../../src/vacuum/VacuumAssetInspect').then((module) => module.VacuumAssetInspect),
  { ssr: false },
)

export default function Page() {
  return <VacuumAssetInspect />
}
