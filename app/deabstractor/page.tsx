import type { Metadata } from 'next'
import { DeabstractorClient } from '../../src/museum/deabstractor/DeabstractorClient'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.museumofbased.art'),
  title: 'De-Abstractor | Museum of Based Art',
  description: 'Step into the Glowbuds departure room at MoBA. Move your buds between wallets on Abstract, or watch the apparatus in action.',
  alternates: { canonical: 'https://www.museumofbased.art/deabstractor' },
  openGraph: {
    title: 'De-Abstractor | Museum of Based Art',
    description: 'All buds aboard. The Glowbuds departure room at MoBA.',
    url: 'https://www.museumofbased.art/deabstractor',
    images: [{ url: '/deabstractor/glowbud-968.png', width: 3200, height: 3200, alt: 'Original Glowbud passenger artwork' }],
  },
  twitter: { card: 'summary', title: 'De-Abstractor | MoBA', description: 'All buds aboard. The Glowbuds departure room at MoBA.' },
}

export default async function DeabstractorPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  return <DeabstractorClient demo={(await searchParams).demo === '1'} />
}
