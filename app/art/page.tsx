'use client'
import Link from 'next/link'

export default function ArtPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Press Start 2P', monospace",
      color: '#f5c518',
      gap: '32px',
      padding: '24px',
      textAlign: 'center',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      <h1 style={{ fontSize: 'clamp(12px, 2.5vw, 28px)', lineHeight: 2, textShadow: '0 0 20px #f5c518' }}>
        COMING SOON
      </h1>
      <p style={{ fontSize: 'clamp(8px, 1.2vw, 14px)', color: '#4488ff', lineHeight: 2 }}>
        THE GALLERY IS BEING CURATED
      </p>
      <Link href="/" style={{
        color: '#0a0a0f',
        background: '#f5c518',
        padding: '12px 32px',
        textDecoration: 'none',
        fontSize: 'clamp(8px, 1.2vw, 14px)',
        boxShadow: '4px 4px 0 #7a6a00',
      }}>← BACK</Link>
    </div>
  )
}
