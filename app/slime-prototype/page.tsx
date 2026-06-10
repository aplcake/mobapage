'use client'

import dynamic from 'next/dynamic'

const LockedSlimePrototype = dynamic(() => import('../../src/liquid/LockedSlimePrototype').then((m) => m.LockedSlimePrototype), {
  ssr: false,
})

export default function SlimePrototypePage() {
  return <LockedSlimePrototype />
}
