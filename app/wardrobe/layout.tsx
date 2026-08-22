import type { Metadata } from 'next'
import '../../docs/asset-generation/preview/red-shell/display.css'

export const metadata: Metadata = {
  title: 'Glowbuds 3D Wardrobe | Museum of Based Art',
  description: 'Dress, animate, and share a custom Glowbud in the Museum of Based Art.',
}

export default function WardrobeLayout({ children }: { children: React.ReactNode }) {
  return children
}
