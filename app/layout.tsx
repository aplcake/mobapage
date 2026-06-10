import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Museum Of Based Art',
  description: 'The onchain museum of based art. Culture preserved on Base.',
  openGraph: {
    title: 'Museum Of Based Art',
    description: 'The onchain museum of based art.',
    url: 'https://museumofbased.art',
  },
  twitter: {
    card: 'summary',
    title: 'Museum Of Based Art',
    description: 'The onchain museum of based art.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
