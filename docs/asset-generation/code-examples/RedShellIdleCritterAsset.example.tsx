import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ComponentProps } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../src/render/OutlineMesh'

type RedShellIdleCritterAssetProps = {
  mode?: RedShellIdleCritterAssetMode
  animation?: RedShellCritterAnimation
  scale?: number
  activity?: number
  position?: [number, number, number]
}

type GlowbudWizardCritterAssetProps = {
  animation?: RedShellCritterAnimation
  scale?: number
  activity?: number
  position?: [number, number, number]
}

export type RedShellIdleCritterAssetMode = 'dressed' | 'character' | 'shell'
export type RedShellCritterAnimation = 'idle' | 'hop' | 'grumble'

const VAC_ASSET_INK = '#17121f'
const VAC_ASSET_DETAIL_INK = '#211827'

const SHELL_DARK = '#5a3214'
const SHELL_DEEP = '#3b1d0b'
const SHELL_MID = '#a76322'
const SHELL_LIGHT = '#d99538'
const SHELL_GLAZE = '#f0b24c'
const SHELL_EDGE_LIGHT = '#ffc35c'
const SHELL_REAR_BLEND = '#b76a1f'
const FACE_RED = '#f13224'
const FACE_RED_SHADE = '#a8181b'
const FACE_RED_LIGHT = '#ff7150'
const KNOB_RED = '#ff3a2e'
const EYE_WHITE = '#fff9e8'
const GRASS_DARK = '#2f7f44'
const GRASS_MID = '#52c66f'
const GRASS_LIGHT = '#86eaa2'
const GRASS_DEW = '#d8ffc5'
const POT_BLUE_DARK = '#155d7f'
const POT_BLUE_MID = '#8ed7d1'
const POT_BLUE_LIGHT = '#c9f0df'
const POT_BLUE_SHADOW = '#3b89a2'
const POT_CLAY_WASH = '#6eb8bf'
const POT_MATTE_DUST = '#e3f6e8'
const SOIL_DARK = '#1f160f'
const SOIL_MID = '#3c2819'
const SOIL_LIGHT = '#5b3b22'
const SOIL_DUST = '#7a5230'
const STEM_DARK = '#21491c'
const LEAF_MID = '#6aa83a'
const HIBISCUS_RED = '#df1420'
const HIBISCUS_RED_DARK = '#65080e'
const HIBISCUS_RED_LIGHT = '#ff3f35'
const HIBISCUS_RED_JUICE = '#ff6a43'
const HIBISCUS_THROAT_BROWN = '#3a1008'
const HIBISCUS_THROAT_DARK = '#210709'
const HIBISCUS_GUIDE_MAROON = '#8c1219'
const STAMEN_YELLOW = '#ffc742'
const STAMEN_YELLOW_LIGHT = '#ffe78a'
const CLOAK_BLACK = '#0f1015'
const CLOAK_DARK = '#1c2024'
const CLOAK_RED_TRIM = '#80151a'
const CLOAK_FOLD_LIGHT = '#4b4352'
const CLOAK_HEM_DARK = '#17121f'
const CLOAK_MATTE_SHEEN = '#42414d'
const STAFF_WOOD_DARK = '#7b3f12'
const STAFF_WOOD_MID = '#b66a20'
const STAFF_WOOD_LIGHT = '#f0a33a'
const STAFF_WRAP_DARK = '#5a2f18'
const WIZARD_BROW_DARK = '#3a1417'
const WIZARD_BROW_MID = '#68221f'
const WIZARD_BROW_LIGHT = '#a13a2b'
const WIZARD_FACE_SETBACK_Z = 0.105

let vacuumHeadToonRampTexture: THREE.DataTexture | null = null

function getVacuumHeadToonRampTexture() {
  if (vacuumHeadToonRampTexture) return vacuumHeadToonRampTexture

  const colors = new Uint8Array([
    123, 104, 190, 255,
    198, 164, 255, 255,
    255, 242, 166, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  vacuumHeadToonRampTexture = texture
  return texture
}

function CodedAssetOutlineMesh({
  outlineColor = VAC_ASSET_INK,
  outlineWidth,
  ...props
}: ComponentProps<typeof OutlineMesh>) {
  const width = outlineWidth === undefined ? 0.035 : outlineWidth >= 0.012 ? outlineWidth * 1.18 : outlineWidth * 1.08
  return <OutlineMesh {...props} outlineWidth={width} outlineColor={outlineColor} />
}

function toon(color: string) {
  return <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} />
}

function toonDoubleSided(color: string) {
  return <meshToonMaterial color={color} gradientMap={getVacuumHeadToonRampTexture()} side={THREE.DoubleSide} />
}

function clampIdleActivity(activity: number) {
  return Math.min(1.35, Math.max(0, activity))
}

function idlePulse(time: number, period: number, center = 0.68, width = 0.085) {
  const phase = (time / period) % 1
  const wrappedDistance = Math.min(Math.abs(phase - center), 1 - Math.abs(phase - center))
  const amount = Math.max(0, 1 - wrappedDistance / width)
  return amount * amount * (3 - 2 * amount)
}

function smoothstep01(value: number) {
  const amount = Math.min(1, Math.max(0, value))
  return amount * amount * (3 - 2 * amount)
}

function phasePulse(phase: number, center: number, width: number) {
  const wrappedDistance = Math.min(Math.abs(phase - center), 1 - Math.abs(phase - center))
  return smoothstep01(1 - wrappedDistance / width)
}

function phaseWindow(phase: number, start: number, end: number) {
  return smoothstep01((phase - start) / 0.055) * (1 - smoothstep01((phase - end) / 0.075))
}

function getHopMotion(time: number, amount: number) {
  const hopAmount = Math.min(1.35, Math.max(0, amount))
  const period = 1.36
  const phase = (time / period) % 1
  const prep = phasePulse(phase, 0.11, 0.12) * hopAmount
  const launch = phasePulse(phase, 0.24, 0.1) * hopAmount
  const land = phasePulse(phase, 0.76, 0.11) * hopAmount
  const recovery = phasePulse(phase, 0.88, 0.12) * hopAmount
  const airborne = phaseWindow(phase, 0.21, 0.77) * hopAmount
  const airT = Math.min(1, Math.max(0, (phase - 0.21) / 0.56))
  const arc = Math.pow(Math.sin(airT * Math.PI), 0.82) * airborne
  const tinyShake = (Math.sin(time * 20.5) * 0.004 + Math.sin(time * 29.5 + 0.4) * 0.002) * (land + recovery)

  return {
    phase,
    prep,
    launch,
    land,
    recovery,
    airborne,
    height: arc * 0.56 - prep * 0.044 - land * 0.03 + recovery * 0.018,
    x: Math.sin(phase * Math.PI * 2) * 0.014 * hopAmount + tinyShake,
    rotateZ: (Math.sin(phase * Math.PI * 2 + 0.35) * 0.035 + launch * 0.018 - land * 0.028) * hopAmount,
    rotateX: (-prep * 0.035 + launch * 0.052 - land * 0.045 + recovery * 0.02) * hopAmount,
    scaleX: 1 + prep * 0.07 - launch * 0.035 + land * 0.14 - recovery * 0.035,
    scaleY: 1 - prep * 0.105 + launch * 0.135 - land * 0.175 + recovery * 0.055,
    scaleZ: 1 + prep * 0.035 + launch * 0.045 + land * 0.05,
    shadowScale: 1 + prep * 0.12 + land * 0.28 - arc * 0.42 + recovery * 0.07,
    shadowOpacity: 0.18 + prep * 0.055 + land * 0.09 - arc * 0.1,
  }
}

function getHopExpressionMotion(time: number, amount: number) {
  const hop = getHopMotion(time, amount)
  const intensity = Math.min(1, Math.max(0, amount))
  const faceFocus = Math.min(1, hop.prep * 0.62 + hop.land * 0.5)
  const eyeWide = Math.min(1, hop.launch * 0.85 + hop.airborne * 0.34 + hop.recovery * 0.14)
  const blink = Math.min(0.88, hop.land * 0.72 + hop.prep * 0.22)
  const mouthOpen = Math.min(1, hop.launch * 0.42 + hop.airborne * 0.28 + hop.land * 0.18)
  const smile = Math.min(1, hop.airborne * 0.5 + hop.recovery * 0.3 + hop.launch * 0.2)
  const tinySettle = (Math.sin(time * 18.5) * 0.004 + Math.sin(time * 29.2 + 0.7) * 0.002) * (hop.land + hop.recovery)

  return {
    ...hop,
    faceFocus,
    eyeWide,
    blink,
    mouthOpen,
    smile,
    eyeLift: (hop.launch * 0.014 + hop.airborne * 0.01 - hop.land * 0.012 - hop.prep * 0.006) * intensity,
    pupilY: (hop.launch * 0.024 + hop.airborne * 0.016 - hop.land * 0.016 - hop.prep * 0.006) * intensity,
    pupilInward: (hop.prep * 0.01 + hop.land * 0.007 - hop.airborne * 0.003) * intensity,
    mouthY: (hop.launch * 0.008 + hop.airborne * 0.006 - hop.land * 0.014 - hop.prep * 0.006 + tinySettle) * intensity,
    cheekSquash: Math.min(1, hop.land * 0.9 + hop.prep * 0.35),
  }
}

function getWizardGrumbleMotion(time: number, amount: number) {
  const grumbleAmount = Math.min(1.35, Math.max(0, amount))
  const period = 2.55
  const phase = (time / period) % 1
  const firstMutter = phaseWindow(phase, 0.03, 0.35)
  const secondMutter = phaseWindow(phase, 0.62, 0.93)
  const talkWindow = Math.min(1, firstMutter + secondMutter) * grumbleAmount
  const syllable = Math.pow(Math.max(0, Math.sin(time * 16.8 + 0.24)), 0.72) * talkWindow
  const smallSyllable = Math.pow(Math.max(0, Math.sin(time * 25.6 + 1.1)), 1.35) * talkWindow
  const prep = phasePulse(phase, 0.42, 0.13) * grumbleAmount
  const hit = phasePulse(phase, 0.515, 0.052) * grumbleAmount
  const rebound = phasePulse(phase, 0.59, 0.08) * grumbleAmount
  const afterTap = phasePulse(phase, 0.76, 0.055) * grumbleAmount * 0.38
  const impact = Math.max(hit, afterTap)
  const chatter = (Math.sin(time * 18.2) * 0.006 + Math.sin(time * 29.4 + 0.7) * 0.0035) * talkWindow
  const annoyedLean = (Math.sin(time * 1.1 + 0.45) * 0.01 + Math.sin(time * 2.15) * 0.004) * grumbleAmount

  return {
    phase,
    talk: talkWindow,
    syllable,
    mouthOpen: Math.min(1, syllable * 0.85 + smallSyllable * 0.42 + hit * 0.22),
    prep,
    hit,
    rebound,
    afterTap,
    impact,
    chatter,
    brow: Math.min(1, talkWindow * 0.34 + prep * 0.24 + hit * 0.85),
    bodyLean: annoyedLean - prep * 0.018 + hit * 0.012 - afterTap * 0.006,
    bodyJolt: -hit * 0.034 + rebound * 0.018 - afterTap * 0.014,
    staffLift: prep * 0.125 - hit * 0.09 + rebound * 0.036 - afterTap * 0.04,
    staffTilt: -prep * 0.16 + hit * 0.21 - rebound * 0.08 + afterTap * 0.09,
  }
}

function createHeadPotBodyGeometry() {
  const points = [
    new THREE.Vector2(0.18, -0.19),
    new THREE.Vector2(0.3, -0.175),
    new THREE.Vector2(0.39, -0.085),
    new THREE.Vector2(0.4, 0.052),
    new THREE.Vector2(0.34, 0.145),
    new THREE.Vector2(0.25, 0.18),
  ]
  const geometry = new THREE.LatheGeometry(points, 16)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const band = y < -0.12 ? 0.92 : y > 0.09 ? 1.03 : 1
    const wobble = 1 + 0.022 * Math.sin(index * 1.91) + 0.014 * Math.cos(y * 18 + z * 5)
    position.setXYZ(index, x * band * wobble, y + 0.006 * Math.sin(x * 11 + z * 7), z * band * wobble)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createHeadPotLipGeometry() {
  const points = [
    new THREE.Vector2(0.24, -0.034),
    new THREE.Vector2(0.36, -0.036),
    new THREE.Vector2(0.44, -0.012),
    new THREE.Vector2(0.46, 0.018),
    new THREE.Vector2(0.39, 0.048),
    new THREE.Vector2(0.25, 0.044),
  ]
  const geometry = new THREE.LatheGeometry(points, 18)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const wobble = 1 + 0.016 * Math.sin(index * 2.23) + 0.01 * Math.cos(z * 8.5)
    position.setXYZ(index, x * wobble, y + 0.003 * Math.sin(x * 14 + z * 4), z * wobble)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createHeadPotBaseBandGeometry() {
  const points = [
    new THREE.Vector2(0.19, -0.022),
    new THREE.Vector2(0.29, -0.028),
    new THREE.Vector2(0.34, -0.006),
    new THREE.Vector2(0.31, 0.02),
    new THREE.Vector2(0.2, 0.024),
  ]
  const geometry = new THREE.LatheGeometry(points, 16)
  geometry.computeVertexNormals()
  return geometry
}

function createOrganicGrassPlatformGeometry({
  radiusX,
  radiusZ,
  thickness,
  phase = 0,
}: {
  radiusX: number
  radiusZ: number
  thickness: number
  phase?: number
}) {
  const segments = 54
  const vertices: number[] = [0, thickness * 0.38, 0, 0, -thickness * 0.22, 0]
  const indices: number[] = []

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    const ripple = 1
      + Math.sin(angle * 3 + phase) * 0.045
      + Math.cos(angle * 5.3 - phase * 0.7) * 0.026
      + Math.sin(index * 1.77 + phase * 0.3) * 0.018
    const x = Math.cos(angle) * radiusX * ripple
    const z = Math.sin(angle) * radiusZ * (ripple + Math.sin(angle + phase) * 0.018)
    const crown = thickness * (0.31 + 0.05 * Math.sin(angle * 2.2 + phase))
    const root = -thickness * (0.23 + 0.035 * Math.cos(angle * 2.7 - phase))
    const undersideInset = 0.74 + Math.sin(angle * 4.1 + phase) * 0.035
    vertices.push(x, crown, z)
    vertices.push(x * undersideInset, root, z * undersideInset)
  }

  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments
    const top = 2 + index * 2
    const bottom = top + 1
    const nextTop = 2 + next * 2
    const nextBottom = nextTop + 1
    indices.push(0, nextTop, top)
    indices.push(1, bottom, nextBottom)
    indices.push(top, nextTop, bottom)
    indices.push(nextTop, nextBottom, bottom)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function CurvedTube({
  points,
  radius,
  color,
  outlineWidth = 0.006,
}: {
  points: [number, number, number][]
  radius: number
  color: string
  outlineWidth?: number
}) {
  const pointKey = points.map((point) => point.join(',')).join('|')
  const geometry = useMemo(() => {
    const curvePoints = pointKey.split('|').map((point) => {
      const [x, y, z] = point.split(',').map(Number)
      return new THREE.Vector3(x, y, z)
    })
    const curve = new THREE.CatmullRomCurve3(
      curvePoints,
      false,
      'centripetal',
      0.6,
    )
    return new THREE.TubeGeometry(curve, 12, radius, 7, false)
  }, [pointKey, radius])

  return (
    <CodedAssetOutlineMesh
      outlineWidth={outlineWidth}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={toon(color)}
    />
  )
}

function AccessoryLeaf({
  position,
  rotation = 0,
  scale = [0.07, 0.1, 1],
  color = LEAF_MID,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: [number, number, number]
  color?: string
}) {
  const undersideColor = color === GRASS_DARK ? STEM_DARK : color

  return (
    <group position={position} rotation-z={rotation}>
      <CodedAssetOutlineMesh
        position={[-0.003, 0.032, 0]}
        rotation-z={-0.08}
        scale={[scale[0] * 0.74, scale[1] * 0.84, 0.03]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={toon(color)}
      />
      <CodedAssetOutlineMesh
        position={[0.01, -0.034, -0.004]}
        rotation-z={0.22}
        scale={[scale[0] * 0.56, scale[1] * 0.46, 0.022]}
        outlineWidth={0.004}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={toon(undersideColor)}
      />
      <mesh position={[0.004, 0.016, -0.046]} rotation-z={0.04} scale={[0.005, scale[1] * 0.5, 0.0035]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={STEM_DARK} />
      </mesh>
      <mesh position={[-0.018, 0.064, -0.05]} rotation-z={-0.3} scale={[scale[0] * 0.28, scale[1] * 0.08, 0.003]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} />
      </mesh>
    </group>
  )
}

function createHibiscusCorollaConeGeometry(phase = 0) {
  const depthSegments = 12
  const radialSegments = 72
  const vertices: number[] = []
  const indices: number[] = []

  for (let depthIndex = 0; depthIndex <= depthSegments; depthIndex += 1) {
    const t = depthIndex / depthSegments
    const flare = Math.pow(t, 0.84)
    const z = 0.246 - flare * 0.43
    const baseRadius = 0.026 + flare * 0.314

    for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2
      const petalPhase = angle * 5 + phase
      const lobeAmount = Math.max(0, Math.cos(petalPhase))
      const valleyAmount = Math.max(0, -Math.cos(petalPhase))
      const petalLobe = 1 + lobeAmount * 0.31 * Math.pow(t, 1.18)
      const petalValley = 1 - valleyAmount * 0.22 * Math.pow(t, 1.34)
      const rimScallop = t > 0.66 ? Math.sin(angle * 10 + phase * 0.4) * 0.018 * Math.pow((t - 0.66) / 0.34, 1.15) : 0
      const radius = baseRadius * petalLobe * petalValley + rimScallop
      const rimCurl = t > 0.72 ? Math.pow((t - 0.72) / 0.28, 1.6) * (0.034 + lobeAmount * 0.038) : 0
      const petalPuff = lobeAmount * 0.04 * Math.pow(Math.sin(t * Math.PI), 0.72) * (0.35 + t * 0.65)
      const valleyTuck = valleyAmount * 0.02 * Math.pow(t, 1.16)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius * 0.92 + Math.sin(petalPhase) * 0.008 * t
      vertices.push(x, y, z + petalPuff - valleyTuck - rimCurl)
    }
  }

  for (let depthIndex = 0; depthIndex < depthSegments; depthIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const row = radialSegments + 1
      const base = depthIndex * row + radialIndex
      indices.push(base, base + 1, base + row)
      indices.push(base + 1, base + row + 1, base + row)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function JuicyPetalHighlight({
  position,
  rotation = 0,
  scale,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 8, 4]} />
      <meshBasicMaterial color={HIBISCUS_RED_JUICE} transparent opacity={0.48} depthWrite={false} />
    </mesh>
  )
}

function PotPaintStroke({
  position,
  rotation = 0,
  scale,
  color,
  opacity = 0.34,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color: string
  opacity?: number
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 8, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function PottedSoilSurface() {
  const soilClumps: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity?: number
  }[] = [
    { position: [-0.168, 0.199, -0.094], scale: [0.116, 0.02, 0.066], color: SOIL_LIGHT },
    { position: [-0.006, 0.203, -0.07], scale: [0.174, 0.026, 0.094], color: SOIL_MID },
    { position: [0.168, 0.199, -0.094], scale: [0.122, 0.02, 0.068], color: SOIL_DARK },
    { position: [-0.11, 0.208, -0.16], scale: [0.1, 0.016, 0.048], color: SOIL_DARK, opacity: 0.78 },
    { position: [0.112, 0.208, -0.158], scale: [0.106, 0.016, 0.05], color: SOIL_DUST, opacity: 0.76 },
    { position: [0.176, 0.209, -0.03], scale: [0.068, 0.014, 0.054], color: SOIL_DARK, opacity: 0.82 },
    { position: [-0.072, 0.198, 0.006], scale: [0.07, 0.014, 0.042], color: SOIL_DUST, opacity: 0.56 },
    { position: [0.086, 0.198, -0.002], scale: [0.064, 0.012, 0.04], color: SOIL_LIGHT, opacity: 0.56 },
  ]
  const soilPebbles: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.155, 0.198, -0.052], scale: [0.01, 0.005, 0.006], color: SOIL_DUST, opacity: 0.7 },
    { position: [-0.07, 0.2, -0.132], scale: [0.008, 0.004, 0.006], color: SOIL_DARK, opacity: 0.54 },
    { position: [0.022, 0.202, 0.018], scale: [0.009, 0.004, 0.006], color: SOIL_DUST, opacity: 0.54 },
    { position: [0.128, 0.198, -0.06], scale: [0.011, 0.005, 0.007], color: SOIL_LIGHT, opacity: 0.62 },
    { position: [0.056, 0.202, -0.142], scale: [0.007, 0.004, 0.005], color: SOIL_DARK, opacity: 0.5 },
  ]

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, 0.194, -0.056]}
        scale={[0.376, 0.018, 0.228]}
        outlineWidth={0.004}
        geometry={<cylinderGeometry args={[1, 1, 1, 24]} />}
        material={toon(SOIL_MID)}
      />
      <mesh position={[0.0, 0.21, -0.13]} rotation-z={0.02} scale={[0.334, 0.014, 0.104]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.88} depthWrite={false} />
      </mesh>
      <mesh position={[0.012, 0.211, -0.028]} rotation-z={0.03} scale={[0.328, 0.014, 0.092]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.82} depthWrite={false} />
      </mesh>
      <mesh position={[0.0, 0.208, -0.075]} rotation-z={-0.03} scale={[0.304, 0.012, 0.096]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_LIGHT} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[0.016, 0.212, -0.088]} rotation-z={0.04} scale={[0.33, 0.012, 0.136]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh position={[-0.052, 0.202, -0.036]} rotation-z={-0.08} scale={[0.202, 0.008, 0.096]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      {soilClumps.map((clump, index) => (
        <mesh key={`pot-soil-clump-${index}`} position={clump.position} scale={clump.scale}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={clump.color} transparent={clump.opacity !== undefined} opacity={clump.opacity ?? 1} />
        </mesh>
      ))}
      <mesh position={[-0.062, 0.202, -0.048]} rotation-z={-0.24} scale={[0.035, 0.005, 0.014]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.68} depthWrite={false} />
      </mesh>
      <mesh position={[0.072, 0.202, -0.044]} rotation-z={0.28} scale={[0.036, 0.005, 0.014]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={SOIL_DARK} transparent opacity={0.62} depthWrite={false} />
      </mesh>
      {soilPebbles.map((pebble, index) => (
        <OrganicDetailDot
          key={`pot-soil-pebble-${index}`}
          position={pebble.position}
          scale={pebble.scale}
          color={pebble.color}
          opacity={pebble.opacity}
        />
      ))}
    </group>
  )
}

function OrganicDetailStroke({
  position,
  rotation = 0,
  scale,
  color = VAC_ASSET_DETAIL_INK,
  opacity = 0.48,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
  opacity?: number
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 7, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function OrganicDetailDot({
  position,
  scale,
  color = VAC_ASSET_DETAIL_INK,
  opacity = 0.5,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  color?: string
  opacity?: number
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function HibiscusFlower({
  position,
  scale = 1,
  rotation = 0,
  activity = 1,
}: {
  position: [number, number, number]
  scale?: number
  rotation?: number
  activity?: number
}) {
  const flowerGroup = useRef<THREE.Group>(null)
  const corollaGeometry = useMemo(() => createHibiscusCorollaConeGeometry(rotation), [rotation])
  const throatGuides: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
  }[] = [
    { position: [0, 0.066, 0.032], rotation: 0, scale: [0.01, 0.098, 0.006] },
    { position: [-0.055, 0.024, 0.03], rotation: 0.88, scale: [0.009, 0.08, 0.006] },
    { position: [0.055, 0.024, 0.03], rotation: -0.88, scale: [0.009, 0.08, 0.006] },
    { position: [-0.034, -0.048, 0.032], rotation: -0.54, scale: [0.008, 0.064, 0.005] },
    { position: [0.034, -0.048, 0.032], rotation: 0.54, scale: [0.008, 0.064, 0.005] },
  ]
  const petalPuffs: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [0, 0.188, -0.116], rotation: 0.08, scale: [0.086, 0.032, 0.012], color: HIBISCUS_RED_JUICE, opacity: 0.44 },
    { position: [-0.138, 0.086, -0.118], rotation: 0.72, scale: [0.094, 0.03, 0.012], color: HIBISCUS_RED_JUICE, opacity: 0.38 },
    { position: [0.142, 0.072, -0.12], rotation: -0.66, scale: [0.088, 0.03, 0.012], color: HIBISCUS_RED_JUICE, opacity: 0.38 },
    { position: [-0.092, -0.118, -0.106], rotation: -0.64, scale: [0.078, 0.026, 0.011], color: HIBISCUS_RED_LIGHT, opacity: 0.32 },
    { position: [0.098, -0.116, -0.108], rotation: 0.66, scale: [0.076, 0.026, 0.011], color: HIBISCUS_RED_LIGHT, opacity: 0.32 },
    { position: [-0.178, -0.006, -0.118], rotation: 1.08, scale: [0.064, 0.024, 0.011], color: HIBISCUS_RED_JUICE, opacity: 0.28 },
    { position: [0.184, -0.012, -0.118], rotation: -1.08, scale: [0.064, 0.024, 0.011], color: HIBISCUS_RED_JUICE, opacity: 0.28 },
    { position: [-0.018, 0.244, -0.184], rotation: 0.18, scale: [0.07, 0.018, 0.009], color: HIBISCUS_RED_LIGHT, opacity: 0.28 },
  ]
  const petalFoldShadows: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [0.002, 0.082, 0.096], rotation: 0.02, scale: [0.026, 0.088, 0.01], opacity: 0.46 },
    { position: [-0.066, 0.036, 0.092], rotation: 0.76, scale: [0.022, 0.076, 0.01], opacity: 0.4 },
    { position: [0.066, 0.036, 0.092], rotation: -0.76, scale: [0.022, 0.076, 0.01], opacity: 0.4 },
    { position: [-0.042, -0.058, 0.096], rotation: -0.56, scale: [0.02, 0.06, 0.009], opacity: 0.34 },
    { position: [0.044, -0.058, 0.096], rotation: 0.56, scale: [0.02, 0.06, 0.009], opacity: 0.34 },
  ]
  const petalFineVeins: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [0.002, 0.184, -0.128], rotation: 0.04, scale: [0.007, 0.08, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.26 },
    { position: [-0.098, 0.112, -0.122], rotation: 0.72, scale: [0.006, 0.066, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.2 },
    { position: [0.104, 0.104, -0.124], rotation: -0.72, scale: [0.006, 0.064, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.2 },
    { position: [-0.136, -0.02, -0.106], rotation: 1.18, scale: [0.005, 0.052, 0.004], color: HIBISCUS_GUIDE_MAROON, opacity: 0.18 },
    { position: [0.14, -0.022, -0.106], rotation: -1.18, scale: [0.005, 0.052, 0.004], color: HIBISCUS_GUIDE_MAROON, opacity: 0.18 },
    { position: [-0.054, -0.13, -0.096], rotation: -0.5, scale: [0.005, 0.048, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.17 },
    { position: [0.058, -0.128, -0.098], rotation: 0.52, scale: [0.005, 0.048, 0.004], color: HIBISCUS_RED_DARK, opacity: 0.17 },
  ]
  const petalRimNicks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
  }[] = [
    { position: [-0.22, 0.05, -0.12], rotation: 0.82, scale: [0.005, 0.03, 0.004] },
    { position: [0.224, 0.06, -0.124], rotation: -0.86, scale: [0.005, 0.032, 0.004] },
    { position: [-0.028, 0.292, -0.19], rotation: 0.18, scale: [0.005, 0.034, 0.004] },
    { position: [0.08, -0.202, -0.078], rotation: 0.44, scale: [0.004, 0.026, 0.004] },
  ]
  const petalEdgeHighlights: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-0.108, 0.186, -0.165], rotation: 0.5, scale: [0.052, 0.009, 0.005], opacity: 0.34 },
    { position: [0.116, 0.176, -0.168], rotation: -0.48, scale: [0.048, 0.009, 0.005], opacity: 0.32 },
    { position: [-0.18, -0.054, -0.108], rotation: 1.02, scale: [0.042, 0.008, 0.005], opacity: 0.28 },
    { position: [0.184, -0.05, -0.11], rotation: -1.02, scale: [0.042, 0.008, 0.005], opacity: 0.28 },
    { position: [0.01, -0.204, -0.07], rotation: -0.04, scale: [0.048, 0.008, 0.005], opacity: 0.24 },
  ]
  const throatPollenDust: {
    position: [number, number, number]
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-0.034, 0.004, 0.258], scale: [0.008, 0.007, 0.005], opacity: 0.5 },
    { position: [0.026, -0.036, 0.264], scale: [0.007, 0.006, 0.005], opacity: 0.44 },
    { position: [0.042, 0.018, 0.252], scale: [0.006, 0.006, 0.004], opacity: 0.4 },
  ]
  const anthers: {
    position: [number, number, number]
    scale: [number, number, number]
    rotation: number
  }[] = [
    { position: [0.004, 0.064, 0.102], scale: [0.014, 0.01, 0.009], rotation: -0.28 },
    { position: [0.006, 0.11, 0.034], scale: [0.017, 0.011, 0.009], rotation: 0.3 },
    { position: [0.006, 0.158, -0.046], scale: [0.017, 0.011, 0.009], rotation: -0.22 },
    { position: [0.008, 0.208, -0.134], scale: [0.018, 0.012, 0.01], rotation: 0.36 },
    { position: [0.008, 0.258, -0.222], scale: [0.019, 0.014, 0.011], rotation: -0.16 },
    { position: [-0.018, 0.294, -0.27], scale: [0.017, 0.016, 0.012], rotation: 0.38 },
    { position: [0.024, 0.302, -0.286], scale: [0.018, 0.016, 0.012], rotation: -0.34 },
    { position: [0.002, 0.33, -0.306], scale: [0.023, 0.02, 0.014], rotation: 0.04 },
  ]

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const bloomBreath = Math.sin(t * 1.32 + rotation * 1.7) * 0.014 * motion
    const idleShake = Math.sin(t * 7.2 + rotation) * 0.006 * motion
    const tinyExcitedFlutter = idlePulse(t + rotation * 0.7, 6.2, 0.72, 0.045) * motion

    if (flowerGroup.current) {
      flowerGroup.current.position.set(position[0] + idleShake * 0.34, position[1] + bloomBreath * 0.35, position[2])
      flowerGroup.current.rotation.z = rotation + Math.sin(t * 1.1 + rotation) * 0.022 * motion + idleShake
      flowerGroup.current.rotation.x = Math.sin(t * 1.42 + rotation * 2.1) * 0.032 * motion + tinyExcitedFlutter * 0.05
      flowerGroup.current.scale.setScalar(scale * (1 + bloomBreath + tinyExcitedFlutter * 0.026))
    }
  })

  return (
    <group ref={flowerGroup} position={position} rotation-z={rotation} scale={scale}>
      <mesh
        position={[0, 0, -0.016]}
        scale={[1.02, 1.02, 1]}
        geometry={corollaGeometry}
      >
        {toonDoubleSided(HIBISCUS_RED_LIGHT)}
      </mesh>
      <JuicyPetalHighlight position={[-0.082, 0.102, -0.118]} rotation={0.42} scale={[0.075, 0.02, 0.007]} />
      <mesh position={[0.11, 0.016, -0.112]} rotation-z={-0.34} scale={[0.066, 0.018, 0.007]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={HIBISCUS_RED} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {petalPuffs.map((puff, index) => (
        <mesh
          key={`hibiscus-petal-puff-${index}`}
          position={puff.position}
          rotation-z={puff.rotation}
          scale={puff.scale}
        >
          <sphereGeometry args={[1, 9, 5]} />
          <meshBasicMaterial color={puff.color} transparent opacity={puff.opacity} depthWrite={false} />
        </mesh>
      ))}
      {petalFineVeins.map((vein, index) => (
        <OrganicDetailStroke
          key={`hibiscus-fine-vein-${index}`}
          position={vein.position}
          rotation={vein.rotation}
          scale={vein.scale}
          color={vein.color}
          opacity={vein.opacity}
        />
      ))}
      {petalRimNicks.map((nick, index) => (
        <OrganicDetailStroke
          key={`hibiscus-rim-nick-${index}`}
          position={nick.position}
          rotation={nick.rotation}
          scale={nick.scale}
          color={HIBISCUS_RED_JUICE}
          opacity={0.28}
        />
      ))}
      {petalEdgeHighlights.map((highlight, index) => (
        <OrganicDetailStroke
          key={`hibiscus-edge-highlight-${index}`}
          position={highlight.position}
          rotation={highlight.rotation}
          scale={highlight.scale}
          color={STAMEN_YELLOW_LIGHT}
          opacity={highlight.opacity}
        />
      ))}
      <mesh position={[0.006, -0.018, 0.112]} rotation-z={-0.12} scale={[0.174, 0.132, 0.024]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_RED_DARK} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[0.002, -0.016, 0.126]} rotation-z={0.02} scale={[0.208, 0.152, 0.026]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0.002, -0.018, 0.144]} rotation-z={0.04} scale={[0.136, 0.11, 0.024]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} transparent opacity={0.52} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.014, 0.162]} scale={[0.108, 0.088, 0.018]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_BROWN} />
      </mesh>
      {petalFoldShadows.map((shadow, index) => (
        <mesh
          key={`hibiscus-fold-shadow-${index}`}
          position={shadow.position}
          rotation-z={shadow.rotation}
          scale={shadow.scale}
        >
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={HIBISCUS_THROAT_DARK} transparent opacity={shadow.opacity} depthWrite={false} />
        </mesh>
      ))}
      {throatGuides.map((guide, index) => (
        <mesh
          key={`hibiscus-throat-guide-${index}`}
          position={guide.position}
          rotation-z={guide.rotation}
          scale={guide.scale}
        >
          <sphereGeometry args={[1, 7, 4]} />
          <meshBasicMaterial color={HIBISCUS_GUIDE_MAROON} />
        </mesh>
      ))}
      <mesh position={[0, -0.014, 0.194]} scale={[0.082, 0.068, 0.018]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={HIBISCUS_RED_DARK} />
      </mesh>
      <mesh position={[0, -0.017, 0.222]} scale={[0.058, 0.048, 0.014]}>
        <sphereGeometry args={[1, 9, 5]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_BROWN} />
      </mesh>
      <mesh position={[0.006, -0.018, 0.242]} scale={[0.034, 0.03, 0.01]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} />
      </mesh>
      <mesh position={[-0.026, 0.026, 0.248]} rotation-z={0.54} scale={[0.036, 0.009, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#120306" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[0.032, -0.036, 0.248]} rotation-z={-0.42} scale={[0.032, 0.008, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#120306" transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh position={[0.012, -0.058, 0.246]} rotation-z={0.12} scale={[0.038, 0.034, 0.011]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={HIBISCUS_THROAT_DARK} />
      </mesh>
      {throatPollenDust.map((dust, index) => (
        <OrganicDetailDot
          key={`hibiscus-throat-pollen-${index}`}
          position={dust.position}
          scale={dust.scale}
          color={STAMEN_YELLOW_LIGHT}
          opacity={dust.opacity}
        />
      ))}
      <CurvedTube
        points={[
          [0.006, -0.018, 0.242],
          [0.006, 0.07, 0.102],
          [0.008, 0.19, -0.102],
          [0.004, 0.33, -0.306],
        ]}
        radius={0.01}
        color={STAMEN_YELLOW}
        outlineWidth={0.004}
      />
      {anthers.map((anther, index) => (
        <CodedAssetOutlineMesh
          key={`hibiscus-stamen-${index}`}
          position={anther.position}
          rotation-z={anther.rotation}
          scale={anther.scale}
          outlineWidth={0.003}
          geometry={<sphereGeometry args={[1, 7, 5]} />}
          material={toon(STAMEN_YELLOW)}
        />
      ))}
      <mesh position={[0.002, 0.212, -0.146]} rotation-z={-0.08} scale={[0.052, 0.014, 0.006]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color={STAMEN_YELLOW_LIGHT} />
      </mesh>
    </group>
  )
}

function HeadHibiscusPotAccessory({ activity = 1 }: { activity?: number }) {
  const potGeometry = useMemo(() => createHeadPotBodyGeometry(), [])
  const potLipGeometry = useMemo(() => createHeadPotLipGeometry(), [])
  const potBaseBandGeometry = useMemo(() => createHeadPotBaseBandGeometry(), [])
  const flowerCluster = useRef<THREE.Group>(null)
  const potGroup = useRef<THREE.Group>(null)
  const potClayFlecks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.215, 0.062, -0.301], rotation: -0.4, scale: [0.018, 0.005, 0.003], color: POT_BLUE_DARK, opacity: 0.28 },
    { position: [-0.156, -0.024, -0.302], rotation: 0.2, scale: [0.012, 0.004, 0.003], color: POT_BLUE_SHADOW, opacity: 0.32 },
    { position: [0.184, 0.026, -0.3], rotation: -0.12, scale: [0.016, 0.005, 0.003], color: POT_BLUE_DARK, opacity: 0.24 },
    { position: [0.038, -0.06, -0.303], rotation: 0.32, scale: [0.01, 0.004, 0.003], color: POT_CLAY_WASH, opacity: 0.34 },
    { position: [-0.004, 0.112, -0.303], rotation: -0.2, scale: [0.012, 0.004, 0.003], color: POT_BLUE_LIGHT, opacity: 0.3 },
    { position: [0.222, -0.074, -0.294], rotation: 0.48, scale: [0.014, 0.004, 0.003], color: POT_BLUE_SHADOW, opacity: 0.28 },
    { position: [-0.242, 0.012, -0.286], rotation: -0.16, scale: [0.012, 0.004, 0.003], color: POT_CLAY_WASH, opacity: 0.26 },
    { position: [0.246, 0.088, -0.28], rotation: 0.18, scale: [0.011, 0.004, 0.003], color: POT_BLUE_LIGHT, opacity: 0.24 },
    { position: [0.004, -0.128, -0.276], rotation: -0.1, scale: [0.013, 0.004, 0.003], color: POT_BLUE_DARK, opacity: 0.24 },
  ]

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const jitter = Math.sin(t * 9.2) * 0.004 * motion + Math.sin(t * 14.8 + 0.6) * 0.0025 * motion
    if (flowerCluster.current) {
      flowerCluster.current.position.x = jitter * 0.48
      flowerCluster.current.position.y = 0.125 + Math.sin(t * 1.45 + 0.3) * 0.008 * motion + happySnug * 0.018
      flowerCluster.current.rotation.z = Math.sin(t * 1.7) * 0.034 * motion - happySnug * 0.024 + jitter
      flowerCluster.current.rotation.x = Math.sin(t * 1.2 + 0.6) * 0.018 * motion + happySnug * 0.038
      flowerCluster.current.scale.set(1 + happySnug * 0.018, 1 + happySnug * 0.028, 1)
    }
    if (potGroup.current) {
      potGroup.current.position.x = -jitter * 0.18
      potGroup.current.position.y = Math.sin(t * 1.24 + 1.2) * 0.006 * motion - happySnug * 0.006
      potGroup.current.rotation.z = -0.055 + Math.sin(t * 2.05) * 0.01 * motion + happySnug * 0.018 - jitter * 0.6
      potGroup.current.scale.set(1 + happySnug * 0.012, 1 - happySnug * 0.008, 1)
    }
  })

  return (
    <group position={[0.02, 0.695, -0.205]} scale={0.9}>
      <mesh position={[0.012, -0.195, 0.05]} rotation-z={-0.08} scale={[0.34, 0.045, 0.082]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      <group ref={potGroup} rotation-z={-0.055}>
        <CodedAssetOutlineMesh
          position={[0, -0.008, 0]}
          scale={[0.92, 0.9, 0.72]}
          outlineWidth={0.018}
          geometry={<primitive object={potGeometry} attach="geometry" />}
          material={toon(POT_BLUE_MID)}
        />
        <CodedAssetOutlineMesh
          position={[0, 0.166, 0]}
          scale={[0.92, 1, 0.72]}
          outlineWidth={0.012}
          geometry={<primitive object={potLipGeometry} attach="geometry" />}
          material={toon(POT_BLUE_DARK)}
        />
        <PotPaintStroke
          position={[-0.135, 0.024, -0.288]}
          rotation={-0.28}
          scale={[0.112, 0.022, 0.006]}
          color={POT_BLUE_LIGHT}
          opacity={0.36}
        />
        <PotPaintStroke
          position={[0.082, 0.082, -0.292]}
          rotation={0.22}
          scale={[0.138, 0.022, 0.006]}
          color={POT_CLAY_WASH}
          opacity={0.3}
        />
        <PotPaintStroke
          position={[0.012, 0.148, -0.292]}
          rotation={-0.045}
          scale={[0.21, 0.018, 0.006]}
          color={POT_BLUE_SHADOW}
          opacity={0.34}
        />
        <PotPaintStroke
          position={[-0.096, 0.158, -0.298]}
          rotation={-0.24}
          scale={[0.052, 0.01, 0.004]}
          color={POT_BLUE_DARK}
          opacity={0.3}
        />
        <PotPaintStroke
          position={[0.102, 0.154, -0.298]}
          rotation={0.18}
          scale={[0.048, 0.009, 0.004]}
          color={POT_BLUE_DARK}
          opacity={0.28}
        />
        <PotPaintStroke
          position={[0.116, -0.098, -0.266]}
          rotation={0.18}
          scale={[0.098, 0.018, 0.006]}
          color={POT_BLUE_SHADOW}
          opacity={0.3}
        />
        <PotPaintStroke
          position={[-0.044, -0.15, -0.258]}
          rotation={0.04}
          scale={[0.16, 0.016, 0.006]}
          color={POT_BLUE_SHADOW}
          opacity={0.34}
        />
        <PotPaintStroke
          position={[-0.126, 0.062, -0.304]}
          rotation={-0.2}
          scale={[0.17, 0.015, 0.005]}
          color={POT_MATTE_DUST}
          opacity={0.26}
        />
        <PotPaintStroke
          position={[0.142, -0.026, -0.286]}
          rotation={0.28}
          scale={[0.13, 0.013, 0.005]}
          color={POT_MATTE_DUST}
          opacity={0.18}
        />
        <PotPaintStroke
          position={[0.018, 0.184, -0.304]}
          rotation={-0.04}
          scale={[0.24, 0.012, 0.005]}
          color={POT_BLUE_LIGHT}
          opacity={0.24}
        />
        <PotPaintStroke
          position={[-0.176, -0.08, -0.268]}
          rotation={-0.4}
          scale={[0.052, 0.012, 0.004]}
          color={POT_BLUE_LIGHT}
          opacity={0.26}
        />
        {potClayFlecks.map((fleck, index) => (
          <OrganicDetailStroke
            key={`pot-clay-fleck-${index}`}
            position={fleck.position}
            rotation={fleck.rotation}
            scale={fleck.scale}
            color={fleck.color}
            opacity={fleck.opacity}
          />
        ))}
        <mesh position={[0, 0.186, -0.056]} scale={[0.382, 0.018, 0.234]}>
          <cylinderGeometry args={[1, 1, 1, 18]} />
          <meshBasicMaterial color={SOIL_DARK} />
        </mesh>
        <PottedSoilSurface />
        <CodedAssetOutlineMesh
          position={[0, -0.19, 0]}
          scale={[0.92, 0.72, 0.72]}
          outlineWidth={0.008}
          geometry={<primitive object={potBaseBandGeometry} attach="geometry" />}
          material={toon(POT_BLUE_SHADOW)}
        />
      </group>
      <group ref={flowerCluster} position={[0, 0.125, 0.01]}>
        <mesh position={[0.002, 0.018, -0.016]} rotation-z={-0.03} scale={[0.13, 0.018, 0.046]}>
          <sphereGeometry args={[1, 10, 5]} />
          <meshBasicMaterial color={SOIL_DARK} />
        </mesh>
        <mesh position={[-0.04, 0.028, -0.02]} rotation-z={-0.2} scale={[0.052, 0.01, 0.02]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={SOIL_LIGHT} />
        </mesh>
        <mesh position={[0.058, 0.026, -0.024]} rotation-z={0.24} scale={[0.044, 0.009, 0.018]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={SOIL_MID} />
        </mesh>
        <OrganicDetailDot position={[-0.078, 0.032, -0.026]} scale={[0.007, 0.0035, 0.004]} color={SOIL_DUST} opacity={0.64} />
        <OrganicDetailDot position={[0.082, 0.03, -0.028]} scale={[0.006, 0.0035, 0.004]} color={SOIL_DUST} opacity={0.56} />
        <CurvedTube
          points={[
            [-0.06, 0.05, 0.005],
            [-0.128, 0.225, 0.028],
            [-0.268, 0.36, 0.018],
          ]}
          radius={0.013}
          color={HIBISCUS_THROAT_DARK}
          outlineWidth={0.006}
        />
        <CurvedTube
          points={[
            [0.068, 0.042, -0.002],
            [0.154, 0.212, 0.03],
            [0.296, 0.345, 0.018],
          ]}
          radius={0.013}
          color={HIBISCUS_THROAT_DARK}
          outlineWidth={0.006}
        />
        <AccessoryLeaf position={[-0.2, 0.178, 0.028]} rotation={-1.08} scale={[0.078, 0.108, 1]} color={LEAF_MID} />
        <AccessoryLeaf position={[-0.035, 0.214, 0.026]} rotation={0.46} scale={[0.056, 0.086, 1]} color={GRASS_LIGHT} />
        <AccessoryLeaf position={[0.168, 0.168, 0.03]} rotation={0.9} scale={[0.074, 0.104, 1]} color={LEAF_MID} />
        <AccessoryLeaf position={[0.248, 0.224, 0.038]} rotation={-0.4} scale={[0.052, 0.08, 1]} color={GRASS_DARK} />
        <AccessoryLeaf position={[0.07, 0.13, 0.032]} rotation={-0.74} scale={[0.05, 0.074, 1]} color={GRASS_DARK} />
        <HibiscusFlower position={[-0.405, 0.59, -0.02]} rotation={-0.2} scale={1.32} activity={activity} />
        <HibiscusFlower position={[0.425, 0.56, 0]} rotation={0.22} scale={1.24} activity={activity} />
        <CodedAssetOutlineMesh
          position={[0.038, 0.248, 0.034]}
          rotation-z={0.42}
          scale={[0.045, 0.052, 0.032]}
          outlineWidth={0.006}
          geometry={<sphereGeometry args={[1, 8, 5]} />}
          material={toon(GRASS_LIGHT)}
        />
      </group>
    </group>
  )
}

function GrassBlade({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  bend = 0.4,
  height = 0.14,
  radius = 0.018,
  tipScale = 0.03,
  sway = 0.018,
  curl = 0.34,
  droop = 0.18,
  phase = 0,
  tilt = 0,
  twist = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  bend?: number
  height?: number
  radius?: number
  tipScale?: number
  sway?: number
  curl?: number
  droop?: number
  phase?: number
  tilt?: number
  twist?: number
}) {
  const { bladeGeometry, tipPosition } = useMemo(() => {
    const bladeHeight = height * scale
    const direction = bend < 0 ? -1 : 1
    const swayDepth = sway * scale
    const wave = Math.sin(phase)
    const crossWave = Math.cos(phase * 1.37)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.012 * bend * scale, bladeHeight * 0.25, swayDepth * 0.28 * wave),
      new THREE.Vector3(
        (0.03 * bend + 0.01 * curl * direction * crossWave) * scale,
        bladeHeight * 0.55,
        -swayDepth * 0.48 * crossWave,
      ),
      new THREE.Vector3(
        (0.058 * bend + 0.018 * curl * direction) * scale,
        bladeHeight * (0.82 - droop * 0.12),
        swayDepth * 0.65 * wave,
      ),
      new THREE.Vector3(
        (0.074 * bend + 0.032 * curl * direction) * scale,
        bladeHeight * (1 - droop * 0.34),
        swayDepth * crossWave,
      ),
    ])

    const tip = curve.getPoint(1)
    return {
      bladeGeometry: new THREE.TubeGeometry(curve, 10, radius * scale, 6, false),
      tipPosition: [tip.x, tip.y, tip.z] as [number, number, number],
    }
  }, [bend, curl, droop, height, phase, radius, scale, sway])

  return (
    <group position={position} rotation-x={tilt} rotation-y={twist} rotation-z={rotation}>
      <mesh geometry={bladeGeometry}>{toon(color)}</mesh>
      <mesh position={tipPosition} scale={[tipScale * scale, tipScale * scale, tipScale * scale]}>
        <sphereGeometry args={[1, 6, 4]} />
        {toon(color)}
      </mesh>
    </group>
  )
}

function GrassRibbonBlade({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  lean = 0.55,
  height = 0.2,
  width = 0.035,
  sway = 0.04,
  curl = 0.62,
  droop = 0.38,
  phase = 0,
  tilt = 0,
  twist = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  lean?: number
  height?: number
  width?: number
  sway?: number
  curl?: number
  droop?: number
  phase?: number
  tilt?: number
  twist?: number
}) {
  const ribbonGeometry = useMemo(() => {
    const segments = 7
    const vertices: number[] = []
    const indices: number[] = []
    const bladeHeight = height * scale
    const bladeWidth = width * scale
    const leanDirection = lean < 0 ? -1 : 1

    for (let segment = 0; segment <= segments; segment += 1) {
      const t = segment / segments
      const taper = Math.max(0.08, 1 - t * 0.93)
      const twistPhase = twist + Math.sin(phase + t * Math.PI * 1.8) * 0.92
      const halfWidth = bladeWidth * taper * (0.78 + 0.22 * Math.sin(phase * 0.7 + t * Math.PI))
      const centerX = (lean * 0.026 * t + lean * 0.118 * t * t + curl * 0.018 * leanDirection * Math.sin(t * Math.PI + phase)) * scale
      const centerY = bladeHeight * (t - droop * 0.24 * t * t)
      const centerZ = (sway * Math.sin(phase + t * Math.PI * 1.35) + curl * 0.012 * Math.sin(phase * 0.5 + t * Math.PI * 2.1)) * scale
      const halfX = Math.sin(twistPhase) * halfWidth
      const halfZ = Math.cos(twistPhase) * halfWidth

      vertices.push(centerX - halfX, centerY, centerZ - halfZ)
      vertices.push(centerX + halfX, centerY, centerZ + halfZ)
    }

    for (let segment = 0; segment < segments; segment += 1) {
      const base = segment * 2
      indices.push(base, base + 1, base + 2)
      indices.push(base + 1, base + 3, base + 2)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [curl, droop, height, lean, phase, scale, sway, twist, width])

  return (
    <group position={position} rotation-x={tilt} rotation-y={twist * 0.35} rotation-z={rotation}>
      <GrassRootClump position={[0, -0.008, 0]} rotation={rotation * -0.22} scale={0.6} color={color} />
      <mesh geometry={ribbonGeometry}>{toonDoubleSided(color)}</mesh>
    </group>
  )
}

function GrassRootClump({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
}) {
  return (
    <group position={position} rotation-z={rotation} scale={scale}>
      <mesh scale={[0.098, 0.024, 0.052]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0.03, 0.012, -0.006]} rotation-z={0.22} scale={[0.07, 0.014, 0.036]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  )
}

function GrassMossPebble({
  position,
  rotation = 0,
  scale,
  color = GRASS_MID,
}: {
  position: [number, number, number]
  rotation?: number
  scale: [number, number, number]
  color?: string
}) {
  return (
    <mesh position={position} rotation-z={rotation} scale={scale}>
      <sphereGeometry args={[1, 8, 4]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function PressedGrassStrand({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  bend = 0.85,
  height = 0.07,
  phase = 0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  bend?: number
  height?: number
  phase?: number
}) {
  const settledPosition: [number, number, number] = [position[0], position[1] - 0.018, position[2]]

  return (
    <group position={settledPosition} rotation-z={rotation} scale={scale}>
      <GrassRootClump position={[0, -0.004, 0]} rotation={-0.08} scale={0.9} color={color} />
      <GrassBlade
        position={[0.016, 0.014, -0.002]}
        color={color}
        bend={bend}
        height={height}
        radius={0.009}
        tipScale={0.011}
        sway={0.028}
        curl={0.56}
        droop={0.34}
        phase={phase}
        tilt={0.08 * Math.sin(phase)}
        twist={0.1 * Math.cos(phase)}
      />
    </group>
  )
}

function FineGrassStrand({
  position,
  rotation = 0,
  scale = 1,
  color = GRASS_MID,
  bend = 0.7,
  height = 0.072,
  phase = 0,
  sway = 0.026,
  curl = 0.42,
  droop = 0.26,
  tilt = 0,
  twist = 0,
  radius = 0.0058,
  tipScale = 0.0065,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  color?: string
  bend?: number
  height?: number
  phase?: number
  sway?: number
  curl?: number
  droop?: number
  tilt?: number
  twist?: number
  radius?: number
  tipScale?: number
}) {
  const settledPosition: [number, number, number] = [position[0], position[1] - 0.024, position[2]]

  return (
    <group position={settledPosition} rotation-z={rotation} scale={scale}>
      <GrassRootClump position={[0, -0.006, 0]} rotation={0.1} scale={0.42} color={color} />
      <GrassBlade
        position={[0.006, 0.008, 0]}
        color={color}
        bend={bend}
        height={height}
        radius={radius}
        tipScale={tipScale}
        sway={sway}
        curl={curl}
        droop={droop}
        phase={phase}
        tilt={tilt}
        twist={twist}
      />
    </group>
  )
}

function GrassTuft({
  position,
  scale = 1,
  flip = 1,
  height = 0.14,
}: {
  position: [number, number, number]
  scale?: number
  flip?: -1 | 1
  height?: number
}) {
  return (
    <group position={position} scale={scale}>
      <GrassRootClump position={[0, 0.008, -0.002]} rotation={flip * -0.12} scale={0.88} color={GRASS_DARK} />
      <GrassBlade
        position={[0, 0.03, 0]}
        rotation={flip * -0.22}
        scale={0.92}
        color={GRASS_MID}
        bend={flip * 0.48}
        height={height}
        radius={0.016}
        tipScale={0.026}
        sway={0.026}
        curl={0.44}
        droop={0.22}
        phase={0.4}
      />
      <GrassBlade
        position={[flip * 0.045, 0.035, -0.014]}
        rotation={flip * 0.2}
        scale={0.78}
        color={GRASS_LIGHT}
        bend={flip * 0.34}
        height={height * 0.86}
        radius={0.014}
        tipScale={0.023}
        sway={0.03}
        curl={0.52}
        droop={0.28}
        phase={1.6}
      />
      <GrassBlade
        position={[flip * -0.04, 0.018, 0.006]}
        rotation={flip * -0.56}
        scale={0.72}
        color={GRASS_DARK}
        bend={flip * 0.55}
        height={height * 0.78}
        radius={0.014}
        tipScale={0.022}
        sway={0.022}
        curl={0.48}
        droop={0.24}
        phase={2.5}
      />
      <GrassBlade
        position={[flip * 0.082, 0.008, 0.012]}
        rotation={flip * 0.62}
        scale={0.58}
        color={GRASS_MID}
        bend={flip * 0.28}
        height={height * 0.7}
        radius={0.012}
        tipScale={0.02}
        sway={0.024}
        curl={0.5}
        droop={0.3}
        phase={3.2}
      />
      <GrassBlade
        position={[flip * -0.078, 0.012, -0.016]}
        rotation={flip * -0.84}
        scale={0.62}
        color={GRASS_LIGHT}
        bend={flip * 0.42}
        height={height * 0.66}
        radius={0.012}
        tipScale={0.02}
        sway={0.028}
        curl={0.58}
        droop={0.34}
        phase={4.1}
      />
    </group>
  )
}

type PressedGrassStrandSpec = {
  position: [number, number, number]
  rotation: number
  scale: number
  color: string
  bend: number
  height?: number
  phase?: number
}

type GrassTuftSpec = {
  position: [number, number, number]
  scale: number
  flip?: -1 | 1
  height?: number
}

type GrassMossPebbleSpec = {
  position: [number, number, number]
  rotation: number
  scale: [number, number, number]
  color: string
}

type FineGrassStrandSpec = {
  position: [number, number, number]
  rotation: number
  scale: number
  color: string
  bend: number
  height: number
  phase: number
  sway: number
  curl: number
  droop: number
  tilt: number
  twist: number
}

type LongGrassWispSpec = FineGrassStrandSpec & {
  radius: number
  tipScale: number
}

type GrassRibbonBladeSpec = {
  position: [number, number, number]
  rotation: number
  scale: number
  color: string
  lean: number
  height: number
  width: number
  sway: number
  curl: number
  droop: number
  phase: number
  tilt: number
  twist: number
}

const pressedNestGrass: PressedGrassStrandSpec[] = [
  { position: [-0.82, -0.626, -0.31], rotation: -0.86, scale: 1.16, color: GRASS_MID, bend: -0.95 },
  { position: [-0.68, -0.612, -0.39], rotation: -0.62, scale: 1.04, color: GRASS_LIGHT, bend: -0.82 },
  { position: [-0.5, -0.602, -0.43], rotation: -0.34, scale: 1.08, color: GRASS_DARK, bend: -0.74 },
  { position: [-0.3, -0.596, -0.47], rotation: -0.12, scale: 1.14, color: GRASS_MID, bend: -0.54 },
  { position: [-0.08, -0.594, -0.49], rotation: 0.12, scale: 1.12, color: GRASS_LIGHT, bend: 0.42 },
  { position: [0.14, -0.596, -0.48], rotation: 0.26, scale: 1.12, color: GRASS_MID, bend: 0.56 },
  { position: [0.36, -0.602, -0.44], rotation: 0.44, scale: 1.08, color: GRASS_DARK, bend: 0.72 },
  { position: [0.58, -0.612, -0.38], rotation: 0.68, scale: 1.06, color: GRASS_LIGHT, bend: 0.82 },
  { position: [0.78, -0.626, -0.3], rotation: 0.9, scale: 1.16, color: GRASS_MID, bend: 0.96 },
  { position: [-0.76, -0.606, -0.1], rotation: -1.05, scale: 0.94, color: GRASS_LIGHT, bend: -0.72, height: 0.038 },
  { position: [-0.58, -0.594, -0.18], rotation: -0.72, scale: 0.9, color: GRASS_DARK, bend: -0.62, height: 0.036 },
  { position: [-0.38, -0.584, -0.24], rotation: -0.42, scale: 0.86, color: GRASS_MID, bend: -0.46, height: 0.034 },
  { position: [0.38, -0.584, -0.24], rotation: 0.42, scale: 0.86, color: GRASS_MID, bend: 0.46, height: 0.034 },
  { position: [0.58, -0.594, -0.18], rotation: 0.72, scale: 0.9, color: GRASS_DARK, bend: 0.62, height: 0.036 },
  { position: [0.76, -0.606, -0.1], rotation: 1.05, scale: 0.94, color: GRASS_LIGHT, bend: 0.72, height: 0.038 },
  { position: [-0.9, -0.64, -0.49], rotation: -0.5, scale: 1.05, color: GRASS_DARK, bend: -0.68 },
  { position: [-0.64, -0.632, -0.55], rotation: -0.26, scale: 0.98, color: GRASS_MID, bend: -0.46 },
  { position: [-0.36, -0.628, -0.58], rotation: -0.08, scale: 0.96, color: GRASS_LIGHT, bend: -0.35 },
  { position: [-0.1, -0.63, -0.6], rotation: 0.1, scale: 0.96, color: GRASS_DARK, bend: 0.32 },
  { position: [0.18, -0.628, -0.59], rotation: 0.22, scale: 1, color: GRASS_LIGHT, bend: 0.42 },
  { position: [0.46, -0.632, -0.55], rotation: 0.36, scale: 0.98, color: GRASS_MID, bend: 0.5 },
  { position: [0.76, -0.64, -0.49], rotation: 0.56, scale: 1.05, color: GRASS_DARK, bend: 0.7 },
]

const perimeterGrassTufts: GrassTuftSpec[] = [
  { position: [-1.68, -0.646, -0.16], scale: 1.05, flip: -1, height: 0.168 },
  { position: [-1.56, -0.636, -0.34], scale: 0.98, flip: -1, height: 0.152 },
  { position: [-1.42, -0.654, -0.55], scale: 0.9, flip: -1, height: 0.136 },
  { position: [-1.24, -0.628, 0.04], scale: 0.92, flip: -1, height: 0.142 },
  { position: [-1.12, -0.632, -0.08], scale: 0.98, flip: -1, height: 0.15 },
  { position: [-1.02, -0.626, -0.22], scale: 0.9, flip: -1, height: 0.132 },
  { position: [-0.94, -0.648, -0.4], scale: 0.82, flip: -1, height: 0.118 },
  { position: [-0.8, -0.624, -0.56], scale: 0.78, flip: -1, height: 0.106 },
  { position: [-0.58, -0.626, -0.62], scale: 0.72, flip: -1, height: 0.098 },
  { position: [-0.34, -0.622, -0.7], scale: 0.56, flip: -1, height: 0.058 },
  { position: [0.34, -0.622, -0.7], scale: 0.56, height: 0.058 },
  { position: [0.58, -0.626, -0.62], scale: 0.72, height: 0.098 },
  { position: [0.82, -0.624, -0.56], scale: 0.78, height: 0.106 },
  { position: [0.96, -0.648, -0.4], scale: 0.82, height: 0.118 },
  { position: [1.04, -0.626, -0.22], scale: 0.9, height: 0.132 },
  { position: [1.14, -0.632, -0.08], scale: 0.98, height: 0.15 },
  { position: [1.26, -0.628, 0.04], scale: 0.92, height: 0.142 },
  { position: [1.46, -0.654, -0.55], scale: 0.9, height: 0.136 },
  { position: [1.58, -0.636, -0.34], scale: 0.98, height: 0.152 },
  { position: [1.72, -0.646, -0.16], scale: 1.05, height: 0.168 },
  { position: [-0.92, -0.61, 0.02], scale: 0.78, flip: -1, height: 0.112 },
  { position: [-0.66, -0.604, 0.05], scale: 0.68, flip: -1, height: 0.098 },
  { position: [0.66, -0.604, 0.05], scale: 0.68, height: 0.098 },
  { position: [0.92, -0.61, 0.02], scale: 0.78, height: 0.112 },
]

const grassClusterAnchors: Array<{
  center: [number, number, number]
  radiusX: number
  radiusZ: number
  count: number
  lean: -1 | 1
  lengthBoost: number
}> = [
  { center: [-1.34, -0.642, -0.48], radiusX: 0.34, radiusZ: 0.2, count: 34, lean: -1, lengthBoost: 0.066 },
  { center: [-0.92, -0.63, -0.56], radiusX: 0.36, radiusZ: 0.18, count: 34, lean: -1, lengthBoost: 0.052 },
  { center: [-0.46, -0.61, -0.61], radiusX: 0.42, radiusZ: 0.16, count: 32, lean: -1, lengthBoost: 0.038 },
  { center: [0.02, -0.605, -0.58], radiusX: 0.44, radiusZ: 0.15, count: 30, lean: 1, lengthBoost: 0.028 },
  { center: [0.5, -0.612, -0.61], radiusX: 0.42, radiusZ: 0.16, count: 32, lean: 1, lengthBoost: 0.038 },
  { center: [0.96, -0.632, -0.56], radiusX: 0.36, radiusZ: 0.18, count: 34, lean: 1, lengthBoost: 0.052 },
  { center: [1.4, -0.642, -0.48], radiusX: 0.34, radiusZ: 0.2, count: 34, lean: 1, lengthBoost: 0.066 },
  { center: [-1.18, -0.615, -0.18], radiusX: 0.3, radiusZ: 0.15, count: 24, lean: -1, lengthBoost: 0.03 },
  { center: [-0.72, -0.606, -0.2], radiusX: 0.28, radiusZ: 0.13, count: 22, lean: -1, lengthBoost: 0.018 },
  { center: [0.72, -0.606, -0.2], radiusX: 0.28, radiusZ: 0.13, count: 22, lean: 1, lengthBoost: 0.018 },
  { center: [1.2, -0.615, -0.18], radiusX: 0.3, radiusZ: 0.15, count: 24, lean: 1, lengthBoost: 0.03 },
]

const wildRibbonGrass: GrassRibbonBladeSpec[] = grassClusterAnchors.flatMap((cluster, clusterIndex) => {
  const ribbonCount = clusterIndex < 7 ? 14 : 10

  return Array.from({ length: ribbonCount }, (_, localIndex): GrassRibbonBladeSpec => {
    const index = clusterIndex * 23 + localIndex
    const angle = index * 2.399963 + clusterIndex * 0.37
    const radius = Math.sqrt((localIndex + 0.55) / ribbonCount)
    const x = cluster.center[0] + Math.cos(angle) * cluster.radiusX * 0.92 * radius + Math.sin(index * 1.7) * 0.04
    const z = cluster.center[2] + Math.sin(angle) * cluster.radiusZ * 0.9 * radius + Math.cos(index * 0.83) * 0.03
    const nearFace = Math.abs(x) < 0.48 && z > -0.34
    const frontCenterEdge = Math.abs(x) < 0.92 && z < -0.3
    const sideLean = Math.abs(x) < 0.08 ? cluster.lean : x < 0 ? -1 : 1
    const phase = index * 1.13 + clusterIndex * 0.52
    const colorCycle = (index + clusterIndex) % 8
    const color = frontCenterEdge
      ? colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : GRASS_MID
      : colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK
    const edgeHeight = Math.min(0.06, Math.abs(x) * 0.028)

    return {
      position: [x, cluster.center[1] - 0.026 + Math.sin(index * 0.49) * 0.012, z],
      rotation: frontCenterEdge
        ? sideLean * (0.1 + radius * 0.14) + Math.sin(index * 0.71) * 0.08
        : sideLean * (0.34 + radius * 0.46 + (index % 5) * 0.07) + Math.sin(index * 0.71) * 0.28,
      scale: frontCenterEdge ? 0.46 + (index % 3) * 0.025 : 0.84 + (index % 5) * 0.055,
      color,
      lean: frontCenterEdge ? sideLean * (0.24 + radius * 0.34) : sideLean * (0.42 + radius * 0.8 + (index % 4) * 0.12),
      height: frontCenterEdge
        ? 0.038 + (index % 3) * 0.004
        : nearFace
          ? 0.054 + (index % 3) * 0.006
          : 0.16 + cluster.lengthBoost + edgeHeight + (index % 5) * 0.018,
      width: frontCenterEdge ? 0.008 + (index % 3) * 0.0015 : nearFace ? 0.014 + (index % 3) * 0.002 : 0.032 + (index % 4) * 0.008,
      sway: 0.04 + radius * 0.036 + (index % 4) * 0.008,
      curl: frontCenterEdge ? 0.5 + radius * 0.42 : 0.68 + radius * 0.76 + (index % 5) * 0.14,
      droop: frontCenterEdge ? 0.76 : nearFace ? 0.58 : 0.38 + radius * 0.28 + (index % 3) * 0.08,
      phase,
      tilt: Math.sin(phase * 0.9) * (frontCenterEdge ? 0.14 : 0.3),
      twist: Math.cos(phase * 0.64) * (frontCenterEdge ? 0.32 : 0.75),
    }
  })
})

const denseFineGrass: FineGrassStrandSpec[] = grassClusterAnchors.flatMap((cluster, clusterIndex) =>
  Array.from({ length: cluster.count }, (_, localIndex): FineGrassStrandSpec => {
    const index = clusterIndex * 41 + localIndex
    const angle = index * 2.399963 + clusterIndex * 0.53
    const radius = Math.sqrt((localIndex + 0.5) / cluster.count)
    const spiralSkew = Math.sin(index * 1.91) * 0.028
    const x = cluster.center[0] + Math.cos(angle) * cluster.radiusX * radius + spiralSkew
    const z = cluster.center[2] + Math.sin(angle) * cluster.radiusZ * radius + Math.cos(index * 0.77) * 0.018
    const nearShellCenter = Math.abs(x) < 0.5 && z > -0.36
    const sideLean = Math.abs(x) < 0.12 ? cluster.lean : x < 0 ? -1 : 1
    const colorCycle = (index + clusterIndex) % 7
    const color = colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK
    const phase = index * 1.27 + clusterIndex * 0.81
    const outsideEdge = Math.min(0.05, Math.abs(x) * 0.022)
    const height = nearShellCenter
      ? 0.042 + (index % 4) * 0.004
      : 0.08 + cluster.lengthBoost + outsideEdge + (localIndex % 6) * 0.006

    return {
      position: [x, cluster.center[1] + Math.sin(index * 0.73) * 0.014, z],
      rotation: sideLean * (0.45 + radius * 0.34 + (index % 5) * 0.04) + Math.sin(index * 0.91) * 0.24,
      scale: nearShellCenter ? 0.78 : 0.9 + (index % 7) * 0.035,
      color,
      bend: sideLean * (0.5 + radius * 0.36 + (index % 4) * 0.052),
      height,
      phase,
      sway: 0.024 + radius * 0.022 + (index % 5) * 0.004,
      curl: 0.48 + radius * 0.36 + (index % 6) * 0.046,
      droop: nearShellCenter ? 0.42 : 0.32 + radius * 0.2 + (index % 4) * 0.04,
      tilt: Math.sin(phase * 0.9) * 0.18,
      twist: Math.cos(phase * 0.72) * 0.24,
    }
  }),
)

const longGrassWisps: LongGrassWispSpec[] = Array.from({ length: 76 }, (_, index): LongGrassWispSpec => {
  const side = index % 2 === 0 ? -1 : 1
  const lane = Math.floor(index / 2)
  const edgeBand = lane % 4
  const x = side * (0.42 + (lane % 12) * 0.102 + Math.sin(index * 1.61) * 0.045)
  const z = -0.76 + edgeBand * 0.15 + Math.cos(index * 0.83) * 0.05
  const phase = index * 1.41
  const colorCycle = index % 6
  const frontCenterWisp = Math.abs(x) < 0.88 && z < -0.58

  return {
    position: [x, -0.635 + Math.sin(index * 0.57) * 0.012, z],
    rotation: frontCenterWisp
      ? side * (0.48 + (index % 4) * 0.05) + Math.sin(index * 0.77) * 0.12
      : side * (0.92 + (index % 5) * 0.08) + Math.sin(index * 0.77) * 0.18,
    scale: frontCenterWisp ? 0.68 + (index % 3) * 0.035 : 0.96 + (index % 4) * 0.055,
    color: colorCycle === 0 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK,
    bend: side * (0.92 + (index % 4) * 0.12),
    height: frontCenterWisp ? 0.086 + (index % 4) * 0.008 : 0.15 + (index % 5) * 0.018,
    phase,
    sway: frontCenterWisp ? 0.034 + (index % 3) * 0.006 : 0.05 + (index % 3) * 0.012,
    curl: frontCenterWisp ? 0.72 + (index % 3) * 0.08 : 0.86 + (index % 4) * 0.14,
    droop: frontCenterWisp ? 0.7 + (index % 3) * 0.08 : 0.52 + (index % 3) * 0.08,
    tilt: Math.sin(phase) * (frontCenterWisp ? 0.18 : 0.24),
    twist: Math.cos(phase * 0.8) * (frontCenterWisp ? 0.24 : 0.34),
    radius: frontCenterWisp ? 0.0048 : 0.0062,
    tipScale: frontCenterWisp ? 0.0045 : 0.006,
  }
})

const platformCenterZ = -0.18
const platformRadiusX = 1.74
const platformRadiusZ = 1.18

const circularPlatformMossLobes: GrassMossPebbleSpec[] = Array.from({ length: 46 }, (_, index): GrassMossPebbleSpec => {
  const angle = index * 2.399963 + Math.sin(index * 0.47) * 0.12
  const radius = 0.42 + ((index * 7) % 31) / 31 * 0.54
  const x = Math.cos(angle) * platformRadiusX * radius + Math.sin(index * 1.27) * 0.035
  const z = platformCenterZ + Math.sin(angle) * platformRadiusZ * radius + Math.cos(index * 0.93) * 0.035
  const colorCycle = index % 7

  return {
    position: [x, -0.694 + Math.sin(index * 0.59) * 0.014, z],
    rotation: angle + Math.sin(index * 0.8) * 0.25,
    scale: [0.15 + (index % 5) * 0.018, 0.019 + (index % 3) * 0.003, 0.07 + (index % 4) * 0.012],
    color: colorCycle === 0 || colorCycle === 5 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK,
  }
})

const circularPlatformFineGrass: FineGrassStrandSpec[] = Array.from({ length: 220 }, (_, index): FineGrassStrandSpec => {
  const angle = index * 2.399963
  const radius = Math.sqrt((index + 0.5) / 220) * 0.98
  const x = Math.cos(angle) * platformRadiusX * radius + Math.sin(index * 1.61) * 0.028
  const z = platformCenterZ + Math.sin(angle) * platformRadiusZ * radius + Math.cos(index * 0.73) * 0.026
  const nearBody = Math.abs(x) < 0.78 && z > -0.54 && z < 0.5
  const frontCenterEdge = Math.abs(x) < 0.96 && z < -0.34
  const lowProtectedArea = nearBody || frontCenterEdge
  const outerRing = radius > 0.78
  const sideLean = x < 0 ? -1 : 1
  const phase = index * 1.19
  const colorCycle = index % 8

  return {
    position: [x, -0.63 + Math.sin(index * 0.67) * 0.016, z],
    rotation: frontCenterEdge
      ? sideLean * (0.18 + radius * 0.22) + Math.sin(index * 0.83) * 0.12
      : sideLean * (0.42 + radius * 0.42 + (index % 5) * 0.045) + Math.sin(index * 0.83) * 0.24,
    scale: lowProtectedArea ? 0.72 : 0.84 + (index % 6) * 0.035,
    color: colorCycle === 0 || colorCycle === 6 ? GRASS_LIGHT : colorCycle === 1 || colorCycle === 4 ? GRASS_MID : GRASS_DARK,
    bend: sideLean * (0.46 + radius * 0.52 + (index % 4) * 0.055),
    height: lowProtectedArea ? 0.034 + (index % 3) * 0.004 : 0.082 + (outerRing ? 0.052 : 0.018) + (index % 5) * 0.008,
    phase,
    sway: 0.026 + radius * 0.024 + (index % 4) * 0.005,
    curl: 0.48 + radius * 0.52 + (index % 6) * 0.052,
    droop: lowProtectedArea ? 0.46 : 0.32 + radius * 0.22 + (index % 4) * 0.05,
    tilt: Math.sin(phase * 0.82) * 0.22,
    twist: Math.cos(phase * 0.74) * 0.32,
  }
})

const circularPlatformTufts: GrassTuftSpec[] = Array.from({ length: 44 }, (_, index): GrassTuftSpec => {
  const angle = (index / 44) * Math.PI * 2 + Math.sin(index * 0.57) * 0.08
  const radius = index % 3 === 0 ? 0.94 : 0.84 + (index % 4) * 0.035
  const x = Math.cos(angle) * platformRadiusX * radius
  const z = platformCenterZ + Math.sin(angle) * platformRadiusZ * radius
  const backArc = z > 0.34
  const frontCenterEdge = Math.abs(x) < 0.96 && z < -0.34

  return {
    position: [x, -0.64 + Math.sin(index * 0.71) * 0.012, z],
    scale: frontCenterEdge ? 0.58 : backArc ? 0.68 + (index % 4) * 0.038 : 0.76 + (index % 5) * 0.045,
    flip: x < 0 ? -1 : 1,
    height: frontCenterEdge ? 0.074 : backArc ? 0.09 + (index % 4) * 0.012 : 0.112 + (index % 5) * 0.014,
  }
})

const mossPebbles: GrassMossPebbleSpec[] = [
  { position: [-0.98, -0.636, -0.45], rotation: -0.18, scale: [0.18, 0.024, 0.07], color: GRASS_DARK },
  { position: [-0.78, -0.626, -0.5], rotation: 0.12, scale: [0.2, 0.026, 0.08], color: GRASS_MID },
  { position: [-0.56, -0.614, -0.53], rotation: -0.1, scale: [0.18, 0.022, 0.072], color: GRASS_LIGHT },
  { position: [-0.34, -0.608, -0.56], rotation: 0.16, scale: [0.19, 0.024, 0.076], color: GRASS_MID },
  { position: [-0.1, -0.606, -0.58], rotation: -0.06, scale: [0.18, 0.022, 0.07], color: GRASS_DARK },
  { position: [0.14, -0.608, -0.57], rotation: 0.1, scale: [0.2, 0.024, 0.076], color: GRASS_LIGHT },
  { position: [0.38, -0.614, -0.54], rotation: -0.14, scale: [0.18, 0.022, 0.072], color: GRASS_MID },
  { position: [0.62, -0.626, -0.5], rotation: 0.12, scale: [0.2, 0.026, 0.08], color: GRASS_DARK },
  { position: [0.86, -0.636, -0.45], rotation: 0.2, scale: [0.18, 0.024, 0.07], color: GRASS_MID },
  { position: [-0.74, -0.616, -0.22], rotation: -0.24, scale: [0.2, 0.026, 0.09], color: GRASS_LIGHT },
  { position: [-0.5, -0.598, -0.28], rotation: 0.18, scale: [0.16, 0.022, 0.072], color: GRASS_DARK },
  { position: [0.5, -0.598, -0.28], rotation: -0.18, scale: [0.16, 0.022, 0.072], color: GRASS_LIGHT },
  { position: [0.76, -0.616, -0.22], rotation: 0.24, scale: [0.2, 0.026, 0.09], color: GRASS_MID },
]

const baseMossLobes: GrassMossPebbleSpec[] = [
  { position: [-1.58, -0.704, -0.44], rotation: -0.22, scale: [0.26, 0.028, 0.1], color: GRASS_DARK },
  { position: [-1.34, -0.692, -0.62], rotation: 0.18, scale: [0.29, 0.026, 0.1], color: GRASS_MID },
  { position: [-1.08, -0.692, -0.5], rotation: -0.28, scale: [0.21, 0.024, 0.08], color: GRASS_DARK },
  { position: [-0.84, -0.674, -0.6], rotation: 0.16, scale: [0.25, 0.023, 0.09], color: GRASS_MID },
  { position: [-0.52, -0.664, -0.66], rotation: -0.1, scale: [0.25, 0.02, 0.08], color: GRASS_LIGHT },
  { position: [-0.18, -0.66, -0.74], rotation: 0.08, scale: [0.28, 0.02, 0.088], color: GRASS_MID },
  { position: [0.18, -0.66, -0.74], rotation: -0.08, scale: [0.28, 0.02, 0.088], color: GRASS_DARK },
  { position: [0.52, -0.664, -0.66], rotation: 0.12, scale: [0.25, 0.02, 0.08], color: GRASS_LIGHT },
  { position: [0.84, -0.674, -0.6], rotation: -0.16, scale: [0.25, 0.023, 0.09], color: GRASS_MID },
  { position: [1.08, -0.692, -0.5], rotation: 0.28, scale: [0.21, 0.024, 0.08], color: GRASS_DARK },
  { position: [1.36, -0.692, -0.62], rotation: -0.18, scale: [0.29, 0.026, 0.1], color: GRASS_MID },
  { position: [1.62, -0.704, -0.44], rotation: 0.22, scale: [0.26, 0.028, 0.1], color: GRASS_DARK },
  { position: [-1.42, -0.696, -0.1], rotation: -0.2, scale: [0.25, 0.028, 0.09], color: GRASS_MID },
  { position: [-0.98, -0.686, -0.18], rotation: -0.2, scale: [0.19, 0.022, 0.074], color: GRASS_MID },
  { position: [-0.7, -0.668, -0.12], rotation: 0.24, scale: [0.18, 0.02, 0.07], color: GRASS_LIGHT },
  { position: [0.7, -0.668, -0.12], rotation: -0.24, scale: [0.18, 0.02, 0.07], color: GRASS_LIGHT },
  { position: [0.98, -0.686, -0.18], rotation: 0.2, scale: [0.19, 0.022, 0.074], color: GRASS_MID },
  { position: [1.46, -0.696, -0.1], rotation: 0.2, scale: [0.25, 0.028, 0.09], color: GRASS_MID },
]

function GrassFinePolishDetails() {
  const seedHeads: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-1.22, -0.478, -0.3], scale: [0.018, 0.018, 0.01], color: GRASS_LIGHT, opacity: 0.54 },
    { position: [-0.88, -0.492, -0.55], scale: [0.014, 0.014, 0.008], color: '#d5f7b4', opacity: 0.5 },
    { position: [-0.34, -0.486, -0.62], scale: [0.016, 0.016, 0.009], color: GRASS_LIGHT, opacity: 0.5 },
    { position: [0.32, -0.49, -0.64], scale: [0.014, 0.014, 0.008], color: '#d5f7b4', opacity: 0.46 },
    { position: [0.82, -0.482, -0.48], scale: [0.017, 0.017, 0.009], color: GRASS_LIGHT, opacity: 0.52 },
    { position: [1.25, -0.49, -0.25], scale: [0.015, 0.015, 0.008], color: '#d5f7b4', opacity: 0.48 },
    { position: [-1.48, -0.512, -0.08], scale: [0.012, 0.012, 0.007], color: '#d5f7b4', opacity: 0.42 },
    { position: [-0.58, -0.506, -0.12], scale: [0.01, 0.01, 0.006], color: GRASS_LIGHT, opacity: 0.36 },
    { position: [0.62, -0.502, -0.1], scale: [0.011, 0.011, 0.006], color: '#d5f7b4', opacity: 0.38 },
    { position: [1.46, -0.514, -0.06], scale: [0.012, 0.012, 0.007], color: GRASS_LIGHT, opacity: 0.42 },
  ]
  const leafScuffs: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-1.42, -0.602, -0.36], rotation: -0.48, scale: [0.035, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.34 },
    { position: [-0.68, -0.586, -0.68], rotation: 0.36, scale: [0.03, 0.005, 0.004], color: GRASS_DARK, opacity: 0.28 },
    { position: [-0.08, -0.572, -0.7], rotation: -0.18, scale: [0.042, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.32 },
    { position: [0.52, -0.586, -0.62], rotation: -0.34, scale: [0.032, 0.005, 0.004], color: GRASS_DARK, opacity: 0.28 },
    { position: [1.36, -0.6, -0.36], rotation: 0.5, scale: [0.035, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.34 },
    { position: [-1.12, -0.566, -0.08], rotation: 0.22, scale: [0.032, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.3 },
    { position: [-0.34, -0.548, -0.22], rotation: -0.12, scale: [0.038, 0.006, 0.004], color: GRASS_DARK, opacity: 0.2 },
    { position: [0.32, -0.546, -0.22], rotation: 0.12, scale: [0.038, 0.006, 0.004], color: GRASS_DARK, opacity: 0.2 },
    { position: [1.08, -0.568, -0.08], rotation: -0.24, scale: [0.032, 0.006, 0.004], color: GRASS_LIGHT, opacity: 0.3 },
  ]
  const dewDots: {
    position: [number, number, number]
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-1.18, -0.526, -0.44], scale: [0.009, 0.012, 0.006], opacity: 0.42 },
    { position: [-0.78, -0.506, -0.62], scale: [0.008, 0.01, 0.006], opacity: 0.38 },
    { position: [-0.2, -0.494, -0.66], scale: [0.007, 0.009, 0.005], opacity: 0.34 },
    { position: [0.36, -0.502, -0.64], scale: [0.008, 0.01, 0.006], opacity: 0.38 },
    { position: [0.98, -0.512, -0.52], scale: [0.009, 0.012, 0.006], opacity: 0.42 },
    { position: [-1.44, -0.542, -0.16], scale: [0.007, 0.009, 0.005], opacity: 0.34 },
    { position: [1.42, -0.54, -0.18], scale: [0.007, 0.009, 0.005], opacity: 0.34 },
  ]

  return (
    <group>
      {seedHeads.map((seed, index) => (
        <OrganicDetailDot
          key={`grass-seed-head-${index}`}
          position={seed.position}
          scale={seed.scale}
          color={seed.color}
          opacity={seed.opacity}
        />
      ))}
      {leafScuffs.map((scuff, index) => (
        <OrganicDetailStroke
          key={`grass-leaf-scuff-${index}`}
          position={scuff.position}
          rotation={scuff.rotation}
          scale={scuff.scale}
          color={scuff.color}
          opacity={scuff.opacity}
        />
      ))}
      {dewDots.map((dew, index) => (
        <OrganicDetailDot
          key={`grass-soft-dew-${index}`}
          position={dew.position}
          scale={dew.scale}
          color={GRASS_DEW}
          opacity={dew.opacity}
        />
      ))}
    </group>
  )
}

function GroundContactPolish({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const contactGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const snugPulse = idlePulse(t, 6.2, 0.71, 0.075) * motion
    const hop = animation === 'hop' ? getHopMotion(t, motion) : null
    const landing = hop ? hop.land : 0
    const prep = hop ? hop.prep : 0
    const airborne = hop ? hop.airborne : 0
    const breathingSettle = Math.sin(t * 1.42 + 0.3) * 0.006 * motion

    if (contactGroup.current) {
      contactGroup.current.position.y = breathingSettle - snugPulse * 0.006 - landing * 0.018 + airborne * 0.006
      contactGroup.current.scale.set(
        1 + snugPulse * 0.035 + landing * 0.13 + prep * 0.035 - airborne * 0.026,
        1 + snugPulse * 0.012 - landing * 0.055 - prep * 0.016 + airborne * 0.018,
        1,
      )
      contactGroup.current.rotation.z = Math.sin(t * 0.86) * 0.004 * motion - landing * 0.01
    }
  })

  return (
    <group ref={contactGroup}>
      <mesh position={[0, -0.632, -0.235]} rotation-z={-0.015} scale={[0.86, 0.062, 0.24]}>
        <sphereGeometry args={[1, 14, 5]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0.018, -0.598, -0.365]} rotation-z={0.02} scale={[0.92, 0.038, 0.18]}>
        <sphereGeometry args={[1, 12, 4]} />
        <meshBasicMaterial color={GRASS_DARK} transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <mesh position={[-0.04, -0.58, -0.462]} rotation-z={-0.015} scale={[0.68, 0.024, 0.096]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <OrganicDetailStroke
        position={[-0.48, -0.518, -0.39]}
        rotation={-0.76}
        scale={[0.014, 0.07, 0.006]}
        color={GRASS_DARK}
        opacity={0.34}
      />
      <OrganicDetailStroke
        position={[-0.24, -0.526, -0.468]}
        rotation={-0.28}
        scale={[0.012, 0.058, 0.006]}
        color={GRASS_LIGHT}
        opacity={0.42}
      />
      <OrganicDetailStroke
        position={[0.22, -0.526, -0.47]}
        rotation={0.26}
        scale={[0.012, 0.058, 0.006]}
        color={GRASS_LIGHT}
        opacity={0.42}
      />
      <OrganicDetailStroke
        position={[0.48, -0.52, -0.39]}
        rotation={0.76}
        scale={[0.014, 0.07, 0.006]}
        color={GRASS_DARK}
        opacity={0.34}
      />
    </group>
  )
}

function GrassySeat({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const breathingGrass = useRef<THREE.Group>(null)
  const nestGrass = useRef<THREE.Group>(null)
  const platformGeometry = useMemo(
    () => createOrganicGrassPlatformGeometry({ radiusX: platformRadiusX, radiusZ: platformRadiusZ, thickness: 0.11, phase: 0.25 }),
    [],
  )
  const platformMidGeometry = useMemo(
    () => createOrganicGrassPlatformGeometry({ radiusX: platformRadiusX * 0.82, radiusZ: platformRadiusZ * 0.78, thickness: 0.052, phase: 1.1 }),
    [],
  )
  const platformHighlightGeometry = useMemo(
    () => createOrganicGrassPlatformGeometry({ radiusX: platformRadiusX * 0.58, radiusZ: platformRadiusZ * 0.42, thickness: 0.034, phase: 2.2 }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const motion = clampIdleActivity(activity)
    const breeze = Math.sin(t * 0.84) * 0.5 + Math.sin(t * 1.37 + 1.1) * 0.5
    const happySnug = idlePulse(t, 6.2, 0.71, 0.07)
    const jiggle = Math.sin(t * 8.6 + 0.2) * 0.008 + Math.sin(t * 13.4) * 0.004
    const hop = animation === 'hop' ? getHopMotion(t, motion) : null
    const landing = hop ? hop.land : 0
    const prep = hop ? hop.prep : 0
    const airborne = hop ? hop.airborne : 0
    const grassRipple = landing * 0.06 + prep * 0.018 - airborne * 0.018

    if (breathingGrass.current) {
      breathingGrass.current.rotation.z = breeze * 0.009 + jiggle * 0.25 + landing * 0.018
      breathingGrass.current.position.x = Math.sin(t * 0.78 + 0.4) * 0.008 + jiggle * 0.22
      breathingGrass.current.position.y = -landing * 0.018 + airborne * 0.008
      breathingGrass.current.scale.set(1 + happySnug * 0.006 + grassRipple, 1 + happySnug * 0.016 - landing * 0.04, 1)
    }
    if (nestGrass.current) {
      nestGrass.current.position.y = -happySnug * 0.01 - prep * 0.016 - landing * 0.03 + airborne * 0.014
      nestGrass.current.rotation.z = Math.sin(t * 1.05 + 0.9) * 0.006 - jiggle * 0.18 - landing * 0.026
      nestGrass.current.scale.set(1 + happySnug * 0.016 + landing * 0.105 + prep * 0.045, 1 - happySnug * 0.026 - landing * 0.09, 1)
    }
  })

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.724, platformCenterZ]}
        outlineWidth={0.012}
        geometry={<primitive object={platformGeometry} attach="geometry" />}
        material={<meshBasicMaterial color={GRASS_DARK} />}
      />
      <mesh position={[0.03, -0.698, platformCenterZ - 0.015]} geometry={platformMidGeometry}>
        <meshBasicMaterial color={GRASS_MID} />
      </mesh>
      <mesh position={[-0.08, -0.676, platformCenterZ - 0.1]} rotation-z={-0.035} geometry={platformHighlightGeometry}>
        <meshBasicMaterial color={GRASS_LIGHT} />
      </mesh>
      <mesh
        position={[-0.04, -0.722, -0.26]}
        rotation-z={-0.025}
        scale={[1.36, 0.052, 0.39]}
      >
        <sphereGeometry args={[1, 12, 5]} />
        {toon(GRASS_DARK)}
      </mesh>
      <mesh
        position={[0.08, -0.692, -0.31]}
        rotation-z={0.055}
        scale={[1.18, 0.044, 0.32]}
      >
        <sphereGeometry args={[1, 10, 5]} />
        {toon(GRASS_MID)}
      </mesh>
      <mesh position={[-0.02, -0.664, -0.58]} rotation-z={0.02} scale={[0.96, 0.03, 0.19]}>
        <sphereGeometry args={[1, 10, 4]} />
        {toon(GRASS_LIGHT)}
      </mesh>
      <mesh position={[-1.24, -0.635, -0.12]} rotation-z={-0.18} scale={[0.38, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_DARK} />
      </mesh>
      <mesh position={[-0.62, -0.62, -0.08]} rotation-z={-0.18} scale={[0.36, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_DARK} />
      </mesh>
      <mesh position={[-0.42, -0.612, -0.32]} rotation-z={0.12} scale={[0.3, 0.042, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_MID} />
      </mesh>
      <mesh position={[0, -0.606, -0.38]} rotation-z={-0.04} scale={[0.32, 0.042, 0.14]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} />
      </mesh>
      <mesh position={[0.38, -0.612, -0.32]} rotation-z={-0.07} scale={[0.31, 0.042, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_DARK} />
      </mesh>
      <mesh position={[0.68, -0.62, -0.08]} rotation-z={0.2} scale={[0.36, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} />
      </mesh>
      <mesh position={[1.28, -0.635, -0.12]} rotation-z={0.2} scale={[0.38, 0.052, 0.13]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} />
      </mesh>
      <mesh position={[-0.82, -0.63, -0.28]} rotation-z={-0.22} scale={[0.22, 0.036, 0.092]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_MID} />
      </mesh>
      <mesh position={[-0.04, -0.618, -0.57]} rotation-z={0.03} scale={[0.28, 0.03, 0.11]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_LIGHT} />
      </mesh>
      <mesh position={[0.84, -0.63, -0.28]} rotation-z={0.24} scale={[0.22, 0.036, 0.092]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_MID} />
      </mesh>
      <mesh position={[-1.44, -0.646, -0.36]} rotation-z={-0.22} scale={[0.28, 0.04, 0.11]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_MID} />
      </mesh>
      <mesh position={[1.48, -0.646, -0.36]} rotation-z={0.24} scale={[0.28, 0.04, 0.11]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={GRASS_MID} />
      </mesh>
      {circularPlatformMossLobes.map((lobe, index) => (
        <GrassMossPebble key={`circular-platform-moss-${index}`} {...lobe} />
      ))}
      {baseMossLobes.map((lobe, index) => (
        <GrassMossPebble key={`base-moss-lobe-${index}`} {...lobe} />
      ))}
      {mossPebbles.map((pebble, index) => (
        <GrassMossPebble key={`moss-pebble-${index}`} {...pebble} />
      ))}
      <GroundContactPolish activity={activity} animation={animation} />
      <GrassFinePolishDetails />
      <group ref={breathingGrass}>
        {wildRibbonGrass.map((blade, index) => (
          <GrassRibbonBlade key={`wild-ribbon-grass-${index}`} {...blade} />
        ))}
        {denseFineGrass.map((strand, index) => (
          <FineGrassStrand key={`dense-fine-grass-${index}`} {...strand} />
        ))}
        {circularPlatformFineGrass.map((strand, index) => (
          <FineGrassStrand key={`circular-platform-fine-grass-${index}`} {...strand} />
        ))}
        {longGrassWisps.map((strand, index) => (
          <FineGrassStrand key={`long-grass-wisp-${index}`} {...strand} />
        ))}
      </group>
      <group ref={nestGrass}>
        {pressedNestGrass.map((strand, index) => (
          <PressedGrassStrand key={`pressed-grass-${index}`} {...strand} phase={index * 0.73} />
        ))}
      </group>
      {perimeterGrassTufts.map((tuft, index) => (
        <GrassTuft key={`perimeter-grass-${index}`} {...tuft} />
      ))}
      {circularPlatformTufts.map((tuft, index) => (
        <GrassTuft key={`circular-platform-tuft-${index}`} {...tuft} />
      ))}
    </group>
  )
}

function ShellCrack({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
}) {
  return (
    <group position={position} rotation-z={rotation} scale={scale}>
      <mesh rotation-z={-0.08} scale={[0.012, 0.092, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh position={[0.018, 0.026, 0]} rotation-z={-0.64} scale={[0.01, 0.048, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.62} depthWrite={false} />
      </mesh>
      <mesh position={[-0.018, -0.026, 0]} rotation-z={0.54} scale={[0.009, 0.04, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.56} depthWrite={false} />
      </mesh>
      <mesh position={[0.008, 0.034, -0.002]} rotation-z={-0.42} scale={[0.008, 0.052, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_LIGHT} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Eye({
  side,
  pupilOffset,
  fitted = false,
  activity = 1,
  animation = 'idle',
}: {
  side: -1 | 1
  pupilOffset: number
  fitted?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const eyeGroup = useRef<THREE.Group>(null)
  const pupilGroup = useRef<THREE.Group>(null)
  const eyeZ = fitted ? -0.735 : -0.71
  const pupilZ = fitted ? -0.03 : -0.026
  const highlightZ = fitted ? -0.038 : -0.034

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const hopFace = getHopExpressionMotion(t, animation === 'hop' ? motion : 0)
    const cycle = (t + (side === 1 ? 0.012 : 0)) % 5.4
    const blinkWindow = cycle > 5.02 ? (cycle - 5.02) / 0.38 : 0
    const idleBlink = blinkWindow > 0 ? Math.sin(Math.min(1, blinkWindow) * Math.PI) * motion : 0
    const blink = Math.min(0.92, idleBlink + hopFace.blink)
    const curiousLift = Math.sin(t * 1.15 + side * 0.4) * 0.003 * motion + hopFace.eyeLift
    const eyeSquashY = Math.max(0.24, 1 - blink * 0.78 - hopFace.faceFocus * 0.055 + hopFace.eyeWide * 0.16)

    if (eyeGroup.current) {
      eyeGroup.current.position.set(side * 0.13, 0.115 + curiousLift - blink * 0.006, eyeZ)
      eyeGroup.current.scale.set(1 + blink * 0.05 + hopFace.eyeWide * 0.05, eyeSquashY, 1)
    }
    if (pupilGroup.current) {
      pupilGroup.current.position.set(
        pupilOffset +
          Math.sin(t * 0.62 + side * 0.3) * 0.004 * motion -
          side * happySnug * 0.004 -
          side * hopFace.pupilInward,
        -0.012 + Math.sin(t * 0.48 + 0.8) * 0.003 * motion + happySnug * 0.005 + hopFace.pupilY,
        pupilZ,
      )
      pupilGroup.current.scale.set(1 + happySnug * 0.08 + hopFace.eyeWide * 0.08, 1 + happySnug * 0.04 + hopFace.eyeWide * 0.04, 1)
    }
  })

  return (
    <group ref={eyeGroup} position={[side * 0.13, 0.115, eyeZ]}>
      <CodedAssetOutlineMesh
        scale={[0.082, 0.12, 0.026]}
        outlineWidth={0.008}
        geometry={<sphereGeometry args={[1, 12, 8]} />}
        material={toon(EYE_WHITE)}
      />
      <mesh position={[side * 0.004, -0.066, fitted ? -0.012 : -0.014]} rotation-z={side * 0.08} scale={[0.046, 0.008, 0.004]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color="#d5d5c8" transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <group ref={pupilGroup} position={[pupilOffset, -0.012, pupilZ]}>
        <mesh scale={[0.032, 0.058, 0.01]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} />
        </mesh>
        <mesh position={[-0.02, 0.048, highlightZ - pupilZ]} scale={[0.018, 0.022, 0.006]}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh position={[0.012, -0.036, highlightZ - pupilZ - 0.001]} scale={[0.008, 0.01, 0.004]}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color="#fff6cf" toneMapped={false} transparent opacity={0.78} />
        </mesh>
      </group>
    </group>
  )
}

function RedFace({
  fitted = false,
  activity = 1,
  animation = 'idle',
  bodyOnly = false,
  featuresOnly = false,
}: {
  fitted?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
  bodyOnly?: boolean
  featuresOnly?: boolean
}) {
  const mouthGroup = useRef<THREE.Group>(null)
  const bodyPosition: [number, number, number] = fitted ? [0.006, -0.026, -0.35] : [0, -0.02, -0.28]
  const bodyScale: [number, number, number] = fitted ? [0.56, 0.432, 0.38] : [0.43, 0.43, 0.43]
  const outlineWidth = fitted ? 0 : 0.012
  const mouthZ = fitted ? -0.748 : -0.704
  const mouthShadeZ = fitted ? -0.758 : -0.713
  const faceSpeckles: {
    position: [number, number, number]
    scale: [number, number, number]
    opacity: number
  }[] = [
    { position: [-0.205, 0.038, fitted ? -0.711 : -0.704], scale: [0.009, 0.006, 0.004], opacity: 0.18 },
    { position: [0.225, 0.018, fitted ? -0.711 : -0.704], scale: [0.008, 0.005, 0.004], opacity: 0.16 },
    { position: [-0.118, -0.186, fitted ? -0.711 : -0.704], scale: [0.008, 0.005, 0.004], opacity: 0.14 },
  ]
  const facePolishMarks: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = fitted
    ? [
        { position: [-0.142, 0.092, -0.72], rotation: -0.24, scale: [0.126, 0.026, 0.006], color: FACE_RED_LIGHT, opacity: 0.18 },
        { position: [0.124, -0.174, -0.722], rotation: 0.18, scale: [0.152, 0.034, 0.006], color: FACE_RED_SHADE, opacity: 0.13 },
        { position: [-0.218, -0.062, -0.721], rotation: -0.5, scale: [0.052, 0.016, 0.005], color: FACE_RED_LIGHT, opacity: 0.12 },
        { position: [0.224, 0.052, -0.721], rotation: 0.38, scale: [0.046, 0.014, 0.005], color: FACE_RED_SHADE, opacity: 0.12 },
      ]
    : [
        { position: [-0.118, 0.044, -0.705], rotation: -0.24, scale: [0.142, 0.034, 0.008], color: FACE_RED_LIGHT, opacity: 0.18 },
        { position: [0.128, -0.158, -0.706], rotation: 0.18, scale: [0.156, 0.038, 0.008], color: FACE_RED_SHADE, opacity: 0.14 },
      ]

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const hopFace = getHopExpressionMotion(t, animation === 'hop' ? motion : 0)
    const softSmile = ((Math.sin(t * 1.75 + 0.7) * 0.5 + 0.5) * 0.65 + happySnug * 0.55) * motion

    if (mouthGroup.current) {
      mouthGroup.current.position.y = hopFace.mouthY
      mouthGroup.current.scale.set(
        1 + softSmile * 0.045 + hopFace.smile * 0.16 + hopFace.cheekSquash * 0.08,
        1 + softSmile * 0.1 + hopFace.mouthOpen * 0.72 - hopFace.faceFocus * 0.08,
        1,
      )
      mouthGroup.current.rotation.z = Math.sin(t * 1.1) * 0.012 * motion - happySnug * 0.014 + hopFace.rotateZ * 0.38
    }
  })

  return (
    <group>
      {featuresOnly ? null : (
        <CodedAssetOutlineMesh
          position={bodyPosition}
          scale={bodyScale}
          outlineWidth={outlineWidth}
          outlineColor={fitted ? FACE_RED_SHADE : VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 18, 12]} />}
          material={fitted ? <meshBasicMaterial color={FACE_RED} /> : toon(FACE_RED)}
        />
      )}
      {featuresOnly ? null : (
        <>
          {facePolishMarks.map((mark, index) => (
            <mesh
              key={`face-premium-polish-${index}`}
              position={mark.position}
              rotation-z={mark.rotation}
              scale={mark.scale}
            >
              <sphereGeometry args={[1, 10, 4]} />
              <meshBasicMaterial color={mark.color} transparent opacity={mark.opacity} depthWrite={false} />
            </mesh>
          ))}
          {faceSpeckles.map((speckle, index) => (
            <OrganicDetailDot
              key={`face-soft-speckle-${index}`}
              position={speckle.position}
              scale={speckle.scale}
              color={FACE_RED_SHADE}
              opacity={speckle.opacity}
            />
          ))}
        </>
      )}
      {bodyOnly ? null : (
        <group ref={mouthGroup}>
          <mesh position={[-0.02, -0.075, mouthZ]} scale={[0.15, 0.024, 0.012]}>
            <sphereGeometry args={[1, 12, 5]} />
            <meshBasicMaterial color="#050309" />
          </mesh>
          <mesh position={[0.055, -0.086, mouthShadeZ]} scale={[0.045, 0.012, 0.006]}>
            <sphereGeometry args={[1, 8, 4]} />
            <meshBasicMaterial color={FACE_RED_SHADE} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function ShellCavity() {
  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.015, -0.56]}
        scale={[0.5, 0.44, 0.04]}
        outlineWidth={0.012}
        geometry={<sphereGeometry args={[1, 12, 7]} />}
        material={toon(SHELL_DARK)}
      />
      <mesh position={[-0.08, 0.1, -0.648]} rotation-z={-0.25} scale={[0.18, 0.05, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.34} depthWrite={false} />
      </mesh>
    </group>
  )
}

function FittedFaceAssembly({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const featureGroup = useRef<THREE.Group>(null)
  const viewScratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      toCamera: new THREE.Vector3(),
    }),
    [],
  )

  useFrame(({ camera }) => {
    if (!featureGroup.current) return

    featureGroup.current.getWorldPosition(viewScratch.position)
    featureGroup.current.getWorldQuaternion(viewScratch.quaternion)
    viewScratch.forward.set(0, 0, -1).applyQuaternion(viewScratch.quaternion)
    viewScratch.toCamera.copy(camera.position).sub(viewScratch.position).normalize()
    const frontFacing = Math.max(0, viewScratch.forward.dot(viewScratch.toCamera))
    const featureRead = THREE.MathUtils.smoothstep(frontFacing, 0.08, 0.64)

    featureGroup.current.visible = frontFacing > 0.045
    featureGroup.current.position.z = -0.006 - 0.022 * (1 - featureRead)
    featureGroup.current.scale.set(0.96 + featureRead * 0.04, 0.96 + featureRead * 0.04, 1)
  })

  return (
    <>
      <RedFace fitted bodyOnly activity={activity} animation={animation} />
      <group ref={featureGroup}>
        <RedFace fitted featuresOnly activity={activity} animation={animation} />
        <Eye side={-1} pupilOffset={0.018} fitted activity={activity} animation={animation} />
        <Eye side={1} pupilOffset={-0.018} fitted activity={activity} animation={animation} />
      </group>
    </>
  )
}

function ShellInteriorPocket() {
  return null
}

function createOrganicSeedShellGeometry() {
  const geometry = new THREE.SphereGeometry(1, 30, 18, 0, Math.PI * 2, 0.55, Math.PI - 0.58)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const softDimple = 1 + 0.018 * Math.sin(x * 5.4 + y * 2.8) + 0.011 * Math.cos(z * 4.6 - x * 1.8)
    const broadPlump = 1 + 0.032 * Math.max(0, 1 - y * y * 1.15)
    const sideBias = x > 0 ? 1.016 : 0.993
    const topSquash = y > 0.58 ? 0.955 : 1
    const bottomSpread = y < -0.24 ? 1.052 : 1
    const baseWeight = y < -0.42 ? 0.92 : 1
    const backFullness = z > 0 ? 1.065 : 0.995
    const frontSnugFullness = z < -0.46 ? 1.018 : 1
    const seedLean = y > 0.2 ? -0.014 : 0.004

    position.setXYZ(
      index,
      x * softDimple * broadPlump * sideBias * bottomSpread + seedLean,
      y * softDimple * topSquash * baseWeight - (x > 0.54 ? 0.008 : 0),
      z * softDimple * broadPlump * backFullness * frontSnugFullness * (y < -0.2 ? 1.025 : 1),
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createShellOpeningWallGeometry() {
  const segments = 72
  const rings = 9
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const ease = t * t * (3 - 2 * t)
    const raisedLip = Math.sin(Math.PI * t)
    const innerGrip = Math.pow(1 - t, 2)
    const xRadius = 0.372 + ease * 0.29 + raisedLip * 0.046 - innerGrip * 0.018
    const yRadius = 0.272 + ease * 0.232 + raisedLip * 0.034 - innerGrip * 0.012
    const z = -0.704 + ease * 0.262 - raisedLip * 0.052

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const organic = 1 + Math.sin(angle * 3.1 + 0.45) * 0.02 + Math.cos(angle * 5.4 - 0.2) * 0.014
      const sidePlump = 1 + Math.max(0, Math.cos(angle)) * 0.1 + Math.max(0, -Math.cos(angle)) * 0.085
      const lowerWeight = 1 + Math.max(0, -Math.sin(angle)) * 0.16
      const upperPinch = 1 - Math.max(0, Math.sin(angle)) * 0.062
      const innerSqueeze = 1 - innerGrip * (0.025 + Math.max(0, Math.abs(Math.cos(angle)) - 0.35) * 0.04)
      vertices.push(
        0.024 + Math.cos(angle) * xRadius * organic * sidePlump * innerSqueeze,
        -0.036 + Math.sin(angle) * yRadius * organic * lowerWeight * upperPinch * innerSqueeze,
        z + Math.max(0, Math.cos(angle)) * 0.024 - Math.max(0, -Math.sin(angle)) * 0.034,
      )
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createShellOpeningShadowGeometry() {
  const segments = 56
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= 2; ring += 1) {
    const t = ring / 2
    const xRadius = 0.352 + t * 0.082
    const yRadius = 0.252 + t * 0.072
    const z = -0.632 + t * 0.034

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const lowerOcclusion = Math.max(0, -Math.sin(angle))
      const sideOcclusion = Math.max(0, Math.abs(Math.cos(angle)) - 0.28)
      const weight = 0.9 + lowerOcclusion * 0.08 + sideOcclusion * 0.04
      vertices.push(
        0.024 + Math.cos(angle) * xRadius * weight,
        -0.04 + Math.sin(angle) * yRadius * weight,
        z - lowerOcclusion * 0.018,
      )
    }
  }

  for (let ring = 0; ring < 2; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createShellOpeningPressureCreaseGeometry() {
  const segments = 72
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= 1; ring += 1) {
    const t = ring
    const xRadius = 0.356 + t * 0.068
    const yRadius = 0.258 + t * 0.058
    const z = -0.636 + t * 0.018

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const sidePressure = Math.max(0, Math.abs(Math.cos(angle)) - 0.25)
      const lowerPressure = Math.max(0, -Math.sin(angle))
      const organic = 1 + Math.sin(angle * 4.2 + 0.2) * 0.012 + Math.cos(angle * 7.1) * 0.008
      vertices.push(
        0.024 + Math.cos(angle) * xRadius * organic * (1 + sidePressure * 0.03),
        -0.041 + Math.sin(angle) * yRadius * organic * (1 + lowerPressure * 0.08),
        z - lowerPressure * 0.014,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const row = segments + 1
    indices.push(segment, segment + row, segment + 1)
    indices.push(segment + 1, segment + row, segment + row + 1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ShellOpeningWall() {
  const wallGeometry = useMemo(() => createShellOpeningWallGeometry(), [])
  const shadowGeometry = useMemo(() => createShellOpeningShadowGeometry(), [])
  const pressureCreaseGeometry = useMemo(() => createShellOpeningPressureCreaseGeometry(), [])

  return (
    <group>
      <mesh geometry={wallGeometry} visible={false}>
        {toon(SHELL_MID)}
      </mesh>
      <mesh geometry={shadowGeometry} visible={false}>
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh geometry={pressureCreaseGeometry} visible={false}>
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  )
}

function createOrganicShellOpeningCowlGeometry() {
  const segments = 96
  const tubeSegments = 20
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.24)
    const sideTuck = side * side
    const organic = 1 + Math.sin(angle * 3.2 + 0.5) * 0.008 + Math.cos(angle * 5.7 - 0.4) * 0.005
    const centerX = 0.438 + sideTuck * 0.034 - lower * 0.002
    const centerY = 0.324 + lower * 0.022 - upper * 0.003
    const centerZ = -0.71 - lower * 0.014 + sideTuck * 0.046
    const radialRadius = 0.058 + lower * 0.01 + sideTuck * 0.018
    const depthRadius = 0.04 + sideTuck * 0.014

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const shellSideMelt = Math.max(0, tubeRadial) * (0.074 + sideTuck * 0.046)
      const faceSideRoll = Math.max(0, -tubeRadial) * (0.018 + lower * 0.003)

      vertices.push(
        0.028 + cosAngle * (centerX + tubeRadial * radialRadius) * organic,
        -0.032 + sinAngle * (centerY + tubeRadial * radialRadius) * organic - lower * 0.03,
        centerZ + tubeDepth * depthRadius + shellSideMelt - faceSideRoll,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const base = segment * row + tube
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ShellOpeningOcclusionLip() {
  const lipGroup = useRef<THREE.Group>(null)
  const cowlGeometry = useMemo(() => createOrganicShellOpeningCowlGeometry(), [])

  useFrame(() => {
    if (lipGroup.current) {
      lipGroup.current.visible = true
      lipGroup.current.position.set(0, 0, 0)
      lipGroup.current.scale.set(1, 1, 1)
      lipGroup.current.rotation.set(0, 0, 0)
    }
  })

  return (
    <group ref={lipGroup}>
      <mesh geometry={cowlGeometry}>
        <meshToonMaterial
          color={SHELL_MID}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
        />
      </mesh>
      <mesh position={[0.016, -0.326, -0.744]} rotation-z={0.025} scale={[0.38, 0.026, 0.012]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SHELL_DEEP} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh position={[-0.05, 0.278, -0.758]} rotation-z={-0.05} scale={[0.24, 0.012, 0.008]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_EDGE_LIGHT} transparent opacity={0.24} depthWrite={false} />
      </mesh>
      <OrganicDetailStroke
        position={[-0.36, -0.03, -0.752]}
        rotation={-0.55}
        scale={[0.008, 0.084, 0.004]}
        color={SHELL_DEEP}
        opacity={0.22}
      />
      <OrganicDetailStroke
        position={[0.372, -0.02, -0.752]}
        rotation={0.55}
        scale={[0.008, 0.08, 0.004]}
        color={SHELL_DEEP}
        opacity={0.2}
      />
    </group>
  )
}

function ShellRearOcclusionPolish() {
  const rearPatch = useRef<THREE.Group>(null)
  const viewScratch = useMemo(
    () => ({
      back: new THREE.Vector3(),
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      toCamera: new THREE.Vector3(),
    }),
    [],
  )

  useFrame(({ camera }) => {
    if (!rearPatch.current) return

    rearPatch.current.getWorldPosition(viewScratch.position)
    rearPatch.current.getWorldQuaternion(viewScratch.quaternion)
    viewScratch.back.set(0, 0, 1).applyQuaternion(viewScratch.quaternion)
    viewScratch.toCamera.copy(camera.position).sub(viewScratch.position).normalize()
    rearPatch.current.visible = viewScratch.back.dot(viewScratch.toCamera) > 0.42
  })

  return (
    <group ref={rearPatch} visible={false}>
      <mesh renderOrder={24} position={[0.0, -0.064, 0.69]} rotation-z={-0.08} scale={[0.22, 0.046, 0.008]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_MID} transparent opacity={0.98} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh renderOrder={25} position={[-0.026, -0.044, 0.692]} rotation-z={0.08} scale={[0.09, 0.012, 0.005]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_EDGE_LIGHT} transparent opacity={0.14} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ShellSeedTexture() {
  const shellMottles: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.36, 0.2, -0.43], rotation: -0.32, scale: [0.1, 0.024, 0.008], color: SHELL_LIGHT, opacity: 0.18 },
    { position: [-0.26, -0.34, -0.42], rotation: 0.2, scale: [0.12, 0.02, 0.008], color: SHELL_DARK, opacity: 0.18 },
    { position: [0.06, 0.34, -0.45], rotation: 0.14, scale: [0.18, 0.024, 0.009], color: SHELL_LIGHT, opacity: 0.17 },
    { position: [0.34, -0.08, -0.43], rotation: -0.28, scale: [0.084, 0.02, 0.008], color: SHELL_DARK, opacity: 0.16 },
    { position: [0.28, -0.28, -0.42], rotation: 0.1, scale: [0.14, 0.018, 0.008], color: SHELL_DARK, opacity: 0.17 },
    { position: [-0.06, -0.44, -0.4], rotation: -0.06, scale: [0.12, 0.018, 0.007], color: SHELL_LIGHT, opacity: 0.16 },
    { position: [-0.5, -0.18, -0.45], rotation: -0.4, scale: [0.092, 0.02, 0.008], color: SHELL_LIGHT, opacity: 0.15 },
    { position: [0.46, 0.22, -0.44], rotation: 0.3, scale: [0.096, 0.022, 0.008], color: SHELL_DARK, opacity: 0.13 },
    { position: [0.04, -0.55, -0.37], rotation: 0.04, scale: [0.18, 0.018, 0.007], color: SHELL_DARK, opacity: 0.16 },
  ]
  const shellPores: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.42, 0.18, -0.49], scale: [0.01, 0.007, 0.004], color: SHELL_DARK, opacity: 0.22 },
    { position: [-0.31, -0.18, -0.5], scale: [0.008, 0.006, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [0.02, 0.42, -0.48], scale: [0.008, 0.006, 0.004], color: SHELL_DARK, opacity: 0.2 },
    { position: [0.2, 0.24, -0.5], scale: [0.009, 0.006, 0.004], color: SHELL_LIGHT, opacity: 0.22 },
    { position: [0.42, -0.04, -0.49], scale: [0.01, 0.007, 0.004], color: SHELL_DARK, opacity: 0.2 },
    { position: [0.08, -0.36, -0.49], scale: [0.008, 0.006, 0.004], color: SHELL_DARK, opacity: 0.18 },
  ]
  const shellDryFibers: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.46, 0.06, -0.53], rotation: -0.64, scale: [0.006, 0.046, 0.004], color: SHELL_DARK, opacity: 0.24 },
    { position: [-0.28, 0.3, -0.52], rotation: 0.4, scale: [0.005, 0.034, 0.004], color: SHELL_LIGHT, opacity: 0.22 },
    { position: [0.38, 0.18, -0.52], rotation: -0.42, scale: [0.006, 0.04, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [0.3, -0.25, -0.53], rotation: 0.68, scale: [0.005, 0.036, 0.004], color: SHELL_DARK, opacity: 0.22 },
    { position: [-0.12, -0.42, -0.52], rotation: -0.5, scale: [0.005, 0.03, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [-0.54, -0.12, -0.52], rotation: 0.58, scale: [0.005, 0.032, 0.004], color: SHELL_DARK, opacity: 0.2 },
    { position: [0.52, 0.02, -0.52], rotation: -0.72, scale: [0.005, 0.034, 0.004], color: SHELL_LIGHT, opacity: 0.2 },
  ]

  return (
    <group>
      <mesh position={[-0.15, 0.42, -0.39]} rotation-z={-0.18} scale={[0.34, 0.036, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_LIGHT} transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <mesh position={[0.26, 0.1, -0.43]} rotation-z={0.42} scale={[0.075, 0.28, 0.012]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SHELL_LIGHT} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[-0.39, -0.08, -0.44]} rotation-z={-0.18} scale={[0.055, 0.24, 0.012]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0.18, -0.36, -0.42]} rotation-z={0.08} scale={[0.36, 0.052, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {shellMottles.map((mottle, index) => (
        <mesh
          key={`shell-mottle-${index}`}
          position={mottle.position}
          rotation-z={mottle.rotation}
          scale={mottle.scale}
        >
          <sphereGeometry args={[1, 7, 4]} />
          <meshBasicMaterial color={mottle.color} transparent opacity={mottle.opacity} depthWrite={false} />
        </mesh>
      ))}
      {shellPores.map((pore, index) => (
        <OrganicDetailDot
          key={`shell-tiny-pore-${index}`}
          position={pore.position}
          scale={pore.scale}
          color={pore.color}
          opacity={pore.opacity}
        />
      ))}
      {shellDryFibers.map((fiber, index) => (
        <OrganicDetailStroke
          key={`shell-dry-fiber-${index}`}
          position={fiber.position}
          rotation={fiber.rotation}
          scale={fiber.scale}
          color={fiber.color}
          opacity={fiber.opacity}
        />
      ))}
    </group>
  )
}

function ShellPremiumPolish() {
  const softGlazeStrokes: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.2, 0.42, -0.585], rotation: -0.16, scale: [0.24, 0.02, 0.007], color: SHELL_GLAZE, opacity: 0.34 },
    { position: [0.22, 0.32, -0.59], rotation: 0.14, scale: [0.18, 0.018, 0.007], color: SHELL_GLAZE, opacity: 0.22 },
    { position: [-0.44, -0.02, -0.59], rotation: -0.58, scale: [0.012, 0.12, 0.005], color: SHELL_LIGHT, opacity: 0.18 },
    { position: [0.46, 0.02, -0.59], rotation: 0.55, scale: [0.012, 0.11, 0.005], color: SHELL_DARK, opacity: 0.18 },
    { position: [-0.12, -0.46, -0.56], rotation: -0.04, scale: [0.22, 0.014, 0.006], color: SHELL_DARK, opacity: 0.24 },
    { position: [0.3, -0.38, -0.55], rotation: 0.12, scale: [0.16, 0.013, 0.006], color: SHELL_DARK, opacity: 0.2 },
    { position: [-0.34, 0.1, -0.602], rotation: -0.78, scale: [0.014, 0.104, 0.005], color: SHELL_GLAZE, opacity: 0.18 },
    { position: [0.36, -0.11, -0.604], rotation: 0.62, scale: [0.013, 0.116, 0.005], color: SHELL_DEEP, opacity: 0.16 },
    { position: [-0.04, -0.555, -0.552], rotation: 0.02, scale: [0.26, 0.011, 0.005], color: SHELL_EDGE_LIGHT, opacity: 0.16 },
  ]
  const polishedPores: {
    position: [number, number, number]
    scale: [number, number, number]
    color: string
    opacity: number
  }[] = [
    { position: [-0.305, 0.325, -0.602], scale: [0.006, 0.004, 0.003], color: SHELL_DARK, opacity: 0.18 },
    { position: [-0.156, 0.39, -0.604], scale: [0.005, 0.004, 0.003], color: SHELL_DARK, opacity: 0.16 },
    { position: [0.092, 0.374, -0.604], scale: [0.005, 0.004, 0.003], color: SHELL_LIGHT, opacity: 0.2 },
    { position: [0.382, 0.118, -0.606], scale: [0.006, 0.004, 0.003], color: SHELL_DARK, opacity: 0.18 },
    { position: [-0.458, -0.22, -0.596], scale: [0.006, 0.004, 0.003], color: SHELL_LIGHT, opacity: 0.16 },
    { position: [0.206, -0.44, -0.584], scale: [0.006, 0.004, 0.003], color: SHELL_LIGHT, opacity: 0.18 },
  ]

  return (
    <group>
      <mesh position={[-0.012, -0.062, 0.524]} rotation-z={0.06} scale={[0.27, 0.136, 0.016]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshToonMaterial color={SHELL_MID} gradientMap={getVacuumHeadToonRampTexture()} depthWrite={false} />
      </mesh>
      <mesh position={[0.004, -0.062, 0.68]} rotation-z={-0.08} scale={[0.134, 0.026, 0.008]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_REAR_BLEND} depthWrite={false} />
      </mesh>
      <mesh position={[-0.086, 0.022, 0.536]} rotation-z={-0.28} scale={[0.13, 0.026, 0.006]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_GLAZE} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0.18, -0.22, 0.536]} rotation-z={0.18} scale={[0.18, 0.022, 0.007]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_DEEP} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0.035, 0.18, 0.53]} rotation-z={0.16} scale={[0.24, 0.022, 0.007]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_EDGE_LIGHT} transparent opacity={0.13} depthWrite={false} />
      </mesh>
      <mesh position={[-0.18, -0.22, 0.532]} rotation-z={-0.18} scale={[0.2, 0.02, 0.007]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_DEEP} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[0.004, -0.57, -0.48]} rotation-z={-0.018} scale={[0.5, 0.032, 0.018]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[0.0, 0.53, -0.46]} rotation-z={0.02} scale={[0.32, 0.022, 0.012]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={SHELL_GLAZE} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[-0.18, 0.475, -0.56]} rotation-z={-0.1} scale={[0.19, 0.014, 0.006]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={SHELL_EDGE_LIGHT} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0.54, -0.18, -0.52]} rotation-z={0.52} scale={[0.036, 0.16, 0.012]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SHELL_DARK} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[-0.48, -0.22, -0.54]} rotation-z={-0.62} scale={[0.034, 0.13, 0.011]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={SHELL_DEEP} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {softGlazeStrokes.map((stroke, index) => (
        <OrganicDetailStroke
          key={`shell-premium-glaze-${index}`}
          position={stroke.position}
          rotation={stroke.rotation}
          scale={stroke.scale}
          color={stroke.color}
          opacity={stroke.opacity}
        />
      ))}
      {polishedPores.map((pore, index) => (
        <OrganicDetailDot
          key={`shell-premium-pore-${index}`}
          position={pore.position}
          scale={pore.scale}
          color={pore.color}
          opacity={pore.opacity}
        />
      ))}
    </group>
  )
}

function SeedShell({
  empty = false,
  fitted = false,
}: {
  empty?: boolean
  fitted?: boolean
}) {
  const organicShellGeometry = useMemo(() => createOrganicSeedShellGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.035, -0.08]}
        rotation-x={-Math.PI / 2}
        rotation-z={-0.035}
        scale={[0.815, 0.735, 0.64]}
        outlineWidth={fitted ? 0.05 : 0.06}
        outlineColor={fitted ? SHELL_DEEP : VAC_ASSET_INK}
        geometry={<primitive object={organicShellGeometry} attach="geometry" />}
        material={toon(SHELL_MID)}
      />
      <ShellSeedTexture />
      <ShellPremiumPolish />
      <CodedAssetOutlineMesh
        position={[0, 0.08, -0.34]}
        rotation-z={-0.12}
        scale={[0.38, 0.2, 0.032]}
        outlineWidth={0.006}
        geometry={<sphereGeometry args={[1, 9, 5]} />}
        material={toon(SHELL_LIGHT)}
      />
      <CodedAssetOutlineMesh
        position={[-0.28, -0.28, -0.25]}
        rotation-z={0.24}
        scale={[0.22, 0.12, 0.026]}
        outlineWidth={0.005}
        geometry={<sphereGeometry args={[1, 8, 5]} />}
        material={toon(SHELL_DARK)}
      />

      {empty ? <ShellCavity /> : null}
      {fitted ? <ShellInteriorPocket /> : null}
      {fitted ? <ShellOpeningWall /> : null}

      <ShellCrack position={[0.29, 0.24, -0.68]} rotation={-0.35} scale={0.5} />
      <ShellCrack position={[-0.2, -0.33, -0.66]} rotation={0.28} scale={0.42} />
      <ShellCrack position={[0.1, 0.52, -0.32]} rotation={-0.18} scale={0.34} />
    </group>
  )
}

function SideKnob({
  side,
  fitted = false,
  activity = 1,
}: {
  side: -1 | 1
  fitted?: boolean
  activity?: number
}) {
  const knobGroup = useRef<THREE.Group>(null)
  const sideOffset = fitted ? 0.905 : 0.52
  const verticalOffset = fitted ? -0.018 : 0.01
  const depthOffset = fitted ? -0.035 : -0.2
  const knobScale: [number, number, number] = fitted ? [0.18, 0.18, 0.18] : [0.19, 0.19, 0.19]
  const socketReach = fitted ? 0.148 : 0.105
  const socketPosition: [number, number, number] = [side * -socketReach, -0.006, 0.018]
  const highlightX = side === -1 ? -0.04 : 0.04

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const happySnug = idlePulse(t, 6.2, 0.71, 0.055) * motion
    const handShake = Math.sin(t * 8.8 + side * 0.7) * 0.006 * motion + Math.sin(t * 14.2 + side) * 0.003 * motion
    const bob = Math.sin(t * 1.8 + side * 0.28) * 0.01 * motion + happySnug * 0.01 + handShake * 0.45
    const tinyPulse = Math.sin(t * 2.2 + side * 0.12) * 0.009 * motion + happySnug * 0.008

    if (knobGroup.current) {
      knobGroup.current.position.set(side * sideOffset + handShake * side * 0.55, verticalOffset + bob, depthOffset)
      knobGroup.current.rotation.z = side * (0.08 + Math.sin(t * 1.28 + 0.35) * 0.018 * motion + happySnug * 0.028 + handShake * 0.9)
      knobGroup.current.scale.set(1 + tinyPulse + happySnug * 0.018, 1 - tinyPulse * 0.45 - happySnug * 0.01, 1)
    }
  })

  return (
    <group ref={knobGroup} position={[side * sideOffset, verticalOffset, depthOffset]} rotation-z={side * 0.08}>
      {fitted ? (
        <mesh position={socketPosition} scale={[0.036, 0.092, 0.01]} rotation-z={side * 0.1}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.38} depthWrite={false} />
        </mesh>
      ) : null}
      <CodedAssetOutlineMesh
        scale={knobScale}
        outlineWidth={0.024}
        geometry={<sphereGeometry args={[1, 12, 8]} />}
        material={toon(KNOB_RED)}
      />
      <mesh position={[highlightX, 0.052, -0.135]} scale={[0.052, 0.046, 0.012]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial color="#ff8b72" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[highlightX * 0.64, -0.064, -0.14]} rotation-z={side * -0.28} scale={[0.07, 0.018, 0.008]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={FACE_RED_SHADE} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[side * -0.07, 0.008, -0.152]} rotation-z={side * 0.4} scale={[0.035, 0.007, 0.004]}>
        <sphereGeometry args={[1, 7, 4]} />
        <meshBasicMaterial color="#ffc0aa" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <OrganicDetailStroke
        position={[side * 0.026, -0.012, -0.146]}
        rotation={side * -0.48}
        scale={[0.032, 0.006, 0.004]}
        color={FACE_RED_SHADE}
        opacity={0.24}
      />
      <OrganicDetailDot
        position={[side * -0.036, 0.022, -0.152]}
        scale={[0.008, 0.006, 0.004]}
        color="#ffb19a"
        opacity={0.4}
      />
    </group>
  )
}

function IdleSnuggleMarks({ activity = 1 }: { activity?: number }) {
  const markGroup = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const pulse = idlePulse(t, 6.2, 0.71, 0.052) * motion

    if (markGroup.current) {
      markGroup.current.visible = pulse > 0.012
      markGroup.current.position.y = Math.sin(t * 10.5) * 0.008 * pulse
      markGroup.current.scale.set(0.95 + pulse * 0.18, 0.95 + pulse * 0.22, 1)
      markGroup.current.rotation.z = Math.sin(t * 12.2) * 0.024 * pulse
    }
  })

  return (
    <group ref={markGroup} visible={false}>
      <mesh position={[-0.94, 0.09, -0.185]} rotation-z={-0.36} scale={[0.012, 0.062, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[-0.88, 0.16, -0.19]} rotation-z={-0.52} scale={[0.01, 0.044, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh position={[0.94, 0.09, -0.185]} rotation-z={0.36} scale={[0.012, 0.062, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[0.88, 0.16, -0.19]} rotation-z={0.52} scale={[0.01, 0.044, 0.006]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </group>
  )
}

function RedCharacter({
  fitted = false,
  activity = 1,
  animation = 'idle',
}: {
  fitted?: boolean
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const fittedBodyOffset: [number, number, number] = fitted ? [0.02, -0.034, 0.006] : [0, 0, 0]

  return (
    <>
      <SideKnob side={-1} fitted={fitted} activity={activity} />
      <SideKnob side={1} fitted={fitted} activity={activity} />
      {fitted ? <IdleSnuggleMarks activity={activity} /> : null}
      <group position={fittedBodyOffset}>
        {fitted ? (
          <FittedFaceAssembly activity={activity} animation={animation} />
        ) : (
          <>
            <RedFace activity={activity} animation={animation} />
            <Eye side={-1} pupilOffset={0.018} activity={activity} animation={animation} />
            <Eye side={1} pupilOffset={-0.018} activity={activity} animation={animation} />
          </>
        )}
      </group>
    </>
  )
}

function createWizardCloakGeometry() {
  const points = [
    new THREE.Vector2(0, 0.82),
    new THREE.Vector2(0.16, 0.815),
    new THREE.Vector2(0.34, 0.745),
    new THREE.Vector2(0.52, 0.58),
    new THREE.Vector2(0.68, 0.32),
    new THREE.Vector2(0.8, -0.02),
    new THREE.Vector2(0.84, -0.36),
    new THREE.Vector2(0.78, -0.63),
    new THREE.Vector2(0.6, -0.77),
    new THREE.Vector2(0.28, -0.805),
    new THREE.Vector2(0.07, -0.795),
  ]
  const geometry = new THREE.LatheGeometry(points, 38)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const azimuth = Math.atan2(z, x || 0.0001)
    const lowerWeight = y < -0.34 ? 1.06 : 1
    const hoodPinch = y > 0.42 ? 0.91 : 1
    const clothFalloff = smoothstep01((0.62 - y) / 1.18)
    const hoodSmooth = 1 - smoothstep01((y - 0.28) / 0.48) * 0.58
    const verticalDrape =
      1 +
      clothFalloff *
        hoodSmooth *
        (0.042 * Math.sin(azimuth * 3.15 + y * 4.4) + 0.019 * Math.cos(azimuth * 6.1 - y * 2.6))
    const hemRipple = y < -0.55 ? 1 + 0.034 * Math.sin(azimuth * 8.0 + y * 2.2) : 1
    const shoulderSag = y > 0.32 && z < 0 ? 1 - 0.012 * Math.sin(azimuth * 2.0 + 0.4) : 1
    const wobble = 1 + hoodSmooth * (0.018 * Math.sin(index * 1.83) + 0.012 * Math.cos(y * 8.2 + z * 4.4))
    const frontFullness = z < 0 ? 1.045 : 0.955
    const hemWeight = y < -0.64 ? 1.035 : 1
    const nextX = x * lowerWeight * hoodPinch * hemWeight * (x === 0 ? 1 : wobble * verticalDrape * hemRipple * shoulderSag)
    const nextY = y + 0.01 * Math.sin(x * 7 + z * 4) - clothFalloff * 0.006 * Math.max(0, Math.cos(azimuth * 3.0))
    let nextZ = z * lowerWeight * frontFullness * wobble * verticalDrape * hemRipple * shoulderSag
    const aperture = (nextX / 0.56) ** 2 + ((nextY + 0.05) / 0.52) ** 2

    if (nextZ < -0.34 && aperture < 1.08) {
      const recess = smoothstep01((1.08 - aperture) / 0.38)
      const backWallZ = -0.405 + Math.max(0, -nextY - 0.18) * 0.08
      nextZ = nextZ * (1 - recess) + backWallZ * recess
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function WizardCloakTexture() {
  const raisedFolds: {
    position: [number, number, number]
    rotation: number
    scale: [number, number, number]
    color: string
  }[] = [
    { position: [-0.68, -0.06, -0.18], rotation: -0.92, scale: [0.1, 0.01, 0.007], color: CLOAK_FOLD_LIGHT },
    { position: [0.68, -0.08, -0.18], rotation: 0.92, scale: [0.1, 0.01, 0.007], color: CLOAK_FOLD_LIGHT },
    { position: [-0.7, -0.2, -0.16], rotation: -1.0, scale: [0.16, 0.012, 0.007], color: CLOAK_HEM_DARK },
    { position: [0.7, -0.24, -0.16], rotation: 1.0, scale: [0.16, 0.012, 0.007], color: CLOAK_HEM_DARK },
    { position: [-0.48, -0.58, -0.38], rotation: -0.28, scale: [0.18, 0.011, 0.007], color: CLOAK_MATTE_SHEEN },
    { position: [0.5, -0.58, -0.38], rotation: 0.28, scale: [0.18, 0.011, 0.007], color: CLOAK_MATTE_SHEEN },
  ]

  return (
    <>
      {raisedFolds.map((fold, index) => (
        <mesh
          key={`wizard-cloak-raised-fold-${index}`}
          position={fold.position}
          rotation-z={fold.rotation}
          scale={fold.scale}
        >
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={fold.color} depthTest depthWrite />
        </mesh>
      ))}
      <mesh position={[0, -0.79, -0.18]} scale={[0.58, 0.035, 0.075]}>
        <sphereGeometry args={[1, 12, 5]} />
        <meshBasicMaterial color={CLOAK_HEM_DARK} transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </>
  )
}

function createWizardCloakOpeningCowlGeometry() {
  const segments = 96
  const tubeSegments = 20
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.22)
    const sideTuck = side * side
    const topCover = upper * upper
    const organic = 1 + Math.sin(angle * 2.6 + 0.35) * 0.006 + Math.cos(angle * 4.9 - 0.2) * 0.004
    const centerX = 0.526 + sideTuck * 0.024 - lower * 0.004
    const centerY = 0.43 + lower * 0.024 - upper * 0.018
    const centerZ = -0.704 + topCover * 0.018 - lower * 0.006 + sideTuck * 0.006
    const radialRadius = 0.052 + lower * 0.009 + sideTuck * 0.008 - topCover * 0.012
    const depthRadius = 0.022 + sideTuck * 0.004 - topCover * 0.004

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const cloakMelt = Math.max(0, tubeRadial) * (0.102 + sideTuck * 0.044 - topCover * 0.028)
      const faceRoll = Math.max(0, -tubeRadial) * (0.016 + lower * 0.004)

      vertices.push(
        cosAngle * (centerX + tubeRadial * radialRadius) * organic,
        -0.048 + sinAngle * (centerY + tubeRadial * radialRadius) * organic - lower * 0.02,
        centerZ + tubeDepth * depthRadius + cloakMelt - faceRoll,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const base = segment * row + tube
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardCloakOpeningSealGeometry() {
  const segments = 96
  const rings = 8
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const ease = t * t * (3 - 2 * t)

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      const lower = Math.max(0, -sinAngle)
      const upper = Math.max(0, sinAngle)
      const side = Math.max(0, Math.abs(cosAngle) - 0.22)
      const sideTuck = side * side
      const organic = 1 + Math.sin(angle * 2.6 + 0.35) * 0.008 + Math.cos(angle * 4.9 - 0.2) * 0.005
      const radiusX = 0.53 + ease * (0.18 + sideTuck * 0.052) - lower * 0.006
      const radiusY = 0.414 + ease * (0.138 + lower * 0.036) - upper * 0.006
      const y = -0.05 + sinAngle * radiusY * organic - lower * (0.018 + ease * 0.02)
      const z =
        -0.585 +
        ease * (0.276 + sideTuck * 0.046) +
        Math.max(0, cosAngle) * ease * 0.024 -
        lower * ease * 0.01

      vertices.push(cosAngle * radiusX * organic, y, z)
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardCloakOpeningUnderrollGeometry() {
  const segments = 96
  const tubeSegments = 18
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.18)
    const sideTuck = side * side
    const organic = 1 + Math.sin(angle * 2.4 + 0.5) * 0.006 + Math.cos(angle * 5.2) * 0.004
    const centerX = 0.548 + sideTuck * 0.036 + lower * 0.006
    const centerY = 0.43 + lower * 0.026 - upper * 0.012
    const centerZ = -0.54 + sideTuck * 0.032 - lower * 0.014
    const radialRadius = 0.07 + sideTuck * 0.02 + lower * 0.01
    const depthRadius = 0.072 + sideTuck * 0.028

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const cloakContact = Math.max(0, tubeRadial) * (0.2 + sideTuck * 0.11 + lower * 0.018)
      const rimTuck = Math.max(0, -tubeRadial) * (0.014 + sideTuck * 0.012)

      vertices.push(
        cosAngle * (centerX + tubeRadial * radialRadius) * organic,
        -0.052 + sinAngle * (centerY + tubeRadial * radialRadius) * organic - lower * 0.026,
        centerZ + tubeDepth * depthRadius + cloakContact - rimTuck,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const base = segment * row + tube
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardHoodTopDrapeGeometry() {
  const startAngle = Math.PI * 0.105
  const endAngle = Math.PI * 0.895
  const segments = 72
  const widthSegments = 12
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const t = segment / segments
    const angle = startAngle + (endAngle - startAngle) * t
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const crown = Math.sin(t * Math.PI)
    const endFeather = Math.pow(Math.max(0.001, crown), 0.62)
    const side = Math.max(0, Math.abs(cosAngle) - 0.24)
    const sideTuck = side * side
    const organic = 1 + Math.sin(t * Math.PI * 3.1 + 0.25) * 0.01 + Math.cos(t * Math.PI * 5.2) * 0.005

    for (let width = 0; width <= widthSegments; width += 1) {
      const u = width / widthSegments
      const ease = u * u * (3 - 2 * u)
      const widthFeather = 0.58 + endFeather * 0.42
      const sideSeal = (1 - crown) * 0.012 + sideTuck * 0.012
      const lipBite = (1 - ease) * (0.028 + crown * 0.018 + sideSeal)
      const radiusX = 0.488 + ease * (0.152 + crown * 0.048) * widthFeather + sideTuck * 0.026 - crown * 0.012
      const radiusY = 0.434 + ease * (0.116 + crown * 0.038) * widthFeather + crown * 0.018 + sideSeal * 0.18
      const clothSag = Math.sin(u * Math.PI) * (0.011 + crown * 0.011 + sideSeal * 0.12)
      const z =
        -0.774 +
        ease * (0.224 + crown * 0.038 + sideTuck * 0.034) +
        crown * 0.012 -
        (1 - widthFeather) * 0.014 -
        lipBite

      vertices.push(
        cosAngle * radiusX * organic,
        -0.048 + sinAngle * radiusY * organic + clothSag,
        z,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let width = 0; width < widthSegments; width += 1) {
      const row = widthSegments + 1
      const base = segment * row + width
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardHoodCrownFoldGeometry() {
  const startAngle = Math.PI * 0.035
  const endAngle = Math.PI * 0.965
  const segments = 96
  const tubeSegments = 18
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const t = segment / segments
    const angle = startAngle + (endAngle - startAngle) * t
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const crown = Math.sin(t * Math.PI)
    const side = Math.max(0, Math.abs(cosAngle) - 0.18)
    const sideTuck = side * side
    const organic = 1 + Math.sin(t * Math.PI * 2.7 + 0.35) * 0.01 + Math.cos(t * Math.PI * 5.4) * 0.006
    const endSeal = Math.pow(Math.max(0, 1 - crown), 1.25)
    const centerRadiusX = 0.544 + crown * 0.01 + sideTuck * 0.052 + endSeal * 0.036
    const centerRadiusY = 0.474 + crown * 0.026 + endSeal * 0.026
    const centerZ = -0.678 + crown * 0.018 + sideTuck * 0.064 + endSeal * 0.054
    const radialRadius = 0.066 + crown * 0.016 + sideTuck * 0.024 + endSeal * 0.026
    const depthRadius = 0.056 + crown * 0.014 + sideTuck * 0.028 + endSeal * 0.024

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const outerMelt = Math.max(0, tubeRadial) * (0.104 + crown * 0.038 + sideTuck * 0.124 + endSeal * 0.092)
      const innerRoll = Math.max(0, -tubeRadial) * (0.018 + crown * 0.012 + endSeal * 0.02)

      vertices.push(
        cosAngle * (centerRadiusX + tubeRadial * radialRadius) * organic,
        -0.052 + sinAngle * (centerRadiusY + tubeRadial * radialRadius) * organic,
        centerZ + tubeDepth * depthRadius + outerMelt - innerRoll,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const base = segment * row + tube
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const row = tubeSegments + 1
  const capEnd = (segmentIndex: number, reverse: boolean) => {
    const ringStart = segmentIndex * row
    let centerX = 0
    let centerY = 0
    let centerZ = 0

    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const vertexIndex = (ringStart + tube) * 3
      centerX += vertices[vertexIndex]
      centerY += vertices[vertexIndex + 1]
      centerZ += vertices[vertexIndex + 2]
    }

    const centerIndex = vertices.length / 3
    vertices.push(centerX / tubeSegments, centerY / tubeSegments, centerZ / tubeSegments)

    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const nextTube = tube + 1
      if (reverse) {
        indices.push(centerIndex, ringStart + nextTube, ringStart + tube)
      } else {
        indices.push(centerIndex, ringStart + tube, ringStart + nextTube)
      }
    }
  }

  capEnd(0, true)
  capEnd(segments, false)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardHoodRollBackfillGeometry() {
  const startAngle = Math.PI * 0.085
  const endAngle = Math.PI * 0.915
  const segments = 72
  const widthSegments = 5
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const t = segment / segments
    const angle = startAngle + (endAngle - startAngle) * t
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const crown = Math.sin(t * Math.PI)
    const endSeal = Math.pow(Math.max(0, 1 - crown), 1.65)
    const side = Math.max(0, Math.abs(cosAngle) - 0.2)
    const sideTuck = side * side
    const organic = 1 + Math.sin(t * Math.PI * 3.4 + 0.2) * 0.008 + Math.cos(t * Math.PI * 5.7) * 0.005

    for (let width = 0; width <= widthSegments; width += 1) {
      const u = width / widthSegments
      const ease = u * u * (3 - 2 * u)
      const edgeBite = (1 - ease) * (0.024 + endSeal * 0.026)
      const radiusX = 0.528 + ease * (0.176 + crown * 0.052 + endSeal * 0.042) + sideTuck * 0.046
      const radiusY = 0.452 + ease * (0.128 + crown * 0.046 + endSeal * 0.032) + endSeal * 0.01
      const z =
        -0.684 +
        ease * (0.252 + crown * 0.026 + sideTuck * 0.082 + endSeal * 0.046) -
        edgeBite

      vertices.push(
        cosAngle * radiusX * organic,
        -0.05 + sinAngle * radiusY * organic + Math.sin(u * Math.PI) * (0.01 + endSeal * 0.012),
        z,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let width = 0; width < widthSegments; width += 1) {
      const row = widthSegments + 1
      const base = segment * row + width
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardHoodSideGapSealGeometry() {
  const sideSegments = 14
  const heightSegments = 14
  const vertices: number[] = []
  const indices: number[] = []

  for (const side of [-1, 1]) {
    const sideOffset = vertices.length / 3

    for (let height = 0; height <= heightSegments; height += 1) {
      const v = height / heightSegments
      const verticalEase = v * v * (3 - 2 * v)
      const shoulderRound = Math.sin(v * Math.PI)
      const endRound = 1 - shoulderRound
      const taper = 0.46 + shoulderRound * 0.54

      for (let width = 0; width <= sideSegments; width += 1) {
        const u = width / sideSegments
        const ease = u * u * (3 - 2 * u)
        const bite = (1 - ease) * (0.024 + shoulderRound * 0.014 + endRound * 0.012)
        const x =
          side *
          (0.492 +
            ease * (0.118 + shoulderRound * 0.052) * taper +
            shoulderRound * 0.014)
        const y =
          -0.035 +
          verticalEase * 0.372 +
          Math.sin(u * Math.PI) * (0.014 + shoulderRound * 0.014)
        const z =
          -0.704 +
          ease * (0.238 + shoulderRound * 0.066) * taper +
          shoulderRound * 0.014 -
          endRound * 0.014 -
          bite

        vertices.push(x, y, z)
      }
    }

    for (let height = 0; height < heightSegments; height += 1) {
      for (let width = 0; width < sideSegments; width += 1) {
        const row = sideSegments + 1
        const base = sideOffset + height * row + width
        if (side < 0) {
          indices.push(base, base + row, base + 1)
          indices.push(base + 1, base + row, base + row + 1)
        } else {
          indices.push(base, base + 1, base + row)
          indices.push(base + 1, base + row + 1, base + row)
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardHoodPaneEndRollGeometry() {
  const pathSegments = 32
  const tubeSegments = 18
  const vertices: number[] = []
  const indices: number[] = []
  const lowerRedClearance = 0.5

  for (const side of [-1, 1]) {
    const sideOffset = vertices.length / 3

    for (let path = 0; path <= pathSegments; path += 1) {
      const pathT = path / pathSegments
      const t = lowerRedClearance + pathT * (1 - lowerRedClearance)
      const shoulder = Math.sin(t * Math.PI)
      const topHook = smoothstep01((t - 0.7) / 0.3)
      const endRound = topHook * 0.92
      const centerX = side * (0.512 + shoulder * 0.058 - topHook * 0.082)
      const centerY = -0.198 + t * 0.47 + shoulder * 0.026 - topHook * 0.08
      const centerZ = -0.704 + t * 0.184 + shoulder * 0.072 + topHook * 0.002
      const tubeX = 0.05 + shoulder * 0.013 + endRound * 0.02
      const tubeY = 0.032 + shoulder * 0.009 + endRound * 0.014
      const tubeZ = 0.034 + shoulder * 0.013 + topHook * 0.014
      const wobble = 1 + Math.sin(t * Math.PI * 3.2 + side * 0.6) * 0.008

      for (let tube = 0; tube <= tubeSegments; tube += 1) {
        const angle = (tube / tubeSegments) * Math.PI * 2
        const radial = Math.cos(angle)
        const vertical = Math.sin(angle)
        const foldBite = Math.max(0, -radial) * (0.016 + shoulder * 0.01 + endRound * 0.01)

        vertices.push(
          centerX + side * radial * tubeX * wobble,
          centerY + vertical * tubeY,
          centerZ + radial * tubeZ - foldBite + Math.max(0, radial) * (0.022 + shoulder * 0.018),
        )
      }
    }

    const row = tubeSegments + 1
    for (let path = 0; path < pathSegments; path += 1) {
      for (let tube = 0; tube < tubeSegments; tube += 1) {
        const base = sideOffset + path * row + tube
        if (side < 0) {
          indices.push(base, base + row, base + 1)
          indices.push(base + 1, base + row, base + row + 1)
        } else {
          indices.push(base, base + 1, base + row)
          indices.push(base + 1, base + row + 1, base + row)
        }
      }
    }

    const capRing = (pathIndex: number, reverse: boolean) => {
      const ringStart = sideOffset + pathIndex * row
      let centerX = 0
      let centerY = 0
      let centerZ = 0

      for (let tube = 0; tube < tubeSegments; tube += 1) {
        const vertexIndex = (ringStart + tube) * 3
        centerX += vertices[vertexIndex]
        centerY += vertices[vertexIndex + 1]
        centerZ += vertices[vertexIndex + 2]
      }

      const centerIndex = vertices.length / 3
      vertices.push(centerX / tubeSegments, centerY / tubeSegments, centerZ / tubeSegments)

      for (let tube = 0; tube < tubeSegments; tube += 1) {
        const a = ringStart + tube
        const b = ringStart + tube + 1
        if (reverse) {
          indices.push(centerIndex, b, a)
        } else {
          indices.push(centerIndex, a, b)
        }
      }
    }

    capRing(0, side < 0)
    capRing(pathSegments, side > 0)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWizardHoodSideBridgeTubeGeometries() {
  return [-1, 1].map((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.555, -0.018, -0.56),
      new THREE.Vector3(side * 0.602, 0.058, -0.532),
      new THREE.Vector3(side * 0.62, 0.16, -0.5),
      new THREE.Vector3(side * 0.57, 0.255, -0.47),
    ])

    return new THREE.TubeGeometry(curve, 34, 0.062, 11, false)
  })
}

function createWizardHoodSideEdgeHemGeometries() {
  return [-1, 1].map((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.552, 0.19, -0.422),
      new THREE.Vector3(side * 0.646, 0.08, -0.35),
      new THREE.Vector3(side * 0.69, -0.06, -0.286),
      new THREE.Vector3(side * 0.672, -0.2, -0.238),
      new THREE.Vector3(side * 0.612, -0.31, -0.222),
    ])

    return new THREE.TubeGeometry(curve, 44, 0.038, 11, false)
  })
}

function createWizardHoodRolledPerimeterGeometry() {
  const startAngle = Math.PI * 0.018
  const endAngle = Math.PI * 0.982
  const segments = 104
  const tubeSegments = 18
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const t = segment / segments
    const angle = startAngle + (endAngle - startAngle) * t
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const crown = Math.sin(t * Math.PI)
    const endRoll = Math.pow(Math.max(0, 1 - crown), 0.82)
    const side = Math.max(0, Math.abs(cosAngle) - 0.16)
    const sideTuck = side * side
    const organic =
      1 + Math.sin(t * Math.PI * 2.9 + 0.28) * 0.008 + Math.cos(t * Math.PI * 5.8 - 0.12) * 0.005
    const centerRadiusX = 0.56 + crown * 0.018 + sideTuck * 0.076 + endRoll * 0.062
    const centerRadiusY = 0.492 + crown * 0.03 + endRoll * 0.04
    const centerZ = -0.64 + crown * 0.026 + sideTuck * 0.09 + endRoll * 0.092
    const radialRadius = 0.074 + crown * 0.016 + sideTuck * 0.026 + endRoll * 0.038
    const depthRadius = 0.076 + crown * 0.018 + sideTuck * 0.032 + endRoll * 0.034

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const clothMelt = Math.max(0, tubeRadial) * (0.138 + crown * 0.048 + sideTuck * 0.178 + endRoll * 0.126)
      const undersideTuck = Math.max(0, -tubeRadial) * (0.026 + sideTuck * 0.018 + endRoll * 0.028)
      const verticalRoll = tubeDepth * (0.01 + crown * 0.006 + endRoll * 0.01)

      vertices.push(
        cosAngle * (centerRadiusX + tubeRadial * radialRadius) * organic,
        -0.052 + sinAngle * (centerRadiusY + tubeRadial * radialRadius) * organic + verticalRoll,
        centerZ + tubeDepth * depthRadius + clothMelt - undersideTuck,
      )
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const row = tubeSegments + 1
      const base = segment * row + tube
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const row = tubeSegments + 1
  const capEnd = (segmentIndex: number, reverse: boolean) => {
    const ringStart = segmentIndex * row
    let centerX = 0
    let centerY = 0
    let centerZ = 0

    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const vertexIndex = (ringStart + tube) * 3
      centerX += vertices[vertexIndex]
      centerY += vertices[vertexIndex + 1]
      centerZ += vertices[vertexIndex + 2]
    }

    const centerIndex = vertices.length / 3
    vertices.push(centerX / tubeSegments, centerY / tubeSegments, centerZ / tubeSegments)

    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const nextTube = tube + 1
      if (reverse) {
        indices.push(centerIndex, ringStart + nextTube, ringStart + tube)
      } else {
        indices.push(centerIndex, ringStart + tube, ringStart + nextTube)
      }
    }
  }

  capEnd(0, true)
  capEnd(segments, false)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function WizardHoodOpening({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const rim = useRef<THREE.Group>(null)
  const cowlGeometry = useMemo(() => createWizardCloakOpeningCowlGeometry(), [])
  const underrollGeometry = useMemo(() => createWizardCloakOpeningUnderrollGeometry(), [])
  const topDrapeGeometry = useMemo(() => createWizardHoodTopDrapeGeometry(), [])
  const crownFoldGeometry = useMemo(() => createWizardHoodCrownFoldGeometry(), [])
  const rollBackfillGeometry = useMemo(() => createWizardHoodRollBackfillGeometry(), [])
  const sideGapSealGeometry = useMemo(() => createWizardHoodSideGapSealGeometry(), [])
  const paneEndRollGeometry = useMemo(() => createWizardHoodPaneEndRollGeometry(), [])
  const sideBridgeTubeGeometries = useMemo(() => createWizardHoodSideBridgeTubeGeometries(), [])
  const sideEdgeHemGeometries = useMemo(() => createWizardHoodSideEdgeHemGeometries(), [])
  const rolledPerimeterGeometry = useMemo(() => createWizardHoodRolledPerimeterGeometry(), [])
  const sealGeometry = useMemo(() => createWizardCloakOpeningSealGeometry(), [])

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const grumble = getWizardGrumbleMotion(t + 0.04, animation === 'grumble' ? motion : 0)
    const settle = Math.sin(t * 1.32 + 0.2) * 0.006 * motion + idlePulse(t, 5.8, 0.7, 0.07) * 0.018 * motion

    if (rim.current) {
      rim.current.position.y = settle + grumble.chatter * 0.25 + grumble.bodyJolt * 0.2
      rim.current.rotation.z = Math.sin(t * 0.92) * 0.008 * motion + grumble.bodyLean * 0.35 + grumble.hit * 0.014
      rim.current.scale.set(1 + settle * 0.18 + grumble.impact * 0.018, 1 - settle * 0.1 - grumble.impact * 0.012, 1)
    }
  })

  return (
    <group ref={rim}>
      <mesh geometry={underrollGeometry}>
        <meshBasicMaterial
          color={CLOAK_BLACK}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={sealGeometry}>
        <meshToonMaterial
          color={CLOAK_BLACK}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={topDrapeGeometry} visible={false}>
        <meshToonMaterial
          color={CLOAK_BLACK}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rollBackfillGeometry} visible={false}>
        <meshToonMaterial
          color={CLOAK_BLACK}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={sideGapSealGeometry} visible={false}>
        <meshToonMaterial
          color={CLOAK_BLACK}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      {sideBridgeTubeGeometries.map((geometry, index) => (
        <mesh key={`wizard-hood-side-bridge-${index}`} geometry={geometry}>
          <meshToonMaterial
            color={CLOAK_BLACK}
            gradientMap={getVacuumHeadToonRampTexture()}
            depthTest
            depthWrite
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={`wizard-hood-pane-round-caps-${side}`}>
          <mesh position={[side * 0.58, 0.065, -0.522]} scale={[0.058, 0.044, 0.04]}>
            <sphereGeometry args={[1, 9, 5]} />
            <meshBasicMaterial color={CLOAK_HEM_DARK} depthTest depthWrite />
          </mesh>
          <mesh position={[side * 0.432, 0.19, -0.518]} scale={[0.076, 0.06, 0.054]}>
            <sphereGeometry args={[1, 9, 5]} />
            <meshBasicMaterial color={CLOAK_HEM_DARK} depthTest depthWrite />
          </mesh>
          <mesh position={[side * 0.562, 0.242, -0.468]} scale={[0.072, 0.056, 0.052]}>
            <sphereGeometry args={[1, 9, 5]} />
            <meshBasicMaterial color={CLOAK_BLACK} depthTest depthWrite />
          </mesh>
        </group>
      ))}
      {sideEdgeHemGeometries.map((geometry, index) => {
        const side = index === 0 ? -1 : 1

        return (
          <group key={`wizard-hood-side-edge-hem-${side}`}>
            <mesh geometry={geometry}>
              <meshToonMaterial
                color={CLOAK_BLACK}
                gradientMap={getVacuumHeadToonRampTexture()}
                depthTest
                depthWrite
              />
            </mesh>
            <mesh position={[side * 0.552, 0.19, -0.422]} scale={[0.056, 0.046, 0.04]}>
              <sphereGeometry args={[1, 9, 5]} />
              <meshBasicMaterial color={CLOAK_BLACK} depthTest depthWrite />
            </mesh>
            <mesh position={[side * 0.62, -0.31, -0.22]} scale={[0.036, 0.032, 0.028]}>
              <sphereGeometry args={[1, 9, 5]} />
              <meshBasicMaterial color={CLOAK_BLACK} depthTest depthWrite />
            </mesh>
          </group>
        )
      })}
      <mesh geometry={cowlGeometry}>
        <meshToonMaterial
          color={CLOAK_RED_TRIM}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={paneEndRollGeometry}>
        <meshToonMaterial
          color={CLOAK_HEM_DARK}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rolledPerimeterGeometry}>
        <meshToonMaterial
          color={CLOAK_BLACK}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={crownFoldGeometry}>
        <meshToonMaterial
          color={CLOAK_BLACK}
          gradientMap={getVacuumHeadToonRampTexture()}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function createWizardFacePlugGeometry() {
  const segments = 72
  const frontRings = 8
  const sideRings = 5
  const rx = 0.414
  const ry = 0.334
  const centerY = -0.058
  const frontZ = -0.642
  const sideDepth = 0.076
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= frontRings; ring += 1) {
    const t = ring / frontRings
    const ease = t * t * (3 - 2 * t)

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      const lower = Math.max(0, -sinAngle)
      const side = Math.max(0, Math.abs(cosAngle) - 0.32)
      const organic = 1 + ease * (Math.sin(angle * 2.2 + 0.15) * 0.01 + Math.cos(angle * 4.7) * 0.006)
      const dome = (1 - ease * ease) * (0.064 + lower * 0.008)

      vertices.push(
        cosAngle * rx * ease * organic * (1 + side * 0.006),
        centerY + sinAngle * ry * ease * organic * (1 + lower * 0.035),
        frontZ - dome + ease * 0.01 - lower * ease * 0.005,
      )
    }
  }

  for (let ring = 0; ring < frontRings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const base = ring * row + segment
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const sideStart = vertices.length / 3
  for (let ring = 1; ring <= sideRings; ring += 1) {
    const t = ring / sideRings

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)
      const lower = Math.max(0, -sinAngle)
      const side = Math.max(0, Math.abs(cosAngle) - 0.32)
      const organic = 1 + Math.sin(angle * 2.2 + 0.15) * 0.01 + Math.cos(angle * 4.7) * 0.006
      const tuck = 1 - t * (0.096 + side * 0.044 + lower * 0.032)

      vertices.push(
        cosAngle * rx * organic * tuck,
        centerY + sinAngle * ry * organic * tuck * (1 + lower * 0.045),
        frontZ + t * sideDepth,
      )
    }
  }

  const frontOuter = frontRings * (segments + 1)
  for (let ring = 0; ring < sideRings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1
      const a = ring === 0 ? frontOuter + segment : sideStart + (ring - 1) * row + segment
      const b = ring === 0 ? frontOuter + segment + 1 : sideStart + (ring - 1) * row + segment + 1
      const c = sideStart + ring * row + segment
      const d = sideStart + ring * row + segment + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function WizardFace({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const face = useRef<THREE.Group>(null)
  const brow = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Group>(null)
  const leftEye = useRef<THREE.Group>(null)
  const rightEye = useRef<THREE.Group>(null)
  const leftPupil = useRef<THREE.Mesh>(null)
  const rightPupil = useRef<THREE.Mesh>(null)
  const facePlugGeometry = useMemo(() => createWizardFacePlugGeometry(), [])

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const grumble = getWizardGrumbleMotion(t + 0.08, animation === 'grumble' ? motion : 0)
    const hopFace = getHopExpressionMotion(t, animation === 'hop' ? motion : 0)
    const grouchPulse = idlePulse(t, 4.9, 0.64, 0.09) * motion
    const breathe = Math.sin(t * 1.55) * 0.008 * motion

    if (face.current) {
      face.current.position.y =
        breathe - grouchPulse * 0.006 + grumble.chatter * 0.75 + grumble.bodyJolt * 0.16 + hopFace.eyeLift * 0.42 + hopFace.land * 0.012
      face.current.scale.set(
        1 + grouchPulse * 0.016 + grumble.mouthOpen * 0.022 + grumble.impact * 0.018 + hopFace.cheekSquash * 0.02,
        1 - grouchPulse * 0.018 - grumble.mouthOpen * 0.014 - grumble.impact * 0.014 - hopFace.cheekSquash * 0.016 + hopFace.airborne * 0.008,
        1,
      )
    }
    if (brow.current) {
      brow.current.position.y = 0.12 - grouchPulse * 0.012 - grumble.brow * 0.04 + hopFace.eyeWide * 0.018 - hopFace.faceFocus * 0.012
      brow.current.rotation.z =
        Math.sin(t * 1.1 + 0.2) * 0.006 * motion +
        Math.sin(t * 3.8) * 0.024 * grumble.talk +
        grumble.hit * 0.024 -
        hopFace.rotateZ * 0.22
      brow.current.scale.set(
        1 + grouchPulse * 0.06 + grumble.brow * 0.13 + hopFace.faceFocus * 0.06,
        1 + grouchPulse * 0.03 + grumble.hit * 0.07 + hopFace.land * 0.05,
        1,
      )
    }
    if (mouth.current) {
      mouth.current.position.y = -0.128 - grouchPulse * 0.01 - grumble.mouthOpen * 0.018 + grumble.hit * 0.006 + hopFace.mouthY
      mouth.current.rotation.z = -0.018 + Math.sin(t * 13.4) * 0.026 * grumble.talk - grumble.hit * 0.032 + hopFace.rotateZ * 0.35
      mouth.current.scale.set(
        1 + grouchPulse * 0.04 + grumble.mouthOpen * 0.46 + hopFace.smile * 0.2 + hopFace.faceFocus * 0.08,
        1 - grouchPulse * 0.04 + grumble.mouthOpen * 1.55 + grumble.hit * 0.2 + hopFace.mouthOpen * 0.88 - hopFace.faceFocus * 0.08,
        1,
      )
    }
    const eyeScaleY = Math.max(0.42, 1 + hopFace.eyeWide * 0.18 - hopFace.blink * 0.44 - hopFace.faceFocus * 0.06)
    const eyeScaleX = 1 + hopFace.eyeWide * 0.06 + hopFace.blink * 0.04
    if (leftEye.current) {
      leftEye.current.position.y = 0.014 + hopFace.eyeLift - hopFace.blink * 0.004
      leftEye.current.scale.set(eyeScaleX, eyeScaleY, 1)
    }
    if (rightEye.current) {
      rightEye.current.position.y = 0.014 + hopFace.eyeLift - hopFace.blink * 0.004
      rightEye.current.scale.set(eyeScaleX, eyeScaleY, 1)
    }
    if (leftPupil.current) {
      leftPupil.current.position.x = -0.003 - hopFace.pupilInward
      leftPupil.current.position.y = -0.008 + hopFace.pupilY
    }
    if (rightPupil.current) {
      rightPupil.current.position.x = -0.005 + hopFace.pupilInward
      rightPupil.current.position.y = -0.008 + hopFace.pupilY
    }
  })

  return (
    <group ref={face} position={[0, 0, WIZARD_FACE_SETBACK_Z]}>
      <mesh geometry={facePlugGeometry}>
        <meshToonMaterial color={FACE_RED} gradientMap={getVacuumHeadToonRampTexture()} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-0.134, 0.018, -0.742]} rotation-z={-0.25} scale={[0.102, 0.022, 0.01]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={FACE_RED_LIGHT} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      <mesh position={[0.116, -0.152, -0.746]} rotation-z={0.18} scale={[0.13, 0.036, 0.01]}>
        <sphereGeometry args={[1, 10, 4]} />
        <meshBasicMaterial color={FACE_RED_SHADE} transparent opacity={0.23} depthWrite={false} />
      </mesh>
      <mesh position={[0.246, -0.014, -0.738]} rotation-z={0.36} scale={[0.032, 0.128, 0.009]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={FACE_RED_SHADE} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh position={[-0.246, 0.016, -0.74]} rotation-z={-0.34} scale={[0.032, 0.114, 0.009]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={FACE_RED_LIGHT} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <group ref={brow} position={[0, 0.12, 0]}>
        <mesh position={[0, 0.002, -0.785]} rotation-z={0.01} scale={[0.276, 0.034, 0.01]}>
          <sphereGeometry args={[1, 10, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_DARK} transparent opacity={0.24} depthWrite={false} />
        </mesh>
        <CodedAssetOutlineMesh
          position={[0, 0.02, -0.764]}
          rotation-z={-0.006}
          scale={[0.232, 0.028, 0.013]}
          outlineWidth={0.0035}
          outlineColor={VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 12, 5]} />}
          material={<meshBasicMaterial color={WIZARD_BROW_DARK} />}
        />
        <CodedAssetOutlineMesh
          position={[-0.134, -0.002, -0.77]}
          rotation-z={-0.32}
          scale={[0.114, 0.032, 0.012]}
          outlineWidth={0.0035}
          outlineColor={VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 12, 5]} />}
          material={<meshBasicMaterial color={WIZARD_BROW_DARK} />}
        />
        <CodedAssetOutlineMesh
          position={[0.134, -0.002, -0.77]}
          rotation-z={0.32}
          scale={[0.114, 0.032, 0.012]}
          outlineWidth={0.0035}
          outlineColor={VAC_ASSET_INK}
          geometry={<sphereGeometry args={[1, 12, 5]} />}
          material={<meshBasicMaterial color={WIZARD_BROW_DARK} />}
        />
        <mesh position={[0, -0.002, -0.782]} rotation-z={0.02} scale={[0.052, 0.043, 0.011]}>
          <sphereGeometry args={[1, 10, 5]} />
          <meshBasicMaterial color={WIZARD_BROW_MID} />
        </mesh>
        <mesh position={[-0.172, 0.012, -0.786]} rotation-z={-0.38} scale={[0.042, 0.012, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_LIGHT} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[0.172, 0.012, -0.786]} rotation-z={0.38} scale={[0.042, 0.012, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_LIGHT} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[0.006, 0.028, -0.786]} rotation-z={-0.04} scale={[0.096, 0.009, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={WIZARD_BROW_LIGHT} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <group ref={leftEye} position={[-0.118, 0.014, 0]}>
        <CodedAssetOutlineMesh
          position={[0, 0, -0.754]}
          rotation-z={0.08}
          scale={[0.055, 0.076, 0.014]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 12, 8]} />}
          material={<meshBasicMaterial color={EYE_WHITE} />}
        />
        <mesh ref={leftPupil} position={[-0.003, -0.008, -0.778]} scale={[0.019, 0.032, 0.008]}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
      </group>
      <group ref={rightEye} position={[0.118, 0.014, 0]}>
        <CodedAssetOutlineMesh
          position={[0, 0, -0.754]}
          rotation-z={-0.08}
          scale={[0.055, 0.076, 0.014]}
          outlineWidth={0.004}
          geometry={<sphereGeometry args={[1, 12, 8]} />}
          material={<meshBasicMaterial color={EYE_WHITE} />}
        />
        <mesh ref={rightPupil} position={[-0.005, -0.008, -0.778]} scale={[0.019, 0.032, 0.008]}>
          <sphereGeometry args={[1, 8, 5]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
      </group>
      <group ref={mouth} position={[0, -0.128, 0]}>
        <mesh position={[0, 0, -0.778]} rotation-z={-0.018} scale={[0.11, 0.013, 0.011]}>
          <sphereGeometry args={[1, 12, 4]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
        <mesh position={[-0.07, -0.005, -0.784]} rotation-z={-0.38} scale={[0.03, 0.008, 0.007]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
        <mesh position={[0.07, -0.005, -0.784]} rotation-z={0.38} scale={[0.03, 0.008, 0.007]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_INK} />
        </mesh>
        <mesh position={[0.006, -0.028, -0.776]} rotation-z={-0.03} scale={[0.086, 0.011, 0.006]}>
          <sphereGeometry args={[1, 10, 4]} />
          <meshBasicMaterial color={FACE_RED_SHADE} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[0.012, 0.022, -0.786]} rotation-z={-0.14} scale={[0.034, 0.004, 0.004]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={FACE_RED_LIGHT} transparent opacity={0.24} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function createWizardStaffHookGeometry() {
  const shaftX = -0.855
  const outwardX = (x: number) => shaftX - (x - shaftX)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(outwardX(-0.855), 0.33, -0.245),
    new THREE.Vector3(outwardX(-0.854), 0.47, -0.246),
    new THREE.Vector3(outwardX(-0.785), 0.565, -0.25),
    new THREE.Vector3(outwardX(-0.665), 0.57, -0.252),
    new THREE.Vector3(outwardX(-0.57), 0.512, -0.252),
    new THREE.Vector3(outwardX(-0.552), 0.405, -0.25),
    new THREE.Vector3(outwardX(-0.588), 0.328, -0.248),
  ])

  return new THREE.TubeGeometry(curve, 42, 0.032, 9, false)
}

function WizardStaff({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const staff = useRef<THREE.Group>(null)
  const impactGroup = useRef<THREE.Group>(null)
  const hookGeometry = useMemo(() => createWizardStaffHookGeometry(), [])

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const grumble = getWizardGrumbleMotion(t, animation === 'grumble' ? motion : 0)
    const hop = getHopMotion(t, animation === 'hop' ? motion : 0)
    const handLag = Math.sin(t * 1.45 - 0.55) * 0.006 * motion
    const woodSpring = Math.sin(t * 0.84 + 1.2) * 0.008 * motion

    if (staff.current) {
      staff.current.position.y = handLag + grumble.staffLift - hop.airborne * 0.035 + hop.land * 0.026 + hop.recovery * 0.01
      staff.current.position.x = grumble.prep * -0.012 + grumble.hit * 0.01 - hop.rotateZ * 0.12
      staff.current.rotation.z = -0.025 + woodSpring + grumble.staffTilt - hop.rotateZ * 0.62 + hop.land * 0.045
      staff.current.rotation.x =
        Math.sin(t * 0.7 + 0.4) * 0.006 * motion - grumble.prep * 0.035 + grumble.hit * 0.05 + hop.launch * 0.035 - hop.land * 0.055
    }
    if (impactGroup.current) {
      impactGroup.current.visible = grumble.impact > 0.03
      impactGroup.current.position.y = -0.675 - grumble.hit * 0.012
      impactGroup.current.scale.set(0.72 + grumble.impact * 0.8, 0.58 + grumble.impact * 0.28, 0.9 + grumble.impact * 0.2)
      impactGroup.current.rotation.z = -0.12 + Math.sin(t * 22) * 0.02 * grumble.impact
    }
  })

  return (
    <>
      <group ref={staff}>
        <CodedAssetOutlineMesh
          position={[-0.855, -0.16, -0.245]}
          scale={[1, 1, 1]}
          outlineWidth={0.007}
          outlineColor={VAC_ASSET_INK}
          geometry={<cylinderGeometry args={[0.031, 0.035, 0.98, 9]} />}
          material={toon(STAFF_WOOD_MID)}
        />
        <CodedAssetOutlineMesh
          outlineWidth={0.007}
          outlineColor={VAC_ASSET_INK}
          geometry={<primitive object={hookGeometry} attach="geometry" />}
          material={toon(STAFF_WOOD_MID)}
        />
        <mesh position={[-0.884, -0.18, -0.285]} rotation-z={0.02} scale={[0.012, 0.38, 0.01]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_DARK} transparent opacity={0.32} depthWrite={false} />
        </mesh>
        <mesh position={[-0.828, 0.075, -0.29]} rotation-z={-0.02} scale={[0.01, 0.28, 0.008]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh position={[-1.002, 0.535, -0.294]} rotation-z={-1.44} scale={[0.012, 0.15, 0.008]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} transparent opacity={0.38} depthWrite={false} />
        </mesh>
        <mesh position={[-0.855, -0.638, -0.245]} scale={[0.048, 0.026, 0.048]}>
          <sphereGeometry args={[1, 9, 5]} />
          <meshBasicMaterial color={STAFF_WOOD_DARK} />
        </mesh>
        <mesh position={[-0.855, -0.075, -0.245]} scale={[0.046, 0.04, 0.046]}>
          <cylinderGeometry args={[1, 1, 1, 9]} />
          <meshBasicMaterial color={STAFF_WRAP_DARK} />
        </mesh>
        <mesh position={[-0.855, 0.0, -0.245]} scale={[0.042, 0.036, 0.042]}>
          <cylinderGeometry args={[1, 1, 1, 9]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} />
        </mesh>
        <mesh position={[-1.158, 0.392, -0.25]} scale={[0.04, 0.032, 0.04]}>
          <sphereGeometry args={[1, 9, 5]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} />
        </mesh>
      </group>
      <group ref={impactGroup} position={[-0.855, -0.675, -0.34]} visible={false}>
        <mesh rotation-x={Math.PI / 2} scale={[0.145, 0.04, 1]}>
          <circleGeometry args={[1, 18]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.24} depthWrite={false} />
        </mesh>
        <mesh position={[-0.075, 0.02, -0.006]} rotation-z={0.32} scale={[0.07, 0.009, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={GRASS_LIGHT} transparent opacity={0.58} depthWrite={false} />
        </mesh>
        <mesh position={[0.078, 0.016, -0.002]} rotation-z={-0.28} scale={[0.065, 0.009, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={GRASS_DEW} transparent opacity={0.5} depthWrite={false} />
        </mesh>
        <mesh position={[0.008, 0.026, -0.012]} rotation-z={-0.04} scale={[0.052, 0.007, 0.005]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={STAFF_WOOD_LIGHT} transparent opacity={0.36} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

function WizardHand({
  side,
  activity = 1,
  animation = 'idle',
}: {
  side: -1 | 1
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const hand = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const grumble = getWizardGrumbleMotion(t + (side === -1 ? 0 : 0.08), animation === 'grumble' ? motion : 0)
    const hop = getHopMotion(t + (side === -1 ? 0.015 : -0.01), animation === 'hop' ? motion : 0)
    const lag = Math.sin(t * 1.45 + side * 0.55) * 0.01 * motion + idlePulse(t + side * 0.2, 6.4, 0.72, 0.06) * 0.008 * motion
    const staffGrip = side === -1 ? 1 : 0.28
    const gripY = side === -1 ? grumble.staffLift * 0.55 - grumble.hit * 0.012 : grumble.chatter * 0.28 - grumble.impact * 0.006
    const gripX = side === -1 ? -grumble.prep * 0.012 + grumble.hit * 0.01 : grumble.chatter * side * 0.16

    if (hand.current) {
      hand.current.position.x = gripX + hop.rotateZ * side * 0.08
      hand.current.position.y = lag + gripY - hop.airborne * 0.012 + hop.land * 0.018
      hand.current.rotation.z =
        side * (0.04 + lag * 0.55) + grumble.staffTilt * 0.45 * staffGrip - grumble.hit * 0.03 * side + hop.rotateZ * 0.72
      hand.current.scale.set(
        1 + Math.abs(lag) * 0.45 + grumble.impact * 0.028 * staffGrip + hop.land * 0.04,
        1 - Math.abs(lag) * 0.28 - grumble.impact * 0.02 * staffGrip - hop.land * 0.03 + hop.airborne * 0.015,
        1,
      )
    }
  })

  return (
    <group ref={hand}>
      <mesh position={[side * 0.63, -0.12, -0.12]} rotation-z={side * 0.18} scale={[0.1, 0.135, 0.035]}>
        <sphereGeometry args={[1, 10, 5]} />
        <meshBasicMaterial color={VAC_ASSET_INK} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <CodedAssetOutlineMesh
        position={[side * 0.785, -0.12, -0.1]}
        rotation-z={side * 0.1}
        scale={[0.175, 0.158, 0.15]}
        outlineWidth={0.014}
        geometry={<sphereGeometry args={[1, 14, 9]} />}
        material={toon(KNOB_RED)}
      />
      <mesh position={[side * 0.748, -0.064, -0.242]} rotation-z={side * -0.22} scale={[0.085, 0.026, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={FACE_RED_LIGHT} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh position={[side * 0.82, -0.19, -0.244]} rotation-z={side * 0.22} scale={[0.104, 0.026, 0.012]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={FACE_RED_SHADE} transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  )
}

function WizardHands({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  return (
    <>
      <WizardHand side={-1} activity={activity} animation={animation} />
      <WizardHand side={1} activity={activity} animation={animation} />
    </>
  )
}

function WizardCloak({
  activity = 1,
  animation = 'idle',
}: {
  activity?: number
  animation?: RedShellCritterAnimation
}) {
  const cloakGeometry = useMemo(() => createWizardCloakGeometry(), [])

  return (
    <group>
      <CodedAssetOutlineMesh
        position={[0, -0.045, -0.02]}
        scale={[0.8, 0.84, 0.74]}
        outlineWidth={0.048}
        outlineColor={VAC_ASSET_INK}
        geometry={<primitive object={cloakGeometry} attach="geometry" />}
        material={toon(CLOAK_DARK)}
      />
      <WizardCloakTexture />
      <mesh position={[0.03, 0.52, -0.44]} rotation-z={-0.08} scale={[0.18, 0.026, 0.022]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={CLOAK_BLACK} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0.18, 0.38, -0.51]} rotation-z={0.22} scale={[0.14, 0.024, 0.02]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshBasicMaterial color={CLOAK_BLACK} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <WizardHoodOpening activity={activity} animation={animation} />
    </group>
  )
}

export function GlowbudWizardCritterAsset({
  animation = 'idle',
  scale = 1,
  activity = 1,
  position = [0, 0, 0],
}: GlowbudWizardCritterAssetProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const canHop = animation === 'hop'
    const hop = getHopMotion(t, canHop ? motion : 0)
    const grumble = getWizardGrumbleMotion(t, animation === 'grumble' ? motion : 0)
    const breathe = Math.sin(t * 1.28 + 0.6) * 0.012 * motion
    const cloakWeight = Math.sin(t * 0.76 + 1.1) * 0.014 * motion
    const idleJiggle = Math.sin(t * 7.8 + 1.1) * 0.004 * motion + Math.sin(t * 12.6) * 0.0025 * motion

    if (root.current) {
      root.current.position.set(position[0], position[1], position[2])
      root.current.scale.setScalar(scale)
    }
    if (body.current) {
      body.current.position.x = idleJiggle * 0.4 + hop.x * 0.6 + grumble.bodyLean * 0.5 + grumble.chatter * 0.24
      body.current.position.y = breathe + cloakWeight * 0.4 + hop.height + grumble.bodyJolt
      body.current.rotation.z = cloakWeight * 0.55 + hop.rotateZ * 0.8 + grumble.bodyLean + grumble.hit * 0.022 - grumble.rebound * 0.012
      body.current.rotation.x = Math.sin(t * 0.9) * 0.006 * motion + hop.rotateX * 0.85 - grumble.prep * 0.012 + grumble.hit * 0.038 - grumble.rebound * 0.018
      body.current.scale.set(
        (1 + breathe * 0.22 + Math.abs(idleJiggle) * 0.18 + grumble.impact * 0.035 + grumble.mouthOpen * 0.006) * hop.scaleX,
        (1 - breathe * 0.16 - Math.abs(idleJiggle) * 0.08 - grumble.impact * 0.042 + grumble.rebound * 0.016) * hop.scaleY,
        (1 + breathe * 0.04 + grumble.impact * 0.02) * hop.scaleZ,
      )
    }
    if (shadow.current) {
      const shadowScale = Math.max(0.62, hop.shadowScale)
      shadow.current.scale.set(0.58 * shadowScale, 0.064 * (1 + hop.land * 0.16 - hop.airborne * 0.18), 0.03 * shadowScale)
      shadow.current.position.y = -0.58 - hop.land * 0.012
      const material = shadow.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = Math.min(0.3, Math.max(0.08, hop.shadowOpacity))
      }
    }
  })

  return (
    <group ref={root} position={position} scale={scale} frustumCulled={false}>
      <GrassySeat activity={activity} animation={animation} />
      <HopMotionPolish activity={activity} animation={animation} />
      <group ref={body}>
        <WizardStaff activity={activity} animation={animation} />
        <WizardHands activity={activity} animation={animation} />
        <WizardCloak activity={activity} animation={animation} />
        <WizardFace activity={activity} animation={animation} />
      </group>
      <mesh ref={shadow} position={[0, -0.58, -0.05]} scale={[0.58, 0.064, 0.03]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#3c334a" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}

function HopMotionPolish({
  animation = 'idle',
  activity = 1,
}: {
  animation?: RedShellCritterAnimation
  activity?: number
}) {
  const impactGroup = useRef<THREE.Group>(null)
  const airGroup = useRef<THREE.Group>(null)
  const leftArc = useRef<THREE.Mesh>(null)
  const rightArc = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const motion = clampIdleActivity(activity)
    const hop = getHopMotion(t, animation === 'hop' ? motion : 0)
    const impact = Math.max(hop.land, hop.prep * 0.34)
    const airborne = hop.airborne

    if (impactGroup.current) {
      impactGroup.current.visible = impact > 0.012
      impactGroup.current.position.y = -0.662 - hop.land * 0.012
      impactGroup.current.scale.set(0.82 + impact * 0.72, 0.58 + impact * 0.26, 1)
      impactGroup.current.rotation.z = Math.sin(t * 8.2) * 0.015 * impact
    }
    if (airGroup.current) {
      airGroup.current.visible = airborne > 0.05
      airGroup.current.position.y = -0.04 + hop.height * 0.34
      airGroup.current.scale.set(0.92 + airborne * 0.12, 0.92 + airborne * 0.18, 1)
      airGroup.current.rotation.z = hop.rotateZ * 0.8
    }
    if (leftArc.current) {
      leftArc.current.visible = airborne > 0.14
      leftArc.current.position.y = 0.13 + hop.height * 0.12
      leftArc.current.rotation.z = -0.42 - airborne * 0.12
      leftArc.current.scale.set(0.018, 0.18 + airborne * 0.07, 0.006)
    }
    if (rightArc.current) {
      rightArc.current.visible = airborne > 0.14
      rightArc.current.position.y = 0.11 + hop.height * 0.1
      rightArc.current.rotation.z = 0.42 + airborne * 0.12
      rightArc.current.scale.set(0.018, 0.17 + airborne * 0.065, 0.006)
    }
  })

  return (
    <group visible={animation === 'hop'}>
      <group ref={impactGroup} visible={false}>
        <mesh position={[-0.5, 0, -0.45]} rotation-z={0.12} scale={[0.26, 0.03, 0.05]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={GRASS_LIGHT} transparent opacity={0.46} depthWrite={false} />
        </mesh>
        <mesh position={[0.46, -0.006, -0.44]} rotation-z={-0.14} scale={[0.24, 0.028, 0.05]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={GRASS_LIGHT} transparent opacity={0.44} depthWrite={false} />
        </mesh>
        <mesh position={[-0.18, 0.014, -0.56]} rotation-z={-0.06} scale={[0.18, 0.02, 0.036]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color="#d5ffb0" transparent opacity={0.38} depthWrite={false} />
        </mesh>
        <mesh position={[0.16, 0.014, -0.56]} rotation-z={0.08} scale={[0.18, 0.02, 0.036]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color="#d5ffb0" transparent opacity={0.34} depthWrite={false} />
        </mesh>
      </group>
      <group ref={airGroup} visible={false}>
        <mesh ref={leftArc} position={[-0.98, 0.13, -0.22]} rotation-z={-0.42} scale={[0.018, 0.18, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh ref={rightArc} position={[0.98, 0.11, -0.22]} rotation-z={0.42} scale={[0.018, 0.17, 0.006]}>
          <sphereGeometry args={[1, 8, 4]} />
          <meshBasicMaterial color={VAC_ASSET_DETAIL_INK} transparent opacity={0.24} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

export function RedShellIdleCritterAsset({
  mode = 'dressed',
  animation = 'idle',
  scale = 1,
  activity = 1,
  position = [0, 0, 0],
}: RedShellIdleCritterAssetProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const motion = clampIdleActivity(activity)
    const t = clock.elapsedTime
    const canHop = animation === 'hop' && mode !== 'shell'
    const hop = getHopMotion(t, canHop ? motion : 0)
    const breathe = Math.sin(t * 1.42) * 0.014 * motion
    const softSecondaryBreath = Math.sin(t * 2.84 + 0.5) * 0.005 * motion
    const idleJiggle = Math.sin(t * 8.4 + 0.3) * 0.006 * motion + Math.sin(t * 13.7 + 1.2) * 0.0035 * motion
    const settle = Math.pow(Math.max(0, Math.sin(t * 0.72 - 0.45)), 5) * 0.014 * motion
    const happySnug = idlePulse(t, 6.2, 0.71, 0.06) * motion
    const sway = Math.sin(t * 1.02 + 0.4) * 0.022 * motion + Math.sin(t * 2.05) * 0.006 * motion
    const happyTremble = Math.sin(t * 18.5) * 0.006 * happySnug + idleJiggle * 0.7

    if (root.current) {
      root.current.position.set(position[0], position[1], position[2])
      root.current.scale.setScalar(scale)
    }
    if (body.current) {
      body.current.position.x = idleJiggle * 0.55 + hop.x
      body.current.position.y = breathe + softSecondaryBreath + idleJiggle * 0.35 + settle * 0.28 - happySnug * 0.008 + hop.height
      body.current.rotation.z = sway + happyTremble + hop.rotateZ
      body.current.rotation.x = Math.sin(t * 1.08 + 0.8) * 0.009 * motion - happySnug * 0.009 + idleJiggle * 0.28 + hop.rotateX
      body.current.rotation.y = Math.sin(t * 0.74 + 0.2) * 0.01 * motion + Math.sin(t * 1.38 + 1.1) * 0.004 * motion + hop.rotateZ * 0.08
      body.current.scale.set(
        (1 + breathe * 0.24 + settle * 0.95 + happySnug * 0.03 + Math.abs(idleJiggle) * 0.26) * hop.scaleX,
        (1 - breathe * 0.18 - settle * 0.45 - happySnug * 0.018 - Math.abs(idleJiggle) * 0.12) * hop.scaleY,
        (1 + breathe * 0.07 + happySnug * 0.01) * hop.scaleZ,
      )
    }
    if (shadow.current) {
      const shadowScale = Math.max(0.58, hop.shadowScale)
      shadow.current.scale.set(0.55 * shadowScale, 0.06 * (1 + hop.land * 0.18 - hop.airborne * 0.2), 0.03 * shadowScale)
      shadow.current.position.y = -0.55 - hop.land * 0.012
      const material = shadow.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = Math.min(0.3, Math.max(0.08, hop.shadowOpacity))
      }
    }
  })

  return (
    <group ref={root} position={position} scale={scale} frustumCulled={false}>
      {mode === 'dressed' ? <GrassySeat activity={activity} animation={animation} /> : null}
      {mode === 'dressed' ? <HopMotionPolish activity={activity} animation={animation} /> : null}
      <group ref={body}>
        {mode === 'character' ? <RedCharacter activity={activity} animation={animation} /> : null}
        {mode === 'shell' ? <SeedShell empty /> : null}
        {mode === 'dressed' ? (
          <>
            <SeedShell fitted />
            <RedCharacter fitted activity={activity} animation={animation} />
            <ShellOpeningOcclusionLip />
            <ShellRearOcclusionPolish />
            <HeadHibiscusPotAccessory activity={activity} />
          </>
        ) : null}
      </group>
      <mesh ref={shadow} position={[0, -0.55, -0.05]} scale={[0.55, 0.06, 0.03]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#7b68be" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}
