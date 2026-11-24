import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getToonRampTexture } from '../../shaders/toonRamp'
import { Ball, Box, Cylinder, Label, makeTexture, Pipe, type V3 } from './ApparatusParts'
import { GLOWBI_GALLERY_ARTWORKS, type GlowbiGalleryArtwork } from './galleryArtwork'
import { MuseumSign } from './MuseumSign'

// Match the existing MoBA foyer/gallery, without importing another room's runtime.
export const GALLERY = {
  ink: '#28202f', teal: '#356d69', deepTeal: '#214844',
  plaster: '#e8cfaa', stone: '#f3dfbc', teak: '#845034',
  darkTeak: '#4d2d24', brass: '#d2a543', ivory: '#fff4d5', velvet: '#a14d5e',
}

function Block({ size, position, color, rotation }: { size: V3; position: V3; color: string; rotation?: V3 }) {
  return <mesh position={position} rotation={rotation} receiveShadow>
    <boxGeometry args={size} />
    <meshToonMaterial color={color} gradientMap={getToonRampTexture()} />
  </mesh>
}

function GalleryFloor() {
  const texture = useMemo(() => {
    const map = makeTexture(512, 512, ctx => {
      ctx.fillStyle = '#827e6c'; ctx.fillRect(0, 0, 512, 512)
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        const left = x * 256, top = y * 256
        ctx.fillStyle = (x + y) % 2 ? '#c7c2a9' : '#ded8bf'
        ctx.fillRect(left + 2, top + 2, 252, 252)
        ctx.strokeStyle = '#ece4cb'; ctx.lineWidth = 2
        ctx.strokeRect(left + 5, top + 5, 246, 246)
      }
      for (let y = 0; y <= 2; y++) for (let x = 0; x <= 2; x++) {
        ctx.save(); ctx.translate(x * 256, y * 256); ctx.rotate(Math.PI / 4)
        ctx.fillStyle = GALLERY.deepTeal; ctx.fillRect(-12, -12, 24, 24); ctx.restore()
      }
    })
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.set(8, 10)
    return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, -0.045, 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[32, 40]} />
    <meshToonMaterial map={texture} gradientMap={getToonRampTexture()} />
  </mesh>
}

function Picture({ art, position }: { art: GlowbiGalleryArtwork; position: V3 }) {
  const texture = useMemo(() => makeTexture(art.width, art.height, ctx => {
    ctx.fillStyle = GALLERY.deepTeal; ctx.fillRect(0, 0, art.width, art.height)
  }), [art])
  useEffect(() => {
    // Decorative art loads independently; a failed image must not block the machine.
    const image = new Image()
    let active = true
    image.onload = () => {
      if (!active) return
      const canvas = texture.image as HTMLCanvasElement
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
      texture.needsUpdate = true
    }
    image.src = art.src
    return () => { active = false; image.onload = null; texture.dispose() }
  }, [art, texture])
  const w = art.displayWidth, h = w * art.height / art.width
  return <group name={`glowbi-gallery-${art.id}`} position={position}>
    <Box size={[w + 0.68, h + 0.68, 0.19]} color={GALLERY.darkTeak} radius={0.035} />
    <Box size={[w + 0.48, h + 0.48, 0.09]} color={GALLERY.brass} position={[0, 0, 0.12]} radius={0.02} outline={0.006} />
    <Block size={[w + 0.23, h + 0.23, 0.045]} color={GALLERY.ivory} position={[0, 0, 0.18]} />
    <mesh position={[0, 0, 0.207]}>
      <planeGeometry args={[w, h]} /><meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
    {[-1, 1].flatMap(x => [-1, 1].map(y => <Ball key={`${x}-${y}`} radius={0.065} color={GALLERY.ivory} position={[x * (w / 2 + 0.23), y * (h / 2 + 0.23), 0.19]} outline={0} />))}
    <Box size={[1.45, 0.22, 0.05]} position={[0, -h / 2 - 0.59, -0.06]} color={GALLERY.brass} radius={0.018} outline={0.005} />
    <Label text={art.caption} width={1.37} height={0.16} position={[0, -h / 2 - 0.59, -0.029]} background={GALLERY.brass} color={GALLERY.darkTeak} />
    <Block size={[0.08, 0.28, 0.36]} color={GALLERY.darkTeak} position={[0, h / 2 + 0.64, 0.08]} />
    <Box size={[1.15, 0.13, 0.35]} color={GALLERY.brass} position={[0, h / 2 + 0.55, 0.28]} radius={0.025} />
    <Block size={[0.99, 0.025, 0.22]} color={GALLERY.ivory} position={[0, h / 2 + 0.476, 0.28]} />
  </group>
}

function Pilaster({ x }: { x: number }) {
  return <group position={[x, 0, -5.57]}>
    <Block size={[0.64, 9.7, 0.45]} position={[0, 4.85, 0]} color={GALLERY.plaster} />
    {[-0.19, 0, 0.19].map(offset => <Block key={offset} size={[0.045, 7.4, 0.035]} position={[offset, 5.1, 0.242]} color="#c2ad8c" />)}
    <Block size={[0.82, 0.25, 0.62]} position={[0, 0.12, 0.05]} color={GALLERY.darkTeak} />
    <Block size={[0.76, 0.36, 0.56]} position={[0, 0.42, 0.03]} color={GALLERY.stone} />
    <Block size={[0.82, 0.2, 0.62]} position={[0, 9.25, 0.06]} color={GALLERY.brass} />
    <Block size={[0.94, 0.32, 0.7]} position={[0, 9.5, 0.08]} color={GALLERY.stone} />
  </group>
}

function RopeBoundary({ side }: { side: number }) {
  return <group position={[side * 5.05, 0, -0.15]}>
    {[-2, 1.4].map(z => <group key={z} position={[0, 0, z]}>
      <Cylinder radius={0.26} top={0.2} height={0.09} color={GALLERY.darkTeak} position={[0, 0.01, 0]} outline={0.01} />
      <Cylinder radius={0.17} top={0.08} height={0.17} color={GALLERY.brass} position={[0, 0.13, 0]} outline={0.01} />
      <Cylinder radius={0.044} height={1.02} color={GALLERY.brass} position={[0, 0.67, 0]} outline={0.025} />
      <Ball radius={0.11} color={GALLERY.brass} position={[0, 1.21, 0]} outline={0.02} />
    </group>)}
    <Pipe points={[[0, 1.14, -2], [0, 0.85, -1.15], [0, 0.76, -0.3], [0, 0.85, 0.55], [0, 1.14, 1.4]]} radius={0.056} color={GALLERY.velvet} outline={0.02} />
  </group>
}

export function MuseumGallery() {
  return <group name="moba-conservation-gallery">
    <GalleryFloor />
    <Block size={[30, 13, 0.35]} position={[0, 6.4, -5.95]} color={GALLERY.teal} />
    <Block size={[10.8, 7.35, 0.1]} position={[0, 5.9, -5.73]} color={GALLERY.deepTeal} />
    <Block size={[30, 2.05, 0.22]} position={[0, 1, -5.67]} color={GALLERY.darkTeak} />
    {[-12.8, -11.2, -9.6, -8, -6.4, -4.8, -3.2, -1.6, 0, 1.6, 3.2, 4.8, 6.4, 8, 9.6, 11.2, 12.8].map(x => <group key={x}>
      <Block size={[1.4, 1.5, 0.055]} position={[x, 1.03, -5.55]} color={GALLERY.teak} />
      <Block size={[1.14, 1.22, 0.03]} position={[x, 1.03, -5.513]} color="#73452f" />
      <Block size={[1.1, 0.035, 0.02]} position={[x, 1.63, -5.49]} color="#b77e50" />
    </group>)}
    {[0.22, 2.04, 9.7].map(y => <group key={y}>
      <Block size={[30, 0.18, 0.38]} position={[0, y, -5.56]} color={GALLERY.darkTeak} />
      <Block size={[30, 0.045, 0.045]} position={[0, y + 0.1, -5.34]} color={GALLERY.brass} />
    </group>)}
    <Block size={[30, 0.35, 0.68]} position={[0, 9.97, -5.53]} color={GALLERY.stone} />
    {[-10, -4.95, 4.95, 10].map(x => <Pilaster key={x} x={x} />)}
    <Block size={[30, 0.2, 18]} position={[0, 10.5, 2.8]} color={GALLERY.plaster} />
    {[-12.5, 12.5].map(x => <group key={x}>
      <Block size={[0.3, 10.5, 18]} position={[x, 5.2, 2.8]} color={GALLERY.teal} />
      <Block size={[0.36, 2.05, 18]} position={[x, 1, 2.8]} color={GALLERY.darkTeak} />
      <Block size={[0.42, 0.06, 18]} position={[x, 2.08, 2.8]} color={GALLERY.brass} />
    </group>)}
    {[-4.5, 1, 6].map(z => <group key={z}>
      <Block size={[30, 0.22, 0.3]} position={[0, 10.25, z]} color={GALLERY.darkTeak} />
      <Block size={[30, 0.035, 0.17]} position={[0, 10.12, z]} color={GALLERY.brass} />
    </group>)}
    <Picture art={GLOWBI_GALLERY_ARTWORKS[0]} position={[-7.475, 5.1, -5.7]} />
    <Picture art={GLOWBI_GALLERY_ARTWORKS[1]} position={[7.475, 5.1, -5.7]} />
    <MuseumSign />
    <group position={[0, 9.5, -1.2]}>
      <Box size={[8.5, 0.14, 0.18]} color={GALLERY.darkTeak} radius={0.025} />
      {[-3.5, 3.5].map(x => <group key={x} position={[x, 0, 0]}>
        <Cylinder radius={0.024} height={0.9} color={GALLERY.brass} position={[0, 0.52, 0]} outline={0} />
        <group position={[0, -0.22, 0]} rotation={[0.2, 0, -Math.sign(x) * 0.35]}>
          <Cylinder radius={0.28} top={0.2} height={0.48} color={GALLERY.brass} outline={0.02} />
          <Cylinder radius={0.24} height={0.035} color={GALLERY.ivory} position={[0, -0.25, 0]} outline={0} />
        </group>
      </group>)}
    </group>
    <RopeBoundary side={-1} /><RopeBoundary side={1} />
  </group>
}
