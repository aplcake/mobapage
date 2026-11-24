import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { getToonRampTexture } from '../../shaders/toonRamp'
import { Box, Cylinder, InkMesh, makeTexture } from './ApparatusParts'
import fontData from './mobaSignFont.json'
import { fittedText, useCanvasFonts } from './typography'

const BRASS = '#cf9a44'
const IVORY = '#fff0c9'
const ENAMEL = '#133a3c'
export const MOBA_SIGN_POSITION: [number, number, number] = [0, 7.86, -5.64]
export const MOBA_SIGN_DEPTH = { back: -0.06, panel: 0.14, frame: 0.14, word: 0.203, caption: 0.221 } as const

function plaqueShape(width: number, height: number, rise: number) {
  const shape = new THREE.Shape(), x = width / 2, y = height / 2, r = 0.16
  shape.moveTo(-x + r, -y)
  shape.lineTo(x - r, -y)
  shape.quadraticCurveTo(x, -y, x, -y + r)
  shape.lineTo(x, y - r)
  shape.quadraticCurveTo(x, y, x - r, y)
  shape.lineTo(1.2, y)
  shape.bezierCurveTo(0.65, y, 0.8, y + rise, 0, y + rise)
  shape.bezierCurveTo(-0.8, y + rise, -0.65, y, -1.2, y)
  shape.lineTo(-x + r, y)
  shape.quadraticCurveTo(-x, y, -x, y - r)
  shape.lineTo(-x, -y + r)
  shape.quadraticCurveTo(-x, -y, -x + r, -y)
  shape.closePath()
  return shape
}

// Closed nested contours give the moulding real front, inner, outer and rear faces.
export function createMobaSignGeometry() {
  const extrude = (shape: THREE.Shape, depth: number, bevel: number) => new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 12, bevelEnabled: true, bevelSegments: 3,
    bevelThickness: bevel, bevelSize: bevel,
  })
  const outer = plaqueShape(6.36, 1.33, 0.11)
  outer.holes.push(new THREE.Path(plaqueShape(5.94, 1.05, 0.1).getPoints(12)))
  const word = new TextGeometry('MoBA', {
    font: new FontLoader().parse(fontData), size: 1, depth: 0.065,
    curveSegments: 10, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.009, bevelSegments: 2,
  })
  word.computeBoundingBox()
  const bounds = word.boundingBox!
  const scale = 3 / (bounds.max.x - bounds.min.x)
  word.translate(-(bounds.min.x + bounds.max.x) / 2, -(bounds.min.y + bounds.max.y) / 2, 0)
  word.scale(scale, scale, 1)
  return {
    back: extrude(plaqueShape(6.52, 1.4, 0.1), 0.18, 0.04),
    frame: extrude(outer, 0.09, 0.025),
    panel: extrude(plaqueShape(6.02, 1.13, 0.1), 0.06, 0.018),
    word,
  }
}

export function MuseumSign() {
  const fontsReady = useCanvasFonts()
  const geometry = useMemo(() => createMobaSignGeometry(), [])
  const caption = useMemo(() => makeTexture(1536, 96, ctx => {
    ctx.clearRect(0, 0, 1536, 96)
    ctx.fillStyle = IVORY
    fittedText(ctx, 'MUSEUM OF BASED ART', 768, 48, 1490, 74, 92)
  }), [fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps -- Loaded fonts change canvas glyph metrics.
  useEffect(() => () => {
    Object.values(geometry).forEach(item => item.dispose())
  }, [geometry])
  useEffect(() => () => caption.dispose(), [caption])
  return <group name="moba-sculpted-museum-sign" position={MOBA_SIGN_POSITION}>
    <InkMesh geometry={geometry.back} color="#48302c" position={[0, 0, MOBA_SIGN_DEPTH.back]} outline={0.006} />
    <mesh geometry={geometry.panel} position={[0, 0, MOBA_SIGN_DEPTH.panel]} receiveShadow>
      <meshToonMaterial color={ENAMEL} emissive={ENAMEL} emissiveIntensity={0.28} gradientMap={getToonRampTexture()} />
    </mesh>
    <mesh geometry={geometry.frame} position={[0, 0, MOBA_SIGN_DEPTH.frame]} castShadow receiveShadow>
      <meshToonMaterial attach="material-0" color={BRASS} emissive={BRASS} emissiveIntensity={0.48} gradientMap={getToonRampTexture()} />
      <meshToonMaterial attach="material-1" color="#f5d18b" emissive="#d5b171" emissiveIntensity={0.4} gradientMap={getToonRampTexture()} />
    </mesh>
    <mesh geometry={geometry.word} position={[0, 0.1, MOBA_SIGN_DEPTH.word]} castShadow>
      <meshToonMaterial attach="material-0" color={IVORY} emissive={IVORY} emissiveIntensity={0.82} gradientMap={getToonRampTexture()} />
      <meshToonMaterial attach="material-1" color={BRASS} emissive="#95642b" emissiveIntensity={0.3} gradientMap={getToonRampTexture()} />
    </mesh>
    <mesh position={[0, -0.43, MOBA_SIGN_DEPTH.caption]}>
      <planeGeometry args={[4.3, 4.3 / 16]} />
      <meshBasicMaterial map={caption} transparent depthWrite={false} toneMapped={false} />
    </mesh>
    {[-1, 1].map(side => <group key={side}>
      {[0, 1, 2].map(i => <Box key={i} size={[0.045, 0.23 + i * 0.12, 0.075]}
        position={[side * (2.14 + i * 0.15), 0.04, 0.225]} rotation={[0, 0, -side * (2 - i) * 0.15]}
        color={BRASS} radius={0.016} outline={0} />)}
      <Box size={[0.59, 0.035, 0.075]} position={[side * 2.29, -0.26, 0.225]} color={BRASS} radius={0.01} outline={0} />
      {[-1, 1].map(y => <Cylinder key={y} radius={0.043} height={0.04} color="#ead18e"
        position={[side * 3.11, y * 0.48, 0.231]} rotation={[Math.PI / 2, 0, 0]} outline={0} segments={12} />)}
    </group>)}
  </group>
}
