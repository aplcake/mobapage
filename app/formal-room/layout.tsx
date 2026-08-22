import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Museum of Based Art',
  description: 'Explore the Museum of Based Art, its central atrium, courtyard, and Burn Room.',
}

export const viewport: Viewport = {
  themeColor: '#214844',
  colorScheme: 'dark',
  viewportFit: 'cover',
}

export default function FormalRoomLayout({ children }: { children: React.ReactNode }) {
  return children
}
