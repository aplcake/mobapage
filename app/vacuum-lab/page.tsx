'use client'

import dynamic from 'next/dynamic'

const VacuumLab = dynamic(() => import('../../src/vacuum/VacuumLab').then((m) => m.VacuumLab), {
  ssr: false,
})

export default function VacuumLabPage() {
  return <VacuumLab />
}
