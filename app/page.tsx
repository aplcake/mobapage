'use client'

import dynamic from 'next/dynamic'

const FormalMuseumRoom = dynamic(
  () => import('../src/museum/formal-room/FormalMuseumRoom').then((module) => module.FormalMuseumRoom),
  {
    ssr: false,
    loading: () => (
      <main
        aria-label="Opening the Main Museum"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          background: '#214844',
          color: '#fff0c7',
          font: '900 14px/1 Arial Black, Impact, system-ui, sans-serif',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        Opening the Main Museum…
      </main>
    ),
  },
)

export default function MuseumHomepage() {
  return <FormalMuseumRoom />
}
