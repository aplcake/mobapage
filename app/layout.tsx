import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Museum Of Based Art',
  description: 'The onchain museum of based art. Culture preserved on Base.',
  openGraph: {
    title: 'Museum Of Based Art',
    description: 'The onchain museum of based art.',
    url: 'https://museumofbased.art',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
