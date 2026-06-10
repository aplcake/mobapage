'use client'

import dynamic from 'next/dynamic'

const HomePage = dynamic(() => import('../src/home/HomePage').then((m) => m.HomePage), {
  ssr: false,
})

export default function Page() {
  return <HomePage />
}
