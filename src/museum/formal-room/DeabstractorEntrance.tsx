'use client'

import { useEffect, useMemo, useState } from 'react'
import { OutlineMesh } from '../../render/OutlineMesh'
import { getToonRampTexture } from '../../shaders/toonRamp'
import * as THREE from 'three'

type Vec3 = [number, number, number]
const ramp = getToonRampTexture()

function Block({ position, size, color }: { position: Vec3; size: Vec3; color: string }) {
  return <OutlineMesh position={position} scale={size} outlineWidth={0.018}
    geometry={<boxGeometry />}
    material={<meshToonMaterial color={color} gradientMap={ramp} />} />
}

// A lightweight entrance, not a second copy of the machine or its wallet providers.
export function DeabstractorEntrance({ onEnter, enabled }: { onEnter: () => void; enabled: boolean }) {
  const [hovered, setHovered] = useState(false)
  const sign = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 384
    const context = canvas.getContext('2d')!
    context.fillStyle = '#183e35'
    context.fillRect(0, 0, 1024, 384)
    context.strokeStyle = '#cba65d'
    context.lineWidth = 5
    context.strokeRect(18, 18, 988, 348)
    context.textAlign = 'center'
    context.fillStyle = '#b8e9c8'
    context.font = '700 36px Arial'
    context.fillText('GLOWBUDS DEPARTURES', 512, 87)
    context.fillStyle = '#fff0c7'
    context.font = '700 99px Georgia'
    context.fillText('De-Abstractor', 512, 216)
    context.fillStyle = '#eac16f'
    context.font = '700 38px Arial'
    context.fillText('ENTER THE ROOM', 512, 308)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
  useEffect(() => () => sign.dispose(), [sign])
  useEffect(() => {
    if (!hovered || !enabled) return
    document.body.style.cursor = 'pointer'
    return () => { document.body.style.cursor = '' }
  }, [hovered, enabled])

  return <group name="deabstractor-museum-entrance" position={[3.7, -1.93, 9.70]} rotation={[0, Math.PI, 0]}
    userData={{ roomEntrance: 'deabstractor', href: '/deabstractor' }}
    onClick={event => { event.stopPropagation(); if (enabled) onEnter() }}
    onPointerOver={event => { event.stopPropagation(); setHovered(true) }}
    onPointerOut={() => setHovered(false)}>
    <Block position={[0, 1.85, 0]} size={[2.45, 3.70, 0.20]} color="#292329" />
    <Block position={[0, 1.83, 0.13]} size={[2.21, 3.42, 0.14]} color={hovered && enabled ? '#527e69' : '#345c50'} />
    {[-1, 1].map(side => <Block key={side} position={[side * 1.14, 1.85, 0.24]} size={[0.08, 3.55, 0.10]} color="#d2ae63" />)}
    <Block position={[0, 3.57, 0.25]} size={[2.30, 0.09, 0.12]} color="#d2ae63" />
    <Block position={[0, 0.08, 0.25]} size={[2.42, 0.16, 0.48]} color="#b89b69" />
    <Block position={[0, 2.18, 0.24]} size={[1.72, 1.60, 0.14]} color="#bba36d" />
    <Block position={[0, 2.18, 0.33]} size={[1.55, 1.43, 0.07]} color="#0e2825" />
    <mesh position={[0, 2.18, 0.38]}>
      <planeGeometry args={[1.38, 1.26]} />
      <meshBasicMaterial color={hovered && enabled ? '#97dbc1' : '#77b6a6'} />
    </mesh>
    <Block position={[0, 2.18, 0.42]} size={[0.055, 1.30, 0.04]} color="#c4a05a" />
    <Block position={[0, 2.18, 0.42]} size={[1.42, 0.055, 0.04]} color="#c4a05a" />
    <Block position={[0, 1.10, 0.35]} size={[2.09, 0.82, 0.13]} color="#d2ae63" />
    <mesh position={[0, 1.10, 0.425]}>
      <planeGeometry args={[1.99, 0.746]} />
      <meshBasicMaterial map={sign} toneMapped={false} />
    </mesh>
    <Block position={[0.79, 0.49, 0.40]} size={[0.09, 0.35, 0.12]} color="#e6c279" />
    <Block position={[0, 3.86, 0.18]} size={[0.57, 0.20, 0.24]} color="#252a2b" />
    <mesh position={[0, 3.87, 0.32]}>
      <boxGeometry args={[0.37, 0.10, 0.06]} />
      <meshBasicMaterial color={hovered && enabled ? '#e2ffe9' : '#8de9b9'} />
    </mesh>
  </group>
}
