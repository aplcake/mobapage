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
        <p className="tagline">— Based Art on Chain —</p>
      </main>

      <div className="vignette" />
      <div className="scanlines" />
    </>
  )
}

function ColosseumSVG() {
  // Clean 3-tier Colosseum. ViewBox: 240 wide × 110 tall
  // Tier 1 (ground): y=70–100  Tier 2: y=42–68  Tier 3/attic: y=20–40  Parapet: y=10–20
  // Width tapers slightly per tier to give curved Colosseum silhouette
  return (
    <svg
      viewBox="0 0 240 112"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', display: 'block' }}
      shapeRendering="crispEdges"
    >
      <defs>
        <style>{`
          @keyframes tf {
            0%,100%{opacity:1} 20%{opacity:0.3} 60%{opacity:0.85} 80%{opacity:0.5}
          }
          @keyframes mg { 0%,100%{opacity:0.85} 50%{opacity:1} }
          .t1{animation:tf 0.85s infinite}
          .t2{animation:tf 1.15s 0.28s infinite}
          .t3{animation:tf 0.75s 0.55s infinite}
          .t4{animation:tf 1.05s 0.82s infinite}
          .moon{animation:mg 4s ease-in-out infinite}
        `}</style>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="240" height="112" fill="#0c0418"/>

      {/* Moon */}
      <rect className="moon" x="210" y="6" width="16" height="16" fill="#f5f0c8"/>
      <rect x="212" y="6" width="12" height="3" fill="#0c0418" opacity="0.1"/>

      {/* Sky stars */}
      {[[10,5],[28,10],[44,4],[62,8],[80,3],[98,7],[116,4],[134,9],[152,5],[170,8],[188,3],[206,11],
        [18,18],[36,14],[54,19],[72,13],[90,17],[108,14],[126,18],[144,12],[162,16],[180,20],
        [8,26],[30,22],[50,27],[70,21],[92,25],[112,20],[132,24],[154,28],[174,22],[196,26]
      ].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width={i%6===0?2:1} height={i%6===0?2:1}
          fill={i%11===0?'#f5c518':i%7===0?'#88aaff':'#ffffff'}
          opacity={0.2+(i%5)*0.1}
          style={{animation:`blink ${1.5+(i%4)*0.6}s ${(i*0.4)%5}s infinite`}}
        />
      ))}

      {/* ── GROUND (dirt) ── */}
      <rect x="0" y="102" width="240" height="10" fill="#1a1208"/>
      <rect x="0" y="102" width="240" height="2"  fill="#2a1d0e"/>

      {/* ════════════════════════════
          TIER 1 — GROUND FLOOR
          x: 4–236, y: 68–102
      ════════════════════════════ */}
      {/* Base plinth */}
      <rect x="4"   y="98"  width="232" height="6"  fill="#4e4430"/>
      <rect x="4"   y="98"  width="232" height="2"  fill="#6a5c3e"/>
      {/* Side piers */}
      <rect x="4"   y="68"  width="12"  height="32" fill="#7a6c52"/>
      <rect x="4"   y="68"  width="2"   height="32" fill="#5c5038"/>
      <rect x="14"  y="68"  width="2"   height="32" fill="#9a8c6e"/>
      <rect x="224" y="68"  width="12"  height="32" fill="#7a6c52"/>
      <rect x="234" y="68"  width="2"   height="32" fill="#5c5038"/>
      <rect x="224" y="68"  width="2"   height="32" fill="#9a8c6e"/>
      {/* Main wall */}
      <rect x="16"  y="68"  width="208" height="32" fill="#7a6c52"/>
      {/* 9 arches evenly spaced */}
      {[20,42,64,86,108,130,152,174,196].map((x,i)=>(
        <g key={i}>
          <rect x={x}   y="70"  width="18" height="28" fill="#342c1c"/>
          <rect x={x+3} y="68"  width="12" height="4"  fill="#342c1c"/>
          <rect x={x+1} y="69"  width="16" height="2"  fill="#342c1c"/>
          <rect x={x+7} y="67"  width="4"  height="3"  fill="#b09858"/>
          <rect x={x+1} y="71"  width="16" height="24" fill="#1c1408"/>
          <rect x={x+3} y="91"  width="12" height="5"  fill="#2e2010" opacity="0.6"/>
        </g>
      ))}
      {/* Tier 1 cornice */}
      <rect x="4"   y="65"  width="232" height="5"  fill="#5c5038"/>
      <rect x="4"   y="65"  width="232" height="2"  fill="#8a7c5a"/>

      {/* ════════════════════════════
          TIER 2 — SECOND FLOOR
          x: 10–230, y: 40–65
      ════════════════════════════ */}
      <rect x="10"  y="40"  width="220" height="27" fill="#6e6048"/>
      <rect x="10"  y="40"  width="2"   height="27" fill="#4e4430"/>
      <rect x="228" y="40"  width="2"   height="27" fill="#4e4430"/>
      {/* 8 arches */}
      {[16,42,68,94,120,146,172,198].map((x,i)=>(
        <g key={i}>
          <rect x={x}   y="42"  width="20" height="22" fill="#2a2212"/>
          <rect x={x+3} y="40"  width="14" height="4"  fill="#2a2212"/>
          <rect x={x+1} y="41"  width="18" height="2"  fill="#2a2212"/>
          <rect x={x+7} y="39"  width="6"  height="3"  fill="#a08850"/>
          <rect x={x+2} y="43"  width="16" height="18" fill="#14100a"/>
        </g>
      ))}
      {/* Tier 2 cornice */}
      <rect x="10"  y="37"  width="220" height="5"  fill="#4e4430"/>
      <rect x="10"  y="37"  width="220" height="2"  fill="#7a6c4e"/>

      {/* ════════════════════════════
          TIER 3 — ATTIC
          x: 18–222, y: 18–37
      ════════════════════════════ */}
      <rect x="18"  y="18"  width="204" height="21" fill="#5e5240"/>
      <rect x="18"  y="18"  width="2"   height="21" fill="#3e3428"/>
      <rect x="220" y="18"  width="2"   height="21" fill="#3e3428"/>
      {/* 13 narrow attic windows */}
      {[22,37,52,67,82,97,112,127,142,157,172,187,202].map((x,i)=>(
        <g key={i}>
          <rect x={x}   y="20"  width="10" height="16" fill="#1a1208"/>
          <rect x={x+1} y="19"  width="8"  height="3"  fill="#1a1208"/>
          <rect x={x+3} y="19"  width="4"  height="2"  fill="#7a6844"/>
        </g>
      ))}
      {/* Tier 3 cornice */}
      <rect x="18"  y="15"  width="204" height="5"  fill="#3e3428"/>
      <rect x="18"  y="15"  width="204" height="2"  fill="#6a5e44"/>

      {/* ════════════════════════════
          PARAPET / MERLONS
          y: 6–15
      ════════════════════════════ */}
      {Array.from({length:24},(_,i)=>(
        <g key={i}>
          <rect x={22+i*8} y="7"  width="5" height="10" fill="#4e4430"/>
          <rect x={22+i*8} y="7"  width="5" height="2"  fill="#6e6248"/>
        </g>
      ))}

      {/* ════════════════════════════
          TORCHES on Tier 2
      ════════════════════════════ */}
      {[[14,54],[90,54],[150,54],[226,54]].map(([x,y],i)=>(
        <g key={i} className={['t1','t2','t3','t4'][i]}>
          <rect x={x}   y={y+4} width="3" height="6"  fill="#7a5828"/>
          <rect x={x-1} y={y}   width="5" height="6"  fill="#ff8c00"/>
          <rect x={x}   y={y-2} width="3" height="4"  fill="#ffcc00"/>
          <rect x={x-1} y={y+3} width="5" height="3"  fill="#ff4400" opacity="0.8"/>
        </g>
      ))}

      {/* ════════════════════════════
          ENTRANCE GATE — center
      ════════════════════════════ */}
      <rect x="108" y="76"  width="24" height="26" fill="#1c1408"/>
      <rect x="110" y="73"  width="20" height="5"  fill="#1c1408"/>
      <rect x="113" y="71"  width="14" height="4"  fill="#1c1408"/>
      <rect x="116" y="69"  width="8"  height="4"  fill="#1c1408"/>
      {/* Keystone */}
      <rect x="118" y="68"  width="4"  height="3"  fill="#c8a048"/>
      {/* Frame sides */}
      <rect x="110" y="76"  width="3"  height="26" fill="#3e3428"/>
      <rect x="127" y="76"  width="3"  height="26" fill="#3e3428"/>
      {/* Interior */}
      <rect x="113" y="79"  width="14" height="23" fill="#0e0a04"/>
      <rect x="115" y="94"  width="10" height="8"  fill="#201608" opacity="0.7"/>

      {/* Base shadow */}
      <rect x="4" y="103" width="232" height="2" fill="#080604" opacity="0.6"/>

      {/* ════════════════════════════
          FLAGS — small, proportional
      ════════════════════════════ */}
      {/* Left flag pole + flag */}
      <rect x="20"  y="4"  width="2"  height="12" fill="#6a5c3e"/>
      <rect x="22"  y="4"  width="8"  height="6"  fill="#0052ff"/>
      <rect x="22"  y="4"  width="8"  height="2"  fill="#4488ff"/>
      {/* Right flag pole + flag */}
      <rect x="218" y="4"  width="2"  height="12" fill="#6a5c3e"/>
      <rect x="220" y="4"  width="8"  height="6"  fill="#f5c518"/>
      <rect x="220" y="4"  width="8"  height="2"  fill="#fff066"/>
    </svg>
  )
}
