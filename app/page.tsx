'use client'

import { useEffect, useRef, useState } from 'react'

const BLINK_COLORS = [
  '#f5c518', '#0052ff', '#4488ff', '#c49a12',
  '#ffffff', '#8844ff', '#ff4488', '#44ffcc',
]

export default function Home() {
  const bgRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = bgRef.current
    if (!container) return

    // Fine grid — 80 cols × 50 rows = small pixels
    const COLS = 80
    const ROWS = 50
    const total = COLS * ROWS

    container.style.display = 'grid'
    container.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`
    container.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`

    const fragment = document.createDocumentFragment()
    for (let i = 0; i < total; i++) {
      const px = document.createElement('div')
      const color = BLINK_COLORS[Math.floor(Math.random() * BLINK_COLORS.length)]
      const duration = (2 + Math.random() * 7).toFixed(2)
      const delay = (Math.random() * 10).toFixed(2)
      const bright = (0.35 + Math.random() * 0.55).toFixed(2)
      px.className = 'px'
      px.style.setProperty('--d', `${duration}s`)
      px.style.setProperty('--delay', `${delay}s`)
      px.style.setProperty('--bright', bright)
      px.style.background = color
      fragment.appendChild(px)
    }
    container.appendChild(fragment)
    requestAnimationFrame(() => setReady(true))
  }, [])

  return (
    <>
      <div className="pixel-bg" style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.3s' }}>
        <div ref={bgRef} className="pixel-grid" />
      </div>

      <svg
        className="stars"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.3s' }}
      >
        {Array.from({ length: 260 }, (_, i) => {
          const x = ((i * 431 + i * i * 7 + 83) % 1440)
          const y = ((i * 317 + i * i * 11 + 149) % 900)
          const size = i % 17 === 0 ? 3 : i % 5 === 0 ? 2 : 1
          const color = i % 23 === 0 ? '#f5c518' : i % 19 === 0 ? '#88aaff' : '#ffffff'
          const opacity = 0.15 + (((i * 97) % 100) / 100) * 0.65
          const blinkDur = 1.5 + ((i * 73) % 100) / 20
          const blinkDelay = ((i * 53) % 100) / 12
          return (
            <rect key={i} x={x} y={y} width={size} height={size} fill={color} opacity={opacity}
              style={{ animation: `blink ${blinkDur.toFixed(2)}s ${blinkDelay.toFixed(2)}s infinite` }}
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
        <a href="https://discord.com/invite/xnFR5Gr56U" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Discord">
          <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
      </div>

      <main className="scene">
        <h1 className="title">MUSEUM OF BASED</h1>

        <button className="btn-art" onClick={() => window.location.href = '/art'}>
          ART
        </button>

        <div className="colosseum-wrap">
          <ColosseumSVG />
        </div>

        <p className="tagline">PUT ART ON CHAIN</p>
      </main>

      <div className="vignette" />
      <div className="scanlines" />
    </>
  )
}

function ColosseumSVG() {
  // Full 3-floor Colosseum on a 176×104 grid
  // Floor 1: y=56–78  Floor 2: y=36–54  Floor 3/attic: y=22–34  Parapet: y=14–22
  return (
    <svg
      viewBox="0 0 176 104"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', display: 'block' }}
      shapeRendering="crispEdges"
    >
      <defs>
        <style>{`
          @keyframes torchFlicker {
            0%,100% { opacity:1; }
            25% { opacity:0.4; }
            50% { opacity:0.9; }
            75% { opacity:0.6; }
          }
          @keyframes moonGlow {
            0%,100% { opacity:0.85; }
            50% { opacity:1; }
          }
          .torch  { animation: torchFlicker 0.9s infinite; }
          .torch2 { animation: torchFlicker 1.2s 0.3s infinite; }
          .torch3 { animation: torchFlicker 0.8s 0.6s infinite; }
          .torch4 { animation: torchFlicker 1.0s 0.9s infinite; }
          .moon   { animation: moonGlow 4s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* ── SKY ── */}
      <rect x="0"   y="0"  width="176" height="88" fill="#0d0520" />
      <rect x="0"   y="88" width="176" height="16" fill="#1a1208" />
      <rect x="0"   y="88" width="176" height="2"  fill="#2a1f0e" />

      {/* Moon */}
      <rect className="moon" x="150" y="5"  width="14" height="14" fill="#f5f0c8" opacity="0.95" />
      <rect x="152" y="5"  width="10" height="2"  fill="#0d0520"  opacity="0.12" />

      {/* Stars inside SVG sky */}
      {[
        [8,4],[18,9],[30,3],[46,7],[60,2],[76,8],[91,3],[105,6],[120,9],[138,3],[158,7],
        [12,16],[26,12],[42,17],[56,10],[70,14],[84,12],[98,15],[115,10],[132,13],[152,16],
        [4,22],[20,19],[36,24],[52,18],[68,23],[88,19],[104,24],[120,17],[144,20],
      ].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="2" height="2" fill="white"
          opacity={0.2+(i%4)*0.1}
          style={{animation:`blink ${2+(i%3)}s ${(i*0.7)%5}s infinite`}}
        />
      ))}

      {/* ── BASE PLATFORM ── */}
      <rect x="8"  y="84" width="160" height="6"  fill="#5a4e38" />
      <rect x="8"  y="84" width="160" height="2"  fill="#7a6a50" />
      <rect x="8"  y="88" width="160" height="2"  fill="#3a2e1e" />

      {/* ══════════════════════════════════
          GROUND FLOOR  (y 58–84)
      ══════════════════════════════════ */}
      {/* Side piers */}
      <rect x="8"  y="58" width="10" height="28" fill="#8a7a5e" />
      <rect x="8"  y="58" width="2"  height="28" fill="#6a5c42" />
      <rect x="16" y="58" width="2"  height="28" fill="#a09070" />
      <rect x="158" y="58" width="10" height="28" fill="#8a7a5e" />
      <rect x="164" y="58" width="2"  height="28" fill="#6a5c42" />
      <rect x="158" y="58" width="2"  height="28" fill="#a09070" />
      {/* Main wall */}
      <rect x="18" y="58" width="140" height="28" fill="#8a7a5e" />
      {/* 8 ground floor arches */}
      {[22,36,50,64,78,92,106,120].map((x,i)=>(
        <g key={i}>
          <rect x={x}   y="60" width="12" height="24" fill="#3a2e1e" />
          <rect x={x+2} y="58" width="8"  height="4"  fill="#3a2e1e" />
          <rect x={x+1} y="59" width="10" height="2"  fill="#3a2e1e" />
          <rect x={x+5} y="58" width="2"  height="2"  fill="#c0a870" />
          <rect x={x+1} y="61" width="10" height="20" fill="#1e1608" />
          <rect x={x+2} y="78" width="8"  height="4"  fill="#3d2a08" opacity="0.5" />
        </g>
      ))}
      {/* Ground floor cornice */}
      <rect x="8"  y="56" width="160" height="4"  fill="#6a5c42" />
      <rect x="8"  y="56" width="160" height="2"  fill="#9a8a68" />

      {/* ══════════════════════════════════
          SECOND FLOOR  (y 38–56)
      ══════════════════════════════════ */}
      <rect x="10" y="38" width="156" height="20" fill="#7a6a50" />
      <rect x="10" y="38" width="2"   height="20" fill="#5a4c36" />
      <rect x="164" y="38" width="2"  height="20" fill="#5a4c36" />
      {/* 8 second floor arches */}
      {[14,28,42,56,70,84,98,112,126].slice(0,8).map((x,i)=>(
        <g key={i}>
          <rect x={x}   y="40" width="12" height="16" fill="#2e2410" />
          <rect x={x+2} y="38" width="8"  height="4"  fill="#2e2410" />
          <rect x={x+1} y="39" width="10" height="2"  fill="#2e2410" />
          <rect x={x+4} y="38" width="4"  height="2"  fill="#b09868" />
          <rect x={x+1} y="41" width="10" height="14" fill="#170f04" />
        </g>
      ))}
      {/* Second floor cornice */}
      <rect x="10" y="36" width="156" height="4"  fill="#5a4c36" />
      <rect x="10" y="36" width="156" height="2"  fill="#8a7a5a" />

      {/* ══════════════════════════════════
          THIRD FLOOR / ATTIC  (y 22–36)
      ══════════════════════════════════ */}
      <rect x="14" y="22" width="148" height="16" fill="#6a5c42" />
      <rect x="14" y="22" width="2"   height="16" fill="#4a3e2a" />
      <rect x="160" y="22" width="2"  height="16" fill="#4a3e2a" />
      {/* Attic windows — 14 narrow windows */}
      {[18,28,38,48,58,68,78,88,98,108,118,128,138,148].map((x,i)=>(
        <g key={i}>
          <rect x={x}   y="24" width="8"  height="12" fill="#1a1208" />
          <rect x={x+1} y="23" width="6"  height="3"  fill="#1a1208" />
          <rect x={x+2} y="23" width="4"  height="2"  fill="#8a7458" />
        </g>
      ))}
      {/* Attic cornice */}
      <rect x="14" y="20" width="148" height="4"  fill="#4a3e2a" />
      <rect x="14" y="20" width="148" height="2"  fill="#7a6a50" />

      {/* ══════════════════════════════════
          PARAPET / MERLONS  (y 12–20)
      ══════════════════════════════════ */}
      {Array.from({length:20},(_,i)=>(
        <rect key={i} x={16+i*7} y="14" width="4" height="8" fill="#5a4c36" />
      ))}
      {Array.from({length:20},(_,i)=>(
        <rect key={i} x={16+i*7} y="14" width="4" height="2" fill="#7a6a50" />
      ))}

      {/* ══════════════════════════════════
          TORCHES  (on second floor)
      ══════════════════════════════════ */}
      {/* Far left */}
      <g className="torch">
        <rect x="18" y="50" width="2" height="5" fill="#8a6030" />
        <rect x="17" y="45" width="4" height="5" fill="#ff8800" />
        <rect x="18" y="44" width="2" height="3" fill="#ffcc00" />
        <rect x="17" y="48" width="4" height="2" fill="#ff4400" opacity="0.8" />
      </g>
      {/* Mid-left */}
      <g className="torch2">
        <rect x="60" y="50" width="2" height="5" fill="#8a6030" />
        <rect x="59" y="45" width="4" height="5" fill="#ff8800" />
        <rect x="60" y="44" width="2" height="3" fill="#ffcc00" />
        <rect x="59" y="48" width="4" height="2" fill="#ff4400" opacity="0.8" />
      </g>
      {/* Center left */}
      <g className="torch3">
        <rect x="88" y="50" width="2" height="5" fill="#8a6030" />
        <rect x="87" y="45" width="4" height="5" fill="#ff8800" />
        <rect x="88" y="44" width="2" height="3" fill="#ffcc00" />
        <rect x="87" y="48" width="4" height="2" fill="#ff4400" opacity="0.8" />
      </g>
      {/* Far right */}
      <g className="torch4">
        <rect x="156" y="50" width="2" height="5" fill="#8a6030" />
        <rect x="155" y="45" width="4" height="5" fill="#ff8800" />
        <rect x="156" y="44" width="2" height="3" fill="#ffcc00" />
        <rect x="155" y="48" width="4" height="2" fill="#ff4400" opacity="0.8" />
      </g>

      {/* ══════════════════════════════════
          ENTRANCE GATE (center ground)
      ══════════════════════════════════ */}
      <rect x="78"  y="66" width="20" height="20" fill="#1e1608" />
      <rect x="80"  y="64" width="16" height="4"  fill="#1e1608" />
      <rect x="82"  y="63" width="12" height="3"  fill="#1e1608" />
      <rect x="84"  y="61" width="8"  height="4"  fill="#1e1608" />
      {/* Keystone */}
      <rect x="87"  y="60" width="4"  height="3"  fill="#d4b060" />
      {/* Door frame */}
      <rect x="80"  y="66" width="2"  height="20" fill="#4a3e2a" />
      <rect x="94"  y="66" width="2"  height="20" fill="#4a3e2a" />
      {/* Door interior */}
      <rect x="82"  y="68" width="12" height="18" fill="#120d04" />
      <rect x="84"  y="80" width="8"  height="6"  fill="#2a1a04" opacity="0.7" />

      {/* Base shadow */}
      <rect x="8" y="90" width="160" height="2" fill="#0a0800" opacity="0.5" />

      {/* ── FLAGS ── */}
      <rect x="12" y="12" width="2" height="10" fill="#8a7a5e" />
      <rect x="12" y="12" width="8" height="5"  fill="#0052ff" />
      <rect x="162" y="12" width="2" height="10" fill="#8a7a5e" />
      <rect x="154" y="12" width="8" height="5"  fill="#f5c518" />
    </svg>
  )
}
