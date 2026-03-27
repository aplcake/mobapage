'use client'

import { useEffect, useRef } from 'react'

// Pixel color palette for blinking background
const BLINK_COLORS = [
  '#f5c518', '#0052ff', '#4488ff', '#c49a12',
  '#ffffff', '#8844ff', '#ff4488', '#44ffcc',
]

export default function Home() {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = bgRef.current
    if (!container) return

    const COLS = 40
    const ROWS = 28
    const total = COLS * ROWS

    container.style.display = 'grid'
    container.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`
    container.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`

    for (let i = 0; i < total; i++) {
      const px = document.createElement('div')
      const color = BLINK_COLORS[Math.floor(Math.random() * BLINK_COLORS.length)]
      const duration = (2 + Math.random() * 6).toFixed(2)
      const delay = (Math.random() * 8).toFixed(2)
      const bright = (0.4 + Math.random() * 0.6).toFixed(2)

      px.className = 'px'
      px.style.setProperty('--d', `${duration}s`)
      px.style.setProperty('--delay', `${delay}s`)
      px.style.setProperty('--bright', bright)
      px.style.background = color
      container.appendChild(px)
    }
  }, [])

  return (
    <>
      {/* Blinking pixel background */}
      <div className="pixel-bg">
        <div ref={bgRef} className="pixel-grid" />
      </div>

      {/* Stars layer */}
      <svg className="stars" viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 80 }, (_, i) => {
          const x = ((i * 179 + 37) % 1440)
          const y = ((i * 113 + 71) % 900)
          const r = i % 5 === 0 ? 2 : 1
          return (
            <rect
              key={i}
              x={x} y={y} width={r * 2} height={r * 2}
              fill="white"
              opacity={0.2 + (i % 7) * 0.1}
              style={{
                animation: `blink ${2 + (i % 4)}s ${(i * 0.3) % 6}s infinite`
              }}
            />
          )
        })}
      </svg>

      {/* Social icons — top left */}
      <div className="socials">
        <a href="https://x.com/MoBAonchain" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Twitter / X">
          <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
          </svg>
        </a>
        <a href="https://discord.gg/xnFR5Gr56U" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Discord">
          <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
      </div>

      {/* Main scene */}
      <main className="scene">
        {/* Title */}
        <h1 className="title">MUSEUM OF BASED</h1>

        {/* ART button — directly under title */}
        <button className="btn-art" onClick={() => window.location.href = '/art'}>
          ART
        </button>

        {/* Pixel Art Colosseum */}
        <div className="colosseum-wrap">
          <ColosseumSVG />
        </div>

        {/* Tagline below colosseum */}
        <p className="tagline">-BASED ART ON CHAIN-</p>
      </main>

      {/* Overlays */}
      <div className="vignette" />
      <div className="scanlines" />
    </>
  )
}

function ColosseumSVG() {
  // Pixel art Colosseum — drawn on an 8px grid, 176 × 96 units (scaled to SVG viewport)
  // Each "pixel" = 1 SVG unit. Viewbox 176×96, rendered responsively.
  return (
    <svg
      viewBox="0 0 176 96"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', display: 'block' }}
      shapeRendering="crispEdges"
    >
      <defs>
        <style>{`
          @keyframes torchFlicker {
            0%,100% { opacity:1; }
            33% { opacity:0.5; }
            66% { opacity:0.8; }
          }
          @keyframes moonGlow {
            0%,100% { opacity:0.9; }
            50% { opacity:1; }
          }
          .torch { animation: torchFlicker 0.9s infinite; }
          .torch2 { animation: torchFlicker 1.1s 0.3s infinite; }
          .torch3 { animation: torchFlicker 0.8s 0.6s infinite; }
          .moon { animation: moonGlow 4s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* ── SKY ── */}
      <rect x="0" y="0" width="176" height="64" fill="#0d0520" />

      {/* Moon */}
      <rect className="moon" x="148" y="6" width="12" height="12" fill="#f5f0c8" opacity="0.95" />
      <rect x="150" y="6" width="8" height="2" fill="#0d0520" opacity="0.15" />

      {/* Stars scattered */}
      {[
        [8,4],[20,8],[34,3],[50,6],[65,2],[80,7],[95,3],[110,5],[128,8],[140,3],
        [14,14],[28,11],[44,15],[58,9],[72,13],[86,11],[100,14],[118,9],[135,12],
        [5,20],[22,18],[38,22],[55,17],[70,21],[90,18],[106,22],[122,16],[145,19],
      ].map(([x,y], i) => (
        <rect key={i} x={x} y={y} width="2" height="2" fill="white"
          opacity={0.25 + (i % 4) * 0.12}
          style={{ animation: `blink ${2+(i%3)}s ${(i*0.7)%5}s infinite` }}
        />
      ))}

      {/* ── GROUND ── */}
      <rect x="0" y="80" width="176" height="16" fill="#1a1208" />
      <rect x="0" y="80" width="176" height="2" fill="#2a1f0e" />

      {/* ── COLOSSEUM BASE PLATFORM ── */}
      {/* Bottom plinth */}
      <rect x="10" y="76" width="156" height="6" fill="#5a4e38" />
      <rect x="10" y="76" width="156" height="2" fill="#7a6a50" />
      <rect x="10" y="80" width="156" height="2" fill="#3a2e1e" />

      {/* ── MAIN WALLS — GROUND FLOOR ── */}
      {/* Outer wall ground level — left curve */}
      <rect x="10" y="54" width="8" height="24" fill="#8a7a5e" />
      <rect x="10" y="54" width="2" height="24" fill="#6a5c42" />
      <rect x="16" y="54" width="2" height="24" fill="#a09070" />

      {/* Outer wall ground level — right curve */}
      <rect x="158" y="54" width="8" height="24" fill="#8a7a5e" />
      <rect x="164" y="54" width="2" height="24" fill="#6a5c42" />
      <rect x="158" y="54" width="2" height="24" fill="#a09070" />

      {/* Ground floor facade — center span */}
      <rect x="18" y="54" width="140" height="24" fill="#8a7a5e" />

      {/* Ground floor arches — 8 arches */}
      {[22, 36, 50, 64, 78, 92, 106, 120].map((x, i) => (
        <g key={i}>
          {/* Arch surround */}
          <rect x={x} y="56" width="12" height="20" fill="#3a2e1e" />
          {/* Arch top (2-pixel radius pixel-art arch) */}
          <rect x={x+2} y="54" width="8" height="4" fill="#3a2e1e" />
          <rect x={x+1} y="55" width="10" height="2" fill="#3a2e1e" />
          {/* Arch keystone highlight */}
          <rect x={x+5} y="54" width="2" height="2" fill="#c0a870" />
          {/* Arch inner shadow */}
          <rect x={x+1} y="57" width="10" height="18" fill="#1e1608" />
          {/* Arch inner glow (torchlight) */}
          <rect x={x+2} y="70" width="8" height="4" fill="#3d2a08" opacity="0.6" />
        </g>
      ))}

      {/* Ground floor cornice */}
      <rect x="10" y="52" width="156" height="4" fill="#6a5c42" />
      <rect x="10" y="52" width="156" height="2" fill="#9a8a68" />

      {/* ── SECOND FLOOR ── */}
      <rect x="12" y="36" width="152" height="18" fill="#7a6a50" />
      <rect x="12" y="36" width="2" height="18" fill="#5a4c36" />
      <rect x="162" y="36" width="2" height="18" fill="#5a4c36" />

      {/* Second floor arches — 7 arches */}
      {[24, 38, 52, 66, 80, 94, 108, 122].map((x, i) => (
        <g key={i}>
          <rect x={x} y="38" width="11" height="14" fill="#2e2410" />
          <rect x={x+2} y="36" width="7" height="4" fill="#2e2410" />
          <rect x={x+1} y="37" width="9" height="2" fill="#2e2410" />
          <rect x={x+4} y="36" width="3" height="2" fill="#b09868" />
          <rect x={x+1} y="39" width="9" height="12" fill="#170f04" />
        </g>
      ))}

      {/* Second floor cornice */}
      <rect x="12" y="34" width="152" height="4" fill="#5a4c36" />
      <rect x="12" y="34" width="152" height="2" fill="#8a7a5a" />

      {/* ── THIRD FLOOR / ATTIC ── */}
      <rect x="16" y="22" width="144" height="14" fill="#6a5c42" />
      <rect x="16" y="22" width="2" height="14" fill="#4a3e2a" />
      <rect x="158" y="22" width="2" height="14" fill="#4a3e2a" />

      {/* Attic windows — smaller, more frequent */}
      {[20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150].map((x, i) => (
        <g key={i}>
          <rect x={x} y="24" width="7" height="10" fill="#1a1208" />
          <rect x={x+1} y="23" width="5" height="3" fill="#1a1208" />
          <rect x={x+2} y="23" width="3" height="2" fill="#8a7458" />
        </g>
      ))}

      {/* Attic top edge / parapet */}
      <rect x="16" y="20" width="144" height="4" fill="#4a3e2a" />
      <rect x="16" y="20" width="144" height="2" fill="#7a6a50" />

      {/* ── PARAPET MERLONS (battlements) ── */}
      {Array.from({ length: 18 }, (_, i) => (
        <rect key={i} x={18 + i * 8} y="16" width="4" height="6" fill="#5a4c36" />
      ))}
      {Array.from({ length: 18 }, (_, i) => (
        <rect key={i} x={18 + i * 8} y="16" width="4" height="2" fill="#7a6a50" />
      ))}

      {/* ── TORCHES ── */}
      {/* Left side */}
      <g className="torch">
        <rect x="20" y="48" width="2" height="4" fill="#8a6030" />
        <rect x="19" y="44" width="4" height="4" fill="#ff8800" />
        <rect x="20" y="43" width="2" height="2" fill="#ffcc00" />
        <rect x="19" y="46" width="4" height="2" fill="#ff4400" opacity="0.7" />
      </g>
      {/* Middle left */}
      <g className="torch2">
        <rect x="76" y="48" width="2" height="4" fill="#8a6030" />
        <rect x="75" y="44" width="4" height="4" fill="#ff8800" />
        <rect x="76" y="43" width="2" height="2" fill="#ffcc00" />
        <rect x="75" y="46" width="4" height="2" fill="#ff4400" opacity="0.7" />
      </g>
      {/* Middle right */}
      <g className="torch3">
        <rect x="98" y="48" width="2" height="4" fill="#8a6030" />
        <rect x="97" y="44" width="4" height="4" fill="#ff8800" />
        <rect x="98" y="43" width="2" height="2" fill="#ffcc00" />
        <rect x="97" y="46" width="4" height="2" fill="#ff4400" opacity="0.7" />
      </g>
      {/* Right side */}
      <g className="torch">
        <rect x="152" y="48" width="2" height="4" fill="#8a6030" />
        <rect x="151" y="44" width="4" height="4" fill="#ff8800" />
        <rect x="152" y="43" width="2" height="2" fill="#ffcc00" />
        <rect x="151" y="46" width="4" height="2" fill="#ff4400" opacity="0.7" />
      </g>

      {/* ── ENTRANCE GATE (center) ── */}
      <rect x="78" y="60" width="20" height="18" fill="#1e1608" />
      <rect x="80" y="58" width="16" height="4" fill="#1e1608" />
      <rect x="82" y="57" width="12" height="3" fill="#1e1608" />
      <rect x="84" y="56" width="8" height="3" fill="#1e1608" />
      {/* Gate keystone */}
      <rect x="87" y="56" width="4" height="2" fill="#d4b060" />
      {/* Gate door frame */}
      <rect x="80" y="60" width="2" height="18" fill="#4a3e2a" />
      <rect x="94" y="60" width="2" height="18" fill="#4a3e2a" />
      {/* Gate inner - torch lit */}
      <rect x="82" y="62" width="12" height="14" fill="#120d04" />
      <rect x="84" y="72" width="8" height="4" fill="#2a1a04" opacity="0.8" />

      {/* ── BASE SHADOW ── */}
      <rect x="10" y="82" width="156" height="2" fill="#0a0800" opacity="0.5" />

      {/* ── FOREGROUND FLAGS (decorative) ── */}
      <rect x="14" y="14" width="2" height="8" fill="#8a7a5e" />
      <rect x="14" y="14" width="6" height="4" fill="#0052ff" />
      <rect x="160" y="14" width="2" height="8" fill="#8a7a5e" />
      <rect x="154" y="14" width="6" height="4" fill="#f5c518" />
    </svg>
  )
}
