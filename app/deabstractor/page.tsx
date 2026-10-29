import type { Metadata } from 'next'
import { DeabstractorClient } from '../../src/museum/deabstractor/DeabstractorClient'

export const metadata: Metadata = {
  title: 'The De-Abstractor 3000 | Glowbuds',
  description: 'A thoroughly unnecessary amount of machinery. A very important little bud.',
  icons: { icon: '/deabstractor/glowbud-968.png' },
}

export default async function DeabstractorPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  return <DeabstractorClient demo={(await searchParams).demo === '1'} />
}
