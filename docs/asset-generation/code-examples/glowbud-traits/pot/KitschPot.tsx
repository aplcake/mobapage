import { useMemo, type Ref } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const INK = '#251326'
const PURPLE_DEEP = '#57258f'
const PURPLE_MID = '#9839c7'
const PURPLE_HOT = '#cf4fdf'
const PURPLE_LIGHT = '#e482ef'
const SOIL_DEEP = '#2b1b18'
const SOIL_MID = '#4a2d20'
const SOIL_LIGHT = '#68412b'
const SOIL_DUST = '#8a6041'

const BODY_WIDTH = 0.62
const BODY_DEPTH = 0.56
const BODY_HEIGHT = 0.56
const BODY_CENTER_Y = -0.11
const BOTTOM_TAPER = 0.88
const TOP_TAPER = 1.06
const STRIPE_COUNT = 6

type Face = 'front' | 'right' | 'back' | 'left'

let kitschToonRamp: THREE.DataTexture | null = null

function getKitschToonRamp() {
  if (kitschToonRamp) return kitschToonRamp

  const colors = new Uint8Array([
    87, 37, 143, 255,
    164, 58, 200, 255,
    232, 130, 239, 255,
  ])
  const texture = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  kitschToonRamp = texture
  return texture
}

function createTaperedBodyGeometry() {
  const geometry = new RoundedBoxGeometry(BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH, 4, 0.055)
  const positions = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < positions.count; index += 1) {
    const y = positions.getY(index)
    const heightT = THREE.MathUtils.clamp(y / BODY_HEIGHT + 0.5, 0, 1)
    const softBelly = Math.sin(heightT * Math.PI) * 0.018
    const taper = THREE.MathUtils.lerp(BOTTOM_TAPER, TOP_TAPER, heightT) + softBelly
    positions.setX(index, positions.getX(index) * taper)
    positions.setZ(index, positions.getZ(index) * taper)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function roundedSquarePoints(halfSize: number, radius: number, cornerSegments = 5) {
  const points: THREE.Vector2[] = []
  const corners = [
    { x: halfSize - radius, y: halfSize - radius, start: 0 },
    { x: -halfSize + radius, y: halfSize - radius, start: Math.PI / 2 },
    { x: -halfSize + radius, y: -halfSize + radius, start: Math.PI },
    { x: halfSize - radius, y: -halfSize + radius, start: Math.PI * 1.5 },
  ]

  corners.forEach((corner) => {
    for (let step = 0; step < cornerSegments; step += 1) {
      const angle = corner.start + (step / cornerSegments) * (Math.PI / 2)
      points.push(new THREE.Vector2(
        corner.x + Math.cos(angle) * radius,
        corner.y + Math.sin(angle) * radius,
      ))
    }
  })

  return points
}

function createRoundedSquareRingGeometry({
  outerHalf = 0.365,
  innerHalf = 0.275,
  height = 0.09,
  outerRadius = 0.072,
  innerRadius = 0.05,
}: {
  outerHalf?: number
  innerHalf?: number
  height?: number
  outerRadius?: number
  innerRadius?: number
} = {}) {
  const outer = roundedSquarePoints(outerHalf, outerRadius)
  const inner = roundedSquarePoints(innerHalf, innerRadius)
  const topY = height * 0.5
  const bottomY = -height * 0.5
  const positions: number[] = []
  const indices: number[] = []

  function addQuad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) {
    const offset = positions.length / 3
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray())
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3)
  }

  for (let index = 0; index < outer.length; index += 1) {
    const next = (index + 1) % outer.length
    const outerCurrent = outer[index]
    const outerNext = outer[next]
    const innerCurrent = inner[index]
    const innerNext = inner[next]

    addQuad(
      new THREE.Vector3(outerCurrent.x, topY, outerCurrent.y),
      new THREE.Vector3(innerCurrent.x, topY, innerCurrent.y),
      new THREE.Vector3(innerNext.x, topY, innerNext.y),
      new THREE.Vector3(outerNext.x, topY, outerNext.y),
    )
    addQuad(
      new THREE.Vector3(outerCurrent.x, bottomY, outerCurrent.y),
      new THREE.Vector3(outerNext.x, bottomY, outerNext.y),
      new THREE.Vector3(outerNext.x, topY, outerNext.y),
      new THREE.Vector3(outerCurrent.x, topY, outerCurrent.y),
    )
    addQuad(
      new THREE.Vector3(innerCurrent.x, bottomY, innerCurrent.y),
      new THREE.Vector3(innerCurrent.x, topY, innerCurrent.y),
      new THREE.Vector3(innerNext.x, topY, innerNext.y),
      new THREE.Vector3(innerNext.x, bottomY, innerNext.y),
    )
    addQuad(
      new THREE.Vector3(outerCurrent.x, bottomY, outerCurrent.y),
      new THREE.Vector3(innerCurrent.x, bottomY, innerCurrent.y),
      new THREE.Vector3(innerNext.x, bottomY, innerNext.y),
      new THREE.Vector3(outerNext.x, bottomY, outerNext.y),
    )
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function taperAt(localY: number) {
  const heightT = THREE.MathUtils.clamp(localY / BODY_HEIGHT + 0.5, 0, 1)
  return THREE.MathUtils.lerp(BOTTOM_TAPER, TOP_TAPER, heightT) + Math.sin(heightT * Math.PI) * 0.018
}

function createStripeGeometry(face: Face, stripeIndex: number) {
  const bottomY = -BODY_HEIGHT * 0.5 + 0.045
  const topY = BODY_HEIGHT * 0.5 - 0.035
  const bottomTaper = taperAt(bottomY)
  const topTaper = taperAt(topY)
  const cornerInset = 0.038
  const bottomHalfX = BODY_WIDTH * 0.5 * bottomTaper - cornerInset
  const topHalfX = BODY_WIDTH * 0.5 * topTaper - cornerInset
  const bottomHalfZ = BODY_DEPTH * 0.5 * bottomTaper - cornerInset
  const topHalfZ = BODY_DEPTH * 0.5 * topTaper - cornerInset
  const startT = stripeIndex / STRIPE_COUNT
  const endT = (stripeIndex + 1) / STRIPE_COUNT
  const bottomX0 = THREE.MathUtils.lerp(-bottomHalfX, bottomHalfX, startT)
  const bottomX1 = THREE.MathUtils.lerp(-bottomHalfX, bottomHalfX, endT)
  const topX0 = THREE.MathUtils.lerp(-topHalfX, topHalfX, startT)
  const topX1 = THREE.MathUtils.lerp(-topHalfX, topHalfX, endT)
  const bottomZ0 = THREE.MathUtils.lerp(-bottomHalfZ, bottomHalfZ, startT)
  const bottomZ1 = THREE.MathUtils.lerp(-bottomHalfZ, bottomHalfZ, endT)
  const topZ0 = THREE.MathUtils.lerp(-topHalfZ, topHalfZ, startT)
  const topZ1 = THREE.MathUtils.lerp(-topHalfZ, topHalfZ, endT)
  const frontBottom = -(BODY_DEPTH * 0.5 * bottomTaper + 0.003)
  const frontTop = -(BODY_DEPTH * 0.5 * topTaper + 0.003)
  const backBottom = -frontBottom
  const backTop = -frontTop
  const rightBottom = BODY_WIDTH * 0.5 * bottomTaper + 0.003
  const rightTop = BODY_WIDTH * 0.5 * topTaper + 0.003
  const leftBottom = -rightBottom
  const leftTop = -rightTop
  let points: THREE.Vector3[]

  if (face === 'front') {
    points = [
      new THREE.Vector3(bottomX0, bottomY, frontBottom),
      new THREE.Vector3(bottomX1, bottomY, frontBottom),
      new THREE.Vector3(topX1, topY, frontTop),
      new THREE.Vector3(topX0, topY, frontTop),
    ]
  } else if (face === 'back') {
    points = [
      new THREE.Vector3(-bottomX0, bottomY, backBottom),
      new THREE.Vector3(-bottomX1, bottomY, backBottom),
      new THREE.Vector3(-topX1, topY, backTop),
      new THREE.Vector3(-topX0, topY, backTop),
    ]
  } else if (face === 'right') {
    points = [
      new THREE.Vector3(rightBottom, bottomY, bottomZ0),
      new THREE.Vector3(rightBottom, bottomY, bottomZ1),
      new THREE.Vector3(rightTop, topY, topZ1),
      new THREE.Vector3(rightTop, topY, topZ0),
    ]
  } else {
    points = [
      new THREE.Vector3(leftBottom, bottomY, -bottomZ0),
      new THREE.Vector3(leftBottom, bottomY, -bottomZ1),
      new THREE.Vector3(leftTop, topY, -topZ1),
      new THREE.Vector3(leftTop, topY, -topZ0),
    ]
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap((point) => point.toArray()), 3))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  return geometry
}

function KitschOutlinedMesh({
  geometry,
  color,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  outlineWidth = 0.018,
}: {
  geometry: THREE.BufferGeometry
  color: string
  position?: [number, number, number]
  scale?: [number, number, number]
  outlineWidth?: number
}) {
  const outlineScale = scale.map((value) => value + outlineWidth) as [number, number, number]

  return (
    <group position={position}>
      <mesh geometry={geometry} scale={outlineScale}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={geometry} scale={scale}>
        <meshToonMaterial color={color} gradientMap={getKitschToonRamp()} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const soilMounds: Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}> = [
  { position: [-0.145, 0.228, -0.09], rotation: [0, 0.32, -0.05], scale: [0.15, 0.032, 0.085], color: SOIL_LIGHT },
  { position: [0.135, 0.226, -0.076], rotation: [0, -0.24, 0.04], scale: [0.14, 0.03, 0.082], color: SOIL_MID },
  { position: [-0.12, 0.227, 0.088], rotation: [0, -0.18, 0.03], scale: [0.13, 0.027, 0.075], color: SOIL_MID },
  { position: [0.115, 0.228, 0.084], rotation: [0, 0.2, -0.04], scale: [0.135, 0.03, 0.078], color: SOIL_DUST },
  { position: [0.002, 0.233, 0.002], rotation: [0, 0.1, 0.02], scale: [0.175, 0.036, 0.115], color: SOIL_DEEP },
]

export function KitschPotShell({ groupRef }: { groupRef: Ref<THREE.Group> }) {
  const bodyGeometry = useMemo(() => createTaperedBodyGeometry(), [])
  const rimGeometry = useMemo(() => createRoundedSquareRingGeometry(), [])
  const rimOutlineGeometry = useMemo(() => createRoundedSquareRingGeometry({
    outerHalf: 0.374,
    innerHalf: 0.266,
    height: 0.016,
    outerRadius: 0.076,
    innerRadius: 0.046,
  }), [])
  const rimTopGeometry = useMemo(() => createRoundedSquareRingGeometry({
    outerHalf: 0.358,
    innerHalf: 0.282,
    height: 0.018,
    outerRadius: 0.068,
    innerRadius: 0.052,
  }), [])
  const baseGeometry = useMemo(() => new RoundedBoxGeometry(0.57, 0.09, 0.52, 4, 0.04), [])
  const cavityGeometry = useMemo(() => new RoundedBoxGeometry(0.56, 0.105, 0.52, 4, 0.052), [])
  const soilGeometry = useMemo(() => new RoundedBoxGeometry(0.525, 0.07, 0.485, 4, 0.048), [])
  const stripeGeometries = useMemo(
    () => (['front', 'right', 'back', 'left'] as Face[]).flatMap((face) =>
      Array.from({ length: STRIPE_COUNT }, (_, index) => ({
        key: `${face}-${index}`,
        face,
        index,
        geometry: createStripeGeometry(face, index),
      }))),
    [],
  )

  return (
    <group ref={groupRef}>
      <KitschOutlinedMesh
        geometry={bodyGeometry}
        color={PURPLE_DEEP}
        position={[0, BODY_CENTER_Y, 0]}
        outlineWidth={0.022}
      />
      {stripeGeometries.map((stripe) => (
        <mesh
          key={`kitsch-painted-stripe-${stripe.key}`}
          geometry={stripe.geometry}
          position={[0, BODY_CENTER_Y, 0]}
          renderOrder={2}
        >
          <meshToonMaterial
            color={stripe.index % 2 === 0 ? PURPLE_MID : PURPLE_HOT}
            gradientMap={getKitschToonRamp()}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
      <KitschOutlinedMesh
        geometry={baseGeometry}
        color={PURPLE_DEEP}
        position={[0, -0.405, 0.006]}
        outlineWidth={0.012}
      />
      <mesh geometry={rimGeometry} position={[0, 0.205, 0]}>
        <meshToonMaterial color={PURPLE_MID} gradientMap={getKitschToonRamp()} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rimOutlineGeometry} position={[0, 0.252, 0]}>
        <meshBasicMaterial color={INK} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rimTopGeometry} position={[0, 0.257, 0]}>
        <meshToonMaterial color={PURPLE_LIGHT} gradientMap={getKitschToonRamp()} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={cavityGeometry} position={[0, 0.177, 0]}>
        <meshBasicMaterial color={SOIL_DEEP} />
      </mesh>
      <mesh geometry={soilGeometry} position={[0, 0.205, 0]}>
        <meshToonMaterial color={SOIL_MID} gradientMap={getKitschToonRamp()} />
      </mesh>
      {soilMounds.map((mound, index) => (
        <mesh
          key={`kitsch-soil-mound-${index}`}
          position={mound.position}
          rotation={mound.rotation}
          scale={mound.scale}
        >
          <sphereGeometry args={[1, 10, 6]} />
          <meshToonMaterial color={mound.color} gradientMap={getKitschToonRamp()} />
        </mesh>
      ))}
    </group>
  )
}
