'use client'

import dynamic from 'next/dynamic'

const ExperimentLab = dynamic(() => import('../../src/experiment/ExperimentLab').then((m) => m.ExperimentLab), {
  ssr: false,
})

export default function ExperimentLabPage() {
  return <ExperimentLab />
}
