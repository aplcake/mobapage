import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const ROBOT_INK = '#151b2b'
export const ROBOT_CHASSIS_DEEP = '#2b3348'
export const ROBOT_CHASSIS_SHADOW = '#3c4761'
export const ROBOT_CHASSIS_BASE = '#56647f'
export const ROBOT_CHASSIS_MID = '#74829c'
export const ROBOT_SILVER_SHADOW = '#8894a8'
export const ROBOT_SILVER = '#b9c1ce'
export const ROBOT_SILVER_LIGHT = '#e0e4e9'
export const ROBOT_CYAN = '#49d4e6'
export const ROBOT_AMBER = '#f0ad43'
export const ROBOT_SHADOW = '#53617d'

type RobotShellProps = {
  fitted?: boolean
  hasHeadAccessory?: boolean
  activity?: number
  animation?: 'idle' | 'hop' | 'grumble'
}

type PanelProps = {
  name: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  color: string
  geometry: THREE.BufferGeometry
  outlineWidth?: number
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function hash3(x: number, y: number, z: number) {
  return Math.abs(Math.sin(x * 67.1 + y * 113.7 + z * 47.9) * 43758.5453) % 1
}

function superellipsePoint(angle: number, xRadius: number, yRadius: number) {
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  return new THREE.Vector2(
    Math.sign(cosAngle || 1) * Math.pow(Math.abs(cosAngle), 0.42) * xRadius,
    Math.sign(sinAngle || 1) * Math.pow(Math.abs(sinAngle), 0.48) * yRadius,
  )
}

function createRobotHullGeometry() {
  const indexed = new THREE.SphereGeometry(1, 44, 30)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const sourceX = position.getX(index)
    const sourceY = position.getY(index)
    const sourceZ = position.getZ(index)
    const crownTaper = smoothstep01((sourceY - 0.2) / 0.72)
    const lowerTaper = smoothstep01((-sourceY - 0.34) / 0.52)
    const shoulder = Math.exp(-((sourceY - 0.04) ** 2) / 0.22)
    const facet = 1
      + Math.sin(Math.atan2(sourceZ, sourceX) * 8 + sourceY * 3.5) * 0.0045
      + Math.cos(sourceY * 13 - sourceZ * 4.2) * 0.0035

    let x = Math.sign(sourceX || 1) * Math.pow(Math.abs(sourceX), 0.76) * 0.82
    let y = Math.sign(sourceY || 1) * Math.pow(Math.abs(sourceY), 0.8) * 0.66
    let z = Math.sign(sourceZ || 1) * Math.pow(Math.abs(sourceZ), 0.82) * 0.67

    x *= facet * (1 + shoulder * 0.025 - crownTaper * 0.055 - lowerTaper * 0.035)
    y *= facet
    z *= facet * (1 + lowerTaper * 0.018)
    y -= 0.006

    if (y > 0.585) y = THREE.MathUtils.lerp(y, 0.625, smoothstep01((y - 0.585) / 0.08) * 0.56)
    if (y < -0.54) y = THREE.MathUtils.lerp(y, -0.6, smoothstep01((-y - 0.54) / 0.1) * 0.62)
    position.setXYZ(index, x, y, z)
  }

  position.needsUpdate = true
  indexed.computeVertexNormals()
  const source = indexed.toNonIndexed()
  indexed.dispose()

  const sourcePosition = source.attributes.position as THREE.BufferAttribute
  const sourceNormal = source.attributes.normal as THREE.BufferAttribute
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const color = new THREE.Color()
  const deep = new THREE.Color(ROBOT_CHASSIS_DEEP)
  const shadow = new THREE.Color(ROBOT_CHASSIS_SHADOW)
  const base = new THREE.Color(ROBOT_CHASSIS_BASE)
  const mid = new THREE.Color(ROBOT_CHASSIS_MID)
  const silver = new THREE.Color(ROBOT_SILVER_SHADOW)

  for (let index = 0; index < sourcePosition.count; index += 3) {
    const centerX = (sourcePosition.getX(index) + sourcePosition.getX(index + 1) + sourcePosition.getX(index + 2)) / 3
    const centerY = (sourcePosition.getY(index) + sourcePosition.getY(index + 1) + sourcePosition.getY(index + 2)) / 3
    const centerZ = (sourcePosition.getZ(index) + sourcePosition.getZ(index + 1) + sourcePosition.getZ(index + 2)) / 3
    const aperture = Math.pow(Math.abs(centerX / 0.475), 4.2)
      + Math.pow(Math.abs((centerY + 0.018) / 0.342), 4.2)

    if (centerZ < -0.47 && aperture < 1.035) continue

    const normalX = (sourceNormal.getX(index) + sourceNormal.getX(index + 1) + sourceNormal.getX(index + 2)) / 3
    const normalY = (sourceNormal.getY(index) + sourceNormal.getY(index + 1) + sourceNormal.getY(index + 2)) / 3
    const angle = Math.atan2(centerZ, centerX)
    const panelBand = Math.sin(angle * 6 + centerY * 3.1)
    const random = hash3(centerX, centerY, centerZ)

    color.copy(base)
    if (normalY > 0.52) color.lerp(silver, 0.25)
    if (normalX < -0.36) color.lerp(shadow, 0.22)
    if (panelBand > 0.62) color.lerp(mid, 0.18)
    if (panelBand < -0.7) color.lerp(deep, 0.2)
    if (random > 0.84) color.lerp(mid, 0.1)
    if (centerY < -0.48) color.lerp(deep, 0.22)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      positions.push(
        sourcePosition.getX(index + vertex),
        sourcePosition.getY(index + vertex),
        sourcePosition.getZ(index + vertex),
      )
      normals.push(
        sourceNormal.getX(index + vertex),
        sourceNormal.getY(index + vertex),
        sourceNormal.getZ(index + vertex),
      )
      colors.push(color.r, color.g, color.b)
    }
  }

  source.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRobotOpeningTunnelGeometry() {
  const segments = 72
  const rings = 6
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const ease = smoothstep01(t)
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const side = Math.abs(Math.cos(angle))
      const lower = Math.max(0, -Math.sin(angle))
      const point = superellipsePoint(
        angle,
        THREE.MathUtils.lerp(0.405, 0.512 + side * 0.01, ease),
        THREE.MathUtils.lerp(0.292, 0.392 + lower * 0.012, ease),
      )
      vertices.push(
        point.x,
        -0.018 + point.y,
        THREE.MathUtils.lerp(-0.79, -0.49 + side * 0.018, ease),
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
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRobotFaceFrameGeometry() {
  const segments = 72
  const vertices: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const innerX = 0.405
  const innerY = 0.292
  const outerX = 0.565
  const outerY = 0.415
  const frontZ = -0.795
  const rearZ = -0.715
  const silver = new THREE.Color(ROBOT_SILVER)
  const light = new THREE.Color(ROBOT_SILVER_LIGHT)
  const shadow = new THREE.Color(ROBOT_SILVER_SHADOW)
  const chassis = new THREE.Color(ROBOT_CHASSIS_MID)
  const color = new THREE.Color()

  for (let layer = 0; layer < 2; layer += 1) {
    for (let ring = 0; ring < 2; ring += 1) {
      for (let segment = 0; segment <= segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2
        const point = superellipsePoint(angle, ring === 0 ? innerX : outerX, ring === 0 ? innerY : outerY)
        const vertical = Math.sin(angle)
        const horizontal = Math.abs(Math.cos(angle))
        color.copy(silver)
        if (vertical > 0.22) color.lerp(light, 0.48)
        if (vertical < -0.25) color.lerp(shadow, 0.35)
        if (horizontal > 0.74) color.lerp(chassis, 0.28)
        vertices.push(point.x, -0.018 + point.y, layer === 0 ? frontZ : rearZ)
        colors.push(color.r, color.g, color.b)
      }
    }
  }

  const row = segments + 1
  const vertexIndex = (layer: number, ring: number, segment: number) => layer * row * 2 + ring * row + segment

  for (let segment = 0; segment < segments; segment += 1) {
    const frontInner = vertexIndex(0, 0, segment)
    const frontOuter = vertexIndex(0, 1, segment)
    const rearInner = vertexIndex(1, 0, segment)
    const rearOuter = vertexIndex(1, 1, segment)

    indices.push(frontOuter, frontInner + 1, frontInner)
    indices.push(frontOuter, frontOuter + 1, frontInner + 1)
    indices.push(rearOuter, rearInner, rearInner + 1)
    indices.push(rearOuter, rearInner + 1, rearOuter + 1)
    indices.push(frontOuter, rearOuter, frontOuter + 1)
    indices.push(frontOuter + 1, rearOuter, rearOuter + 1)
    indices.push(frontInner, frontInner + 1, rearInner)
    indices.push(frontInner + 1, rearInner + 1, rearInner)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRoundedPanelGeometry(width: number, height: number, depth: number, radius: number) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const shape = new THREE.Shape()
  shape.moveTo(-halfWidth + radius, -halfHeight)
  shape.lineTo(halfWidth - radius, -halfHeight)
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius)
  shape.lineTo(halfWidth, halfHeight - radius)
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight)
  shape.lineTo(-halfWidth + radius, halfHeight)
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius)
  shape.lineTo(-halfWidth, -halfHeight + radius)
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(radius * 0.22, 0.018),
    bevelThickness: Math.min(depth * 0.18, 0.012),
    curveSegments: 8,
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createRobotBrowRailGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.5, 0.29)
  shape.lineTo(-0.43, 0.385)
  shape.quadraticCurveTo(0, 0.435, 0.43, 0.385)
  shape.lineTo(0.5, 0.29)
  shape.lineTo(0.445, 0.245)
  shape.quadraticCurveTo(0, 0.292, -0.445, 0.245)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    curveSegments: 10,
  })
  geometry.translate(0, 0, -0.0375)
  geometry.computeVertexNormals()
  return geometry
}

function createRobotChinRailGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.43, -0.305)
  shape.quadraticCurveTo(0, -0.278, 0.43, -0.305)
  shape.lineTo(0.37, -0.405)
  shape.quadraticCurveTo(0, -0.448, -0.37, -0.405)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    curveSegments: 10,
  })
  geometry.translate(0, 0, -0.0375)
  geometry.computeVertexNormals()
  return geometry
}

function createAntennaBranchGeometry(side: -1 | 1) {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.19, 0.13, -0.006),
      new THREE.Vector3(side * 0.34, 0.285, -0.002),
      new THREE.Vector3(side * 0.47, 0.45, 0.018),
    ],
    false,
    'centripetal',
    0.42,
  )
  return new THREE.TubeGeometry(curve, 28, 0.027, 7, false)
}

function Panel({ name, position, rotation = [0, 0, 0], scale = [1, 1, 1], color, geometry, outlineWidth = 0.007 }: PanelProps) {
  return (
    <OutlineMesh
      name={name}
      position={position}
      rotation={rotation}
      scale={scale}
      outlineWidth={outlineWidth}
      outlineColor={ROBOT_INK}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial color={color} />}
    />
  )
}

function RobotShoulderPort({ side }: { side: -1 | 1 }) {
  return (
    <group name={`robot-shell-${side < 0 ? 'left' : 'right'}-integrated-arm-socket`}>
      <OutlineMesh
        position={[side * 0.785, -0.015, -0.025]}
        rotation={[0, 0, Math.PI / 2]}
        outlineWidth={0.009}
        outlineColor={ROBOT_INK}
        geometry={<cylinderGeometry args={[0.16, 0.175, 0.115, 10, 2]} />}
        material={<meshToonMaterial color={ROBOT_CHASSIS_SHADOW} />}
      />
      <OutlineMesh
        position={[side * 0.842, -0.015, -0.025]}
        rotation={[0, Math.PI / 2, 0]}
        outlineWidth={0.005}
        outlineColor={ROBOT_INK}
        geometry={<torusGeometry args={[0.112, 0.025, 7, 24]} />}
        material={<meshToonMaterial color={ROBOT_SILVER_SHADOW} />}
      />
      <OutlineMesh
        position={[side * 0.808, 0.286, -0.17]}
        scale={[0.052, 0.08, 0.045]}
        outlineWidth={0.005}
        outlineColor={ROBOT_INK}
        geometry={<dodecahedronGeometry args={[1, 0]} />}
        material={<meshToonMaterial color={side < 0 ? ROBOT_CYAN : ROBOT_AMBER} />}
      />
    </group>
  )
}

function RearServiceDeck() {
  const hatchGeometry = useMemo(() => createRoundedPanelGeometry(0.54, 0.42, 0.075, 0.09), [])
  const ventGeometry = useMemo(() => createRoundedPanelGeometry(0.31, 0.038, 0.035, 0.015), [])

  useEffect(
    () => () => {
      hatchGeometry.dispose()
      ventGeometry.dispose()
    },
    [hatchGeometry, ventGeometry],
  )

  return (
    <group name="robot-shell-finished-rear-service-deck">
      <Panel
        name="robot-shell-recessed-rear-maintenance-hatch"
        position={[0, 0.025, 0.653]}
        geometry={hatchGeometry}
        color={ROBOT_CHASSIS_SHADOW}
        outlineWidth={0.009}
      />
      {[-0.12, -0.04, 0.04, 0.12].map((y, index) => (
        <Panel
          key={`robot-rear-vent-${index}`}
          name={`robot-shell-rear-vent-${index}`}
          position={[0, y + 0.025, 0.707]}
          geometry={ventGeometry}
          color={index % 2 === 0 ? ROBOT_CHASSIS_MID : ROBOT_SILVER_SHADOW}
          outlineWidth={0.0035}
        />
      ))}
      <OutlineMesh
        name="robot-shell-rear-status-beacon"
        position={[0.205, 0.194, 0.708]}
        rotation={[Math.PI / 2, 0, 0]}
        outlineWidth={0.004}
        outlineColor={ROBOT_INK}
        geometry={<cylinderGeometry args={[0.038, 0.038, 0.025, 12, 1]} />}
        material={<meshToonMaterial color={ROBOT_CYAN} />}
      />
      <OutlineMesh
        name="robot-shell-rear-hatch-latch"
        position={[-0.195, 0.193, 0.708]}
        rotation={[Math.PI / 2, 0, 0]}
        outlineWidth={0.004}
        outlineColor={ROBOT_INK}
        geometry={<cylinderGeometry args={[0.042, 0.042, 0.026, 8, 1]} />}
        material={<meshToonMaterial color={ROBOT_AMBER} />}
      />
    </group>
  )
}

function AntennaPod({ side }: { side: -1 | 1 }) {
  return (
    <group
      name={`robot-shell-${side < 0 ? 'left' : 'right'}-antenna-end-pod`}
      position={[side * 0.47, 0.45, 0.018]}
      rotation={[0.04, side * 0.1, side * -0.42]}
    >
      <OutlineMesh
        scale={[0.105, 0.135, 0.085]}
        outlineWidth={0.008}
        outlineColor={ROBOT_INK}
        geometry={<dodecahedronGeometry args={[1, 0]} />}
        material={<meshToonMaterial color={ROBOT_CHASSIS_DEEP} />}
      />
      <OutlineMesh
        position={[0, 0, -0.079]}
        scale={[0.064, 0.066, 0.018]}
        outlineWidth={0.004}
        outlineColor={ROBOT_INK}
        geometry={<boxGeometry args={[1, 1, 1]} />}
        material={<meshToonMaterial color={ROBOT_SILVER} />}
      />
      <mesh position={[0, 0.045, -0.101]} scale={[0.025, 0.025, 0.01]}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial color={side < 0 ? ROBOT_CYAN : ROBOT_AMBER} depthTest depthWrite />
      </mesh>
    </group>
  )
}

function RobotVAntenna({ hasHeadAccessory, activity, animation }: Required<Pick<RobotShellProps, 'hasHeadAccessory' | 'activity' | 'animation'>>) {
  const root = useRef<THREE.Group>(null)
  const leftGeometry = useMemo(() => createAntennaBranchGeometry(-1), [])
  const rightGeometry = useMemo(() => createAntennaBranchGeometry(1), [])

  useEffect(
    () => () => {
      leftGeometry.dispose()
      rightGeometry.dispose()
    },
    [leftGeometry, rightGeometry],
  )

  useFrame(({ clock }) => {
    if (!root.current) return
    const motion = clamp01(activity)
    const t = clock.elapsedTime
    const hopSettle = animation === 'hop' ? Math.sin(t * 6.4 + 0.6) * 0.012 : 0
    root.current.rotation.z = Math.sin(t * 1.12 + 0.25) * 0.012 * motion + hopSettle * motion
    root.current.rotation.x = Math.sin(t * 0.86 + 1.1) * 0.008 * motion
  })

  return (
    <group
      ref={root}
      name="robot-shell-articulated-v-antenna"
      position={[0, 0.605, hasHeadAccessory ? 0.235 : 0.045]}
    >
      <group scale={hasHeadAccessory ? [1.18, 0.6, 0.92] : [1, 1, 1]}>
        <OutlineMesh
          name="robot-shell-left-segmented-v-antenna"
          outlineWidth={0.006}
          outlineColor={ROBOT_INK}
          geometry={<primitive object={leftGeometry} attach="geometry" />}
          material={<meshToonMaterial color={ROBOT_CHASSIS_MID} />}
        />
        <OutlineMesh
          name="robot-shell-right-segmented-v-antenna"
          outlineWidth={0.006}
          outlineColor={ROBOT_INK}
          geometry={<primitive object={rightGeometry} attach="geometry" />}
          material={<meshToonMaterial color={ROBOT_CHASSIS_MID} />}
        />
        {[-1, 1].map((sideValue) => {
          const side = sideValue as -1 | 1
          return (
            <group key={`robot-antenna-joints-${side}`}>
              <OutlineMesh
                position={[side * 0.19, 0.13, -0.006]}
                scale={[0.053, 0.053, 0.053]}
                outlineWidth={0.005}
                outlineColor={ROBOT_INK}
                geometry={<dodecahedronGeometry args={[1, 0]} />}
                material={<meshToonMaterial color={ROBOT_SILVER_SHADOW} />}
              />
              <OutlineMesh
                position={[side * 0.34, 0.285, -0.002]}
                scale={[0.044, 0.044, 0.044]}
                outlineWidth={0.004}
                outlineColor={ROBOT_INK}
                geometry={<dodecahedronGeometry args={[1, 0]} />}
                material={<meshToonMaterial color={ROBOT_SILVER} />}
              />
              <AntennaPod side={side} />
            </group>
          )
        })}
      </group>
    </group>
  )
}

function RobotCrown({ hasHeadAccessory, activity, animation }: Required<Pick<RobotShellProps, 'hasHeadAccessory' | 'activity' | 'animation'>>) {
  return (
    <group name="robot-shell-reinforced-antenna-crown">
      <OutlineMesh
        position={[0, 0.586, 0.04]}
        scale={[1, 1, 0.88]}
        outlineWidth={0.01}
        outlineColor={ROBOT_INK}
        geometry={<cylinderGeometry args={[0.255, 0.32, 0.12, 10, 2]} />}
        material={<meshToonMaterial color={ROBOT_CHASSIS_SHADOW} />}
      />
      <OutlineMesh
        position={[0, 0.64, 0.045]}
        scale={[0.105, 0.07, 0.095]}
        outlineWidth={0.006}
        outlineColor={ROBOT_INK}
        geometry={<dodecahedronGeometry args={[1, 0]} />}
        material={<meshToonMaterial color={ROBOT_SILVER} />}
      />
      <RobotVAntenna hasHeadAccessory={hasHeadAccessory} activity={activity} animation={animation} />
    </group>
  )
}

function RobotFrontAccentPanels() {
  return (
    <group name="robot-shell-front-embedded-control-details">
      <OutlineMesh
        name="robot-shell-forehead-cyan-status-lens"
        position={[0, 0.363, -0.847]}
        scale={[0.11, 0.022, 0.012]}
        outlineWidth={0.0035}
        outlineColor={ROBOT_INK}
        geometry={<boxGeometry args={[1, 1, 1]} />}
        material={<meshToonMaterial color={ROBOT_CYAN} />}
      />
      {[-1, 1].map((sideValue) => {
        const side = sideValue as -1 | 1
        return (
          <group key={`robot-front-fasteners-${side}`}>
            <OutlineMesh
              name={`robot-shell-${side < 0 ? 'left' : 'right'}-front-fastener`}
              position={[side * 0.49, -0.27, -0.819]}
              rotation={[Math.PI / 2, 0, 0]}
              outlineWidth={0.0035}
              outlineColor={ROBOT_INK}
              geometry={<cylinderGeometry args={[0.026, 0.026, 0.018, 8, 1]} />}
              material={<meshToonMaterial color={ROBOT_CHASSIS_DEEP} />}
            />
          </group>
        )
      })}
    </group>
  )
}

export function RobotShell({
  fitted = false,
  hasHeadAccessory = false,
  activity = 1,
  animation = 'idle',
}: RobotShellProps) {
  const hullGeometry = useMemo(() => createRobotHullGeometry(), [])

  useEffect(() => () => hullGeometry.dispose(), [hullGeometry])

  return (
    <group name="robot-shell-complete-rounded-mech-exosuit">
      <OutlineMesh
        name="robot-shell-true-cut-aperture-armored-hull"
        outlineWidth={fitted ? 0.047 : 0.057}
        outlineColor={ROBOT_INK}
        geometry={<primitive object={hullGeometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors />}
      />
      <RobotShoulderPort side={-1} />
      <RobotShoulderPort side={1} />
      <RobotCrown hasHeadAccessory={hasHeadAccessory} activity={activity} animation={animation} />
      <RearServiceDeck />
      <group name="robot-shell-lower-chassis-feet">
        {[-1, 1].map((side) => (
          <OutlineMesh
            key={`robot-shell-foot-${side}`}
            position={[side * 0.42, -0.565, 0.04]}
            rotation={[0.05, 0, side * -0.08]}
            scale={[0.24, 0.105, 0.29]}
            outlineWidth={0.008}
            outlineColor={ROBOT_INK}
            geometry={<boxGeometry args={[1, 1, 1, 2, 2, 2]} />}
            material={<meshToonMaterial color={ROBOT_CHASSIS_DEEP} />}
          />
        ))}
      </group>
    </group>
  )
}

export function RobotShellOpeningFrame() {
  const tunnelGeometry = useMemo(() => createRobotOpeningTunnelGeometry(), [])
  const frameGeometry = useMemo(() => createRobotFaceFrameGeometry(), [])
  const browGeometry = useMemo(() => createRobotBrowRailGeometry(), [])
  const chinGeometry = useMemo(() => createRobotChinRailGeometry(), [])

  useEffect(
    () => () => {
      tunnelGeometry.dispose()
      frameGeometry.dispose()
      browGeometry.dispose()
      chinGeometry.dispose()
    },
    [tunnelGeometry, frameGeometry, browGeometry, chinGeometry],
  )

  return (
    <group name="robot-shell-deep-protected-face-aperture">
      <mesh name="robot-shell-opaque-depth-tested-face-tunnel">
        <primitive object={tunnelGeometry} attach="geometry" />
        <meshToonMaterial color={ROBOT_CHASSIS_DEEP} side={THREE.DoubleSide} depthTest depthWrite />
      </mesh>
      <OutlineMesh
        name="robot-shell-thick-silver-face-frame"
        outlineWidth={0.012}
        outlineColor={ROBOT_INK}
        geometry={<primitive object={frameGeometry} attach="geometry" />}
        material={<meshToonMaterial vertexColors side={THREE.DoubleSide} />}
      />
      <Panel
        name="robot-shell-source-faithful-silver-forehead-rail"
        position={[0, 0, -0.802]}
        geometry={browGeometry}
        color={ROBOT_SILVER_LIGHT}
        outlineWidth={0.008}
      />
      <Panel
        name="robot-shell-source-faithful-silver-chin-rail"
        position={[0, 0, -0.802]}
        geometry={chinGeometry}
        color={ROBOT_SILVER_SHADOW}
        outlineWidth={0.008}
      />
      <RobotFrontAccentPanels />
    </group>
  )
}
