'use client'

import dynamic from 'next/dynamic'
import { ApparatusLoading } from './ApparatusLoading'
import './typography.css'

const DeabstractorExperience = dynamic(() => import('./DeabstractorExperience'), {
  ssr: false,
  loading: () => <ApparatusLoading />,
})
const Live = dynamic(() => import('./DeabstractorLive'), { ssr: false, loading: () => <ApparatusLoading live /> })

export function DeabstractorClient({ demo = false }: { demo?: boolean }) {
  return demo ? <DeabstractorExperience /> : <Live />
}
