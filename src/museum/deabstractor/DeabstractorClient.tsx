'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { ApparatusLoading } from './ApparatusLoading'
import './typography.css'

const DeabstractorExperience = dynamic(() => import('./DeabstractorExperience'), {
  ssr: false,
  loading: () => <ApparatusLoading />,
})
const Live = dynamic(() => import('./DeabstractorLive'), { ssr: false, loading: () => <ApparatusLoading live /> })

export function DeabstractorClient({ demo = false }: { demo?: boolean }) {
  useEffect(() => {
    // Redirects return in a separate window, before the visitor opens the wallet desk.
    if (new URLSearchParams(window.location.search).has('privy_cross_app_type')) {
      void import('@privy-io/cross-app-connect').then(sdk => sdk.completeCrossAppConnectRedirect())
    }
  }, [])
  return <div data-deabstractor-room="">{demo ? <DeabstractorExperience /> : <Live />}</div>
}
