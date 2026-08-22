import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const HOODIE_INK = '#1a1029'
export const HOODIE_DEEP = '#2d194c'
export const HOODIE_SHADOW = '#3d2765'
export const HOODIE_BASE = '#52387f'
export const HOODIE_MID = '#684d96'
export const HOODIE_LIGHT = '#8975ad'
export const HOODIE_LINING = '#aaa3c2'
export const HOODIE_LINING_LIGHT = '#d1cbda'
export const HOODIE_STITCH = '#b9afd0'

type HoodieAnimation = 'idle' | 'hop' | 'grumble'

type HoodieShellProps = {
  fitted?: boolean
  activity?: number
  animation?: HoodieAnimation
}

type HoodieSeamProps = {
  name: string
  points: [number, number, number][]
  radius?: number
  color?: string
}

type HoodieFleeceNapProps = {
  geometry: THREE.BufferGeometry
  count: number
  name: string
  seed?: number
  lengthScale?: number
}

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function createHoodieBodyGeometry() {
  const indexed = new THREE.SphereGeometry(1, 40, 26)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const shoulder = Math.exp(-((y - 0.18) ** 2) / 0.12)
    const lowerDrape = smoothstep01((-y - 0.12) / 0.78)
    const hoodCrown = smoothstep01((y - 0.18) / 0.76)
    const upperTuck = smoothstep01((y - 0.48) / 0.42)
    const front = smoothstep01((-z - 0.08) / 0.9)
    const back = smoothstep01((z + 0.05) / 0.9)
    const broadFold =
      Math.sin(angle * 4.0 + y * 3.1 + 0.4) * 0.018
      + Math.cos(angle * 7.0 - y * 2.3) * 0.009
    const sideEase = 1 + shoulder * 0.095 + lowerDrape * 0.074 - upperTuck * 0.048
    const frontDrape = 1 + front * 0.052 + back * 0.086

    let nextX = x * 0.81 * sideEase * (1 + broadFold)
    let nextY = -0.024 + y * 0.695 + hoodCrown * 0.052 - shoulder * 0.01
    let nextZ = -0.055 + z * 0.64 * frontDrape * (1 + broadFold * 0.74)

    nextX += Math.sin(y * 4.2 + 0.35) * 0.008 * (1 - Math.abs(x) * 0.5)
    nextZ += Math.cos(y * 5.1 - angle * 0.8) * 0.008

    if (nextY < -0.5) {
      const settle = smoothstep01((-nextY - 0.5) / 0.18)
      nextY = THREE.MathUtils.lerp(nextY, -0.608 + Math.sin(angle * 6.0) * 0.006, settle * 0.9)
      nextX *= 1 + settle * 0.045
      nextZ *= 1 + settle * 0.025
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  indexed.computeVertexNormals()
  const source = indexed.toNonIndexed()
  indexed.dispose()
  const sourcePosition = source.attributes.position as THREE.BufferAttribute
  const sourceNormal = source.attributes.normal as THREE.BufferAttribute
  const positions: number[] = []
  const normals: number[] = []

  for (let index = 0; index < sourcePosition.count; index += 3) {
    const centerX = (
      sourcePosition.getX(index)
      + sourcePosition.getX(index + 1)
      + sourcePosition.getX(index + 2)
    ) / 3
    const centerY = (
      sourcePosition.getY(index)
      + sourcePosition.getY(index + 1)
      + sourcePosition.getY(index + 2)
    ) / 3
    const centerZ = (
      sourcePosition.getZ(index)
      + sourcePosition.getZ(index + 1)
      + sourcePosition.getZ(index + 2)
    ) / 3
    const aperture = ((centerX - 0.02) / 0.45) ** 2 + ((centerY + 0.035) / 0.34) ** 2

    if (centerZ < -0.48 && aperture < 1.02) continue

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
    }
  }

  source.dispose()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createHoodieCowlGeometry(layer: 'outer' | 'lining') {
  const segments = 72
  const tubeSegments = layer === 'outer' ? 14 : 10
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.2)
    const sideTuck = side * side
    const brow = upper * Math.pow(Math.max(0, 1 - Math.abs(cosAngle)), 1.45)
    const organic = 1 + Math.sin(angle * 3.0 + 0.35) * 0.007 + Math.cos(angle * 5.0 - 0.4) * 0.004
    const centerX = layer === 'outer' ? 0.474 + sideTuck * 0.026 : 0.412 + sideTuck * 0.012
    const centerY = layer === 'outer'
      ? 0.355 + lower * 0.03 - upper * 0.015 - brow * 0.018
      : 0.301 + lower * 0.016 - brow * 0.008
    const centerZ = layer === 'outer'
      ? -0.704 + sideTuck * 0.046 - lower * 0.02 + brow * 0.012
      : -0.765 + sideTuck * 0.012 - lower * 0.004
    const radialRadius = layer === 'outer'
      ? 0.057 + lower * 0.022 + sideTuck * 0.016 - upper * 0.007
      : 0.025 + lower * 0.007 + sideTuck * 0.003 - upper * 0.002
    const depthRadius = layer === 'outer'
      ? 0.041 + sideTuck * 0.013 + lower * 0.007 - brow * 0.005
      : 0.017 + sideTuck * 0.004 + lower * 0.002

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const bodyMelt = layer === 'outer'
        ? Math.max(0, tubeRadial) * (0.098 + sideTuck * 0.055 + upper * 0.018)
        : 0
      const faceRoll = Math.max(0, -tubeRadial) * (layer === 'outer' ? 0.014 : 0.005)

      vertices.push(
        0.02 + cosAngle * (centerX + tubeRadial * radialRadius) * organic,
        -0.035 + sinAngle * (centerY + tubeRadial * radialRadius) * organic - lower * 0.018,
        centerZ + tubeDepth * depthRadius + bodyMelt - faceRoll,
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
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createHoodieOpeningWallGeometry() {
  const segments = 72
  const rings = 8
  const vertices: number[] = []
  const indices: number[] = []

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    const ease = t * t * (3 - 2 * t)
    const bodyOverlap = smoothstep01((t - 0.42) / 0.58)

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const lower = Math.max(0, -Math.sin(angle))
      const side = Math.max(0, Math.abs(Math.cos(angle)) - 0.2)
      const xRadius = 0.39
        + ease * (0.115 + side * 0.025)
        + bodyOverlap * (0.038 + side * 0.035)
      const yRadius = 0.28
        + ease * (0.098 + lower * 0.018)
        + bodyOverlap * (0.028 + lower * 0.012)
      const z = -0.77
        + ease * (0.235 + side * 0.028)
        - lower * ease * 0.012
        + bodyOverlap * (0.1 + side * 0.03)
      vertices.push(
        0.02 + Math.cos(angle) * xRadius,
        -0.035 + Math.sin(angle) * yRadius - lower * 0.012,
        z,
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

function createHoodieHemGeometry() {
  const geometry = new THREE.CylinderGeometry(1, 1.025, 0.12, 40, 4, false)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const rib = 1 + Math.sin(angle * 18.0) * 0.008
    position.setXYZ(index, x * 0.7 * rib, -0.555 + y, z * 0.515 * rib)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createHoodieSeamGeometry(points: [number, number, number][], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)))
  return new THREE.TubeGeometry(curve, Math.max(12, points.length * 7), radius, 6, false)
}

function hoodieSeededUnit(index: number, seed: number) {
  const value = Math.sin((index + 1) * (12.9898 + seed * 0.137)) * 43758.5453
  return value - Math.floor(value)
}

function createHoodieFleeceNapMesh({
  geometry,
  count,
  name,
  seed = 1,
  lengthScale = 1,
}: HoodieFleeceNapProps) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const index = geometry.index
  const triangleCount = index ? index.count / 3 : position.count / 3
  const cumulativeAreas: number[] = []
  const pointA = new THREE.Vector3()
  const pointB = new THREE.Vector3()
  const pointC = new THREE.Vector3()
  const edgeA = new THREE.Vector3()
  const edgeB = new THREE.Vector3()
  let totalArea = 0

  const vertexIndex = (triangle: number, corner: number) => (
    index ? index.getX(triangle * 3 + corner) : triangle * 3 + corner
  )

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    pointA.fromBufferAttribute(position, vertexIndex(triangle, 0))
    pointB.fromBufferAttribute(position, vertexIndex(triangle, 1))
    pointC.fromBufferAttribute(position, vertexIndex(triangle, 2))
    edgeA.subVectors(pointB, pointA)
    edgeB.subVectors(pointC, pointA)
    totalArea += edgeA.cross(edgeB).length() * 0.5
    cumulativeAreas.push(totalArea)
  }

  const strandGeometry = new THREE.SphereGeometry(1, 5, 3)
  const strandMaterial = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    vertexColors: true,
    toneMapped: true,
  })
  const mesh = new THREE.InstancedMesh(strandGeometry, strandMaterial, count)
  const dummy = new THREE.Object3D()
  const surfacePoint = new THREE.Vector3()
  const surfaceNormal = new THREE.Vector3()
  const normalA = new THREE.Vector3()
  const normalB = new THREE.Vector3()
  const normalC = new THREE.Vector3()
  const down = new THREE.Vector3(0, -1, 0)
  const downTangent = new THREE.Vector3()
  const sideTangent = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const fleeceColors = [
    new THREE.Color(HOODIE_MID).lerp(new THREE.Color(HOODIE_LIGHT), 0.18),
    new THREE.Color(HOODIE_MID).lerp(new THREE.Color(HOODIE_LIGHT), 0.38),
    new THREE.Color(HOODIE_MID).lerp(new THREE.Color(HOODIE_LIGHT), 0.58),
    new THREE.Color(HOODIE_BASE).lerp(new THREE.Color(HOODIE_MID), 0.72),
  ]

  for (let instance = 0; instance < count; instance += 1) {
    const areaTarget = hoodieSeededUnit(instance * 7 + 1, seed) * totalArea
    let low = 0
    let high = cumulativeAreas.length - 1
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (cumulativeAreas[middle] < areaTarget) low = middle + 1
      else high = middle
    }

    const triangle = low
    const cornerA = vertexIndex(triangle, 0)
    const cornerB = vertexIndex(triangle, 1)
    const cornerC = vertexIndex(triangle, 2)
    const root = Math.sqrt(hoodieSeededUnit(instance * 7 + 2, seed))
    const split = hoodieSeededUnit(instance * 7 + 3, seed)
    const weightA = 1 - root
    const weightB = root * (1 - split)
    const weightC = root * split

    pointA.fromBufferAttribute(position, cornerA)
    pointB.fromBufferAttribute(position, cornerB)
    pointC.fromBufferAttribute(position, cornerC)
    surfacePoint
      .copy(pointA)
      .multiplyScalar(weightA)
      .addScaledVector(pointB, weightB)
      .addScaledVector(pointC, weightC)

    normalA.fromBufferAttribute(normal, cornerA)
    normalB.fromBufferAttribute(normal, cornerB)
    normalC.fromBufferAttribute(normal, cornerC)
    surfaceNormal
      .copy(normalA)
      .multiplyScalar(weightA)
      .addScaledVector(normalB, weightB)
      .addScaledVector(normalC, weightC)
      .normalize()

    downTangent.copy(down).addScaledVector(surfaceNormal, -down.dot(surfaceNormal))
    if (downTangent.lengthSq() < 0.0001) downTangent.set(1, 0, 0)
    else downTangent.normalize()
    sideTangent.crossVectors(surfaceNormal, downTangent).normalize()
    direction
      .copy(surfaceNormal)
      .multiplyScalar(0.94)
      .addScaledVector(downTangent, 0.1 + hoodieSeededUnit(instance * 7 + 4, seed) * 0.06)
      .addScaledVector(sideTangent, (hoodieSeededUnit(instance * 7 + 5, seed) - 0.5) * 0.08)
      .normalize()

    const strandLength = (0.0048 + hoodieSeededUnit(instance * 7 + 6, seed) * 0.0046) * lengthScale
    const strandWidth = (0.0015 + hoodieSeededUnit(instance * 7 + 7, seed) * 0.0011) * lengthScale
    dummy.position
      .copy(surfacePoint)
      .addScaledVector(surfaceNormal, 0.0015 * lengthScale)
      .addScaledVector(direction, strandLength * 0.72)
    dummy.quaternion.setFromUnitVectors(up, direction)
    dummy.scale.set(strandWidth, strandLength, strandWidth)
    dummy.updateMatrix()
    mesh.setMatrixAt(instance, dummy.matrix)
    mesh.setColorAt(instance, fleeceColors[(instance + seed) % fleeceColors.length])
  }

  mesh.name = name
  mesh.frustumCulled = false
  mesh.raycast = () => undefined
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return mesh
}

function HoodieFleeceNap({
  geometry,
  count,
  name,
  seed = 1,
  lengthScale = 1,
}: HoodieFleeceNapProps) {
  const fleece = useMemo(
    () => createHoodieFleeceNapMesh({ geometry, count, name, seed, lengthScale }),
    [count, geometry, lengthScale, name, seed],
  )

  useEffect(
    () => () => {
      fleece.geometry.dispose()
      const material = fleece.material
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose())
      else material.dispose()
    },
    [fleece],
  )

  return <primitive object={fleece} />
}

const HOODIE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const HOODIE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uShadowColor;
  uniform vec3 uBaseColor;
  uniform vec3 uMidColor;
  uniform vec3 uLightColor;
  uniform vec3 uFleeceColor;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.48));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    vec3 fabricColor = uBaseColor;
    fabricColor = mix(uShadowColor, fabricColor, step(0.29, lightAmount));
    fabricColor = mix(fabricColor, uMidColor, step(0.56, lightAmount));
    fabricColor = mix(fabricColor, uLightColor, step(0.79, lightAmount));

    float weaveA = sin((vLocalPosition.x + vLocalPosition.z * 0.34) * 126.0 + vLocalPosition.y * 17.0);
    float weaveB = sin((vLocalPosition.y - vLocalPosition.z * 0.18) * 142.0 - vLocalPosition.x * 13.0);
    float wovenKnit = weaveA * weaveB;
    float heather = sin(dot(vLocalPosition, vec3(89.0, 117.0, 103.0)))
      * sin(dot(vLocalPosition, vec3(151.0, 73.0, 127.0)));
    float fleeceA = sin(dot(vLocalPosition, vec3(53.0, 71.0, 61.0)) + sin(vLocalPosition.y * 24.0));
    float fleeceB = sin(dot(vLocalPosition, vec3(83.0, 47.0, 77.0)) - vLocalPosition.x * 18.0);
    float brushedFleece = smoothstep(0.42, 0.94, fleeceA * fleeceB);
    float softPits = smoothstep(0.5, 0.96, -fleeceA * fleeceB);
    float heatherLight = smoothstep(0.36, 0.94, heather);
    float heatherShadow = smoothstep(0.58, 0.98, -heather);
    float fuzzyRim = pow(1.0 - abs(normalize(vViewNormal).z), 2.2);
    float foldBand = sin(atan(vLocalPosition.z, vLocalPosition.x) * 5.0 + vLocalPosition.y * 6.8);
    float lowerFold = (1.0 - smoothstep(-0.56, -0.12, vLocalPosition.y)) * foldBand;

    fabricColor *= 1.0 + wovenKnit * 0.018;
    fabricColor = mix(fabricColor, uLightColor, heatherLight * 0.04);
    fabricColor = mix(fabricColor, uShadowColor, heatherShadow * 0.018);
    fabricColor = mix(fabricColor, uFleeceColor, brushedFleece * 0.11 + fuzzyRim * 0.13);
    fabricColor = mix(fabricColor, uShadowColor, softPits * 0.018);
    fabricColor = mix(fabricColor, uShadowColor, smoothstep(0.72, 0.98, lowerFold) * 0.08);

    gl_FragColor = vec4(fabricColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const HOODIE_RIB_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uBaseColor;
  uniform vec3 uLightColor;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.48));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float angle = atan(vLocalPosition.z / 0.515, vLocalPosition.x / 0.7);
    float ribWave = 0.5 + 0.5 * sin(angle * 38.0);
    float ribHighlight = smoothstep(0.72, 0.98, ribWave);
    vec3 ribColor = mix(uDeepColor, uBaseColor, step(0.34, lightAmount));
    ribColor = mix(ribColor, uLightColor, ribHighlight * 0.18 * step(0.56, lightAmount));
    gl_FragColor = vec4(ribColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function HoodieFabricMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(HOODIE_DEEP) },
      uShadowColor: { value: new THREE.Color(HOODIE_SHADOW) },
      uBaseColor: { value: new THREE.Color(HOODIE_BASE) },
      uMidColor: { value: new THREE.Color(HOODIE_MID) },
      uLightColor: { value: new THREE.Color(HOODIE_LIGHT) },
      uFleeceColor: { value: new THREE.Color(HOODIE_LIGHT).lerp(new THREE.Color(HOODIE_LINING_LIGHT), 0.24) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={HOODIE_VERTEX_SHADER}
      fragmentShader={HOODIE_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function HoodieRibMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(HOODIE_DEEP) },
      uBaseColor: { value: new THREE.Color(HOODIE_SHADOW) },
      uLightColor: { value: new THREE.Color(HOODIE_LIGHT) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={HOODIE_VERTEX_SHADER}
      fragmentShader={HOODIE_RIB_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function HoodieSeam({ name, points, radius = 0.009, color = HOODIE_DEEP }: HoodieSeamProps) {
  const geometry = useMemo(() => createHoodieSeamGeometry(points, radius), [points, radius])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh name={name} geometry={geometry}>
      <meshBasicMaterial color={color} depthTest depthWrite />
    </mesh>
  )
}

function HoodieSleeve({ side }: { side: -1 | 1 }) {
  return (
    <group name={`hoodie-shell-${side < 0 ? 'left' : 'right'}-sleeve`}>
      <mesh
        name={`hoodie-shell-${side < 0 ? 'left' : 'right'}-puffy-sleeve-root-seal`}
        position={[side * 0.665, 0.07, -0.002]}
        rotation-z={side * 0.12}
        scale={[0.245, 0.285, 0.235]}
      >
        <sphereGeometry args={[1, 18, 11]} />
        <HoodieFabricMaterial />
      </mesh>
      <OutlineMesh
        position={[side * 0.76, -0.015, 0.02]}
        rotation-z={side * 0.06}
        scale={[0.225, 0.205, 0.22]}
        outlineWidth={0.016}
        outlineColor={HOODIE_INK}
        geometry={<sphereGeometry args={[1, 16, 10]} />}
        material={<HoodieFabricMaterial />}
      />
      <OutlineMesh
        position={[side * 0.8, -0.018, -0.015]}
        rotation-z={Math.PI / 2}
        scale={[1, 1.04, 1.04]}
        outlineWidth={0.008}
        outlineColor={HOODIE_INK}
        geometry={<cylinderGeometry args={[0.185, 0.198, 0.14, 18, 2, false]} />}
        material={<meshToonMaterial color={HOODIE_SHADOW} />}
      />
    </group>
  )
}

function HoodieDrawstring({
  side,
  activity,
  animation,
}: {
  side: -1 | 1
  activity: number
  animation: HoodieAnimation
}) {
  const group = useRef<THREE.Group>(null)
  const points = useMemo<[number, number, number][]>(
    () => [
      [0, 0, 0],
      [side * 0.008, -0.075, -0.008],
      [side * 0.002, -0.17, -0.014],
    ],
    [side],
  )
  const geometry = useMemo(() => createHoodieSeamGeometry(points, 0.011), [points])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    if (!group.current) return
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    const hopScale = animation === 'hop' ? 1.4 : animation === 'grumble' ? 1.18 : 1
    group.current.rotation.z = side * 0.025 + Math.sin(clock.elapsedTime * 1.8 + side * 0.7) * 0.025 * motion * hopScale
    group.current.rotation.x = Math.sin(clock.elapsedTime * 1.35 + side) * 0.018 * motion * hopScale
  })

  return (
    <group
      ref={group}
      name={`hoodie-shell-drawstring-${side < 0 ? 'left' : 'right'}`}
      position={[side * 0.205, -0.305, -0.78]}
    >
      <OutlineMesh
        outlineWidth={0.0035}
        outlineColor={HOODIE_INK}
        geometry={<primitive object={geometry} attach="geometry" />}
        material={<meshToonMaterial color={HOODIE_LINING_LIGHT} />}
      />
      <OutlineMesh
        position={[side * 0.002, -0.174, -0.014]}
        scale={[0.024, 0.034, 0.024]}
        outlineWidth={0.004}
        outlineColor={HOODIE_INK}
        geometry={<sphereGeometry args={[1, 9, 6]} />}
        material={<meshToonMaterial color={HOODIE_LINING} />}
      />
    </group>
  )
}

function HoodieCowlStitches() {
  const stitches = useMemo(
    () => Array.from({ length: 20 }, (_, index) => {
      const angle = (index / 20) * Math.PI * 2 + 0.05
      const lower = Math.max(0, -Math.sin(angle))
      return {
        position: [
          0.02 + Math.cos(angle) * 0.455,
          -0.035 + Math.sin(angle) * (0.34 + lower * 0.01),
          -0.786 - lower * 0.004,
        ] as [number, number, number],
        rotation: angle + Math.PI / 2,
      }
    }),
    [],
  )

  return (
    <group name="hoodie-shell-cowl-stitching">
      {stitches.map((stitch, index) => (
        <mesh
          key={`hoodie-cowl-stitch-${index}`}
          position={stitch.position}
          rotation-z={stitch.rotation}
          scale={[0.019, 0.004, 0.004]}
        >
          <sphereGeometry args={[1, 6, 3]} />
          <meshBasicMaterial color={HOODIE_STITCH} depthTest depthWrite />
        </mesh>
      ))}
    </group>
  )
}

export function HoodieShell({ fitted = false }: HoodieShellProps) {
  const bodyGeometry = useMemo(() => createHoodieBodyGeometry(), [])
  const hemGeometry = useMemo(() => createHoodieHemGeometry(), [])
  const crownSeamPoints = useMemo<[number, number, number][]>(
    () => [
      [0.008, 0.682, -0.05],
      [0.012, 0.61, 0.17],
      [0.004, 0.43, 0.42],
      [-0.008, 0.12, 0.59],
      [0.002, -0.14, 0.6],
    ],
    [],
  )
  const leftSideSeam = useMemo<[number, number, number][]>(
    () => [
      [-0.69, 0.19, 0.16],
      [-0.735, -0.08, 0.12],
      [-0.675, -0.46, 0.08],
    ],
    [],
  )
  const rightSideSeam = useMemo<[number, number, number][]>(
    () => [
      [0.69, 0.19, 0.16],
      [0.735, -0.08, 0.12],
      [0.675, -0.46, 0.08],
    ],
    [],
  )

  useEffect(
    () => () => {
      bodyGeometry.dispose()
      hemGeometry.dispose()
    },
    [bodyGeometry, hemGeometry],
  )

  return (
    <group name="hoodie-shell-cozy-pullover">
      <OutlineMesh
        name="hoodie-shell-body"
        outlineWidth={fitted ? 0.04 : 0.052}
        outlineColor={HOODIE_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<HoodieFabricMaterial />}
      />
      <HoodieFleeceNap
        geometry={bodyGeometry}
        count={1180}
        seed={17}
        lengthScale={1.04}
        name="hoodie-shell-brushed-fleece-nap"
      />
      <OutlineMesh
        name="hoodie-shell-ribbed-hem"
        outlineWidth={0.018}
        outlineColor={HOODIE_INK}
        geometry={<primitive object={hemGeometry} attach="geometry" />}
        material={<HoodieRibMaterial />}
      />
      <HoodieSleeve side={-1} />
      <HoodieSleeve side={1} />
      <HoodieSeam name="hoodie-shell-crown-center-seam" points={crownSeamPoints} radius={0.008} color={HOODIE_STITCH} />
      <HoodieSeam name="hoodie-shell-left-side-seam" points={leftSideSeam} radius={0.007} />
      <HoodieSeam name="hoodie-shell-right-side-seam" points={rightSideSeam} radius={0.007} />
      <HoodieSeam
        name="hoodie-shell-left-shoulder-fold"
        points={[
          [-0.5, 0.36, -0.32],
          [-0.62, 0.24, -0.39],
          [-0.7, 0.08, -0.32],
        ]}
        radius={0.008}
        color={HOODIE_LIGHT}
      />
      <HoodieSeam
        name="hoodie-shell-right-shoulder-fold"
        points={[
          [0.51, 0.34, -0.31],
          [0.63, 0.2, -0.39],
          [0.7, 0.04, -0.31],
        ]}
        radius={0.008}
        color={HOODIE_LIGHT}
      />
    </group>
  )
}

export function HoodieShellOpeningLip({ activity = 1, animation = 'idle' }: HoodieShellProps) {
  const wallGeometry = useMemo(() => createHoodieOpeningWallGeometry(), [])
  const outerGeometry = useMemo(() => createHoodieCowlGeometry('outer'), [])
  const liningGeometry = useMemo(() => createHoodieCowlGeometry('lining'), [])

  useEffect(
    () => () => {
      wallGeometry.dispose()
      outerGeometry.dispose()
      liningGeometry.dispose()
    },
    [liningGeometry, outerGeometry, wallGeometry],
  )

  return (
    <group name="hoodie-shell-integrated-face-cowl">
      <mesh name="hoodie-shell-opening-wall" geometry={wallGeometry}>
        <meshToonMaterial color={HOODIE_DEEP} side={THREE.DoubleSide} depthTest depthWrite />
      </mesh>
      <OutlineMesh
        name="hoodie-shell-rolled-cowl"
        outlineWidth={0.014}
        outlineColor={HOODIE_INK}
        geometry={<primitive object={outerGeometry} attach="geometry" />}
        material={<HoodieFabricMaterial />}
      />
      <HoodieFleeceNap
        geometry={outerGeometry}
        count={420}
        seed={31}
        lengthScale={0.88}
        name="hoodie-shell-cowl-soft-fleece-nap"
      />
      <mesh name="hoodie-shell-soft-lining" geometry={liningGeometry}>
        <meshToonMaterial color={HOODIE_LINING} depthTest depthWrite />
      </mesh>
      <HoodieCowlStitches />
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`hoodie-shell-grommet-${side}`}
          name={`hoodie-shell-grommet-${side < 0 ? 'left' : 'right'}`}
          position={[side * 0.205, -0.305, -0.788]}
          scale={[0.026, 0.026, 0.012]}
        >
          <torusGeometry args={[0.62, 0.2, 6, 14]} />
          <meshToonMaterial color={HOODIE_INK} depthTest depthWrite />
        </mesh>
      ))}
      <HoodieDrawstring side={-1} activity={activity} animation={animation} />
      <HoodieDrawstring side={1} activity={activity} animation={animation} />
    </group>
  )
}
