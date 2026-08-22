import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export type CloakShellVariant = 'red' | 'green'

type CloakShellProps = {
  fitted?: boolean
  variant?: CloakShellVariant
}

type CloakPalette = {
  trimDeep: string
  trimBase: string
  trimLight: string
}

export const CLOAK_SHADOW = '#342b3d'

const CLOAK_INK = '#15131b'
const CLOAK_DEEP = '#242329'
const CLOAK_SHADOW_FABRIC = '#302f35'
const CLOAK_BASE = '#3d3b41'
const CLOAK_MID = '#4c4950'
const CLOAK_LIGHT = '#625e66'

const CLOAK_PALETTES: Record<CloakShellVariant, CloakPalette> = {
  red: {
    trimDeep: '#711b22',
    trimBase: '#ad3033',
    trimLight: '#db493b',
  },
  green: {
    trimDeep: '#245727',
    trimBase: '#438632',
    trimLight: '#67aa38',
  },
}

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function createCloakBodyGeometry() {
  const indexed = new THREE.SphereGeometry(1, 48, 32)
  const position = indexed.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const sourceX = position.getX(index)
    const sourceY = position.getY(index)
    const sourceZ = position.getZ(index)
    const angle = Math.atan2(sourceZ, sourceX)
    const shoulder = Math.exp(-((sourceY - 0.16) ** 2) / 0.095)
    const lowerDrape = smoothstep01((-sourceY - 0.04) / 0.9)
    const crownTuck = smoothstep01((sourceY - 0.32) / 0.58)
    const front = smoothstep01((-sourceZ - 0.04) / 0.92)
    const back = smoothstep01((sourceZ + 0.02) / 0.92)
    const foldWeight = lowerDrape * (0.3 + front * 0.7)
    const broadFold =
      Math.sin(angle * 4.0 + sourceY * 3.2 + 0.35) * 0.024
      + Math.cos(angle * 7.0 - sourceY * 2.1) * 0.011
    const sideScale = 1 + shoulder * 0.085 + lowerDrape * 0.13 - crownTuck * 0.06
    const depthScale = 1 + front * 0.045 + back * 0.035

    let x = sourceX * 0.82 * sideScale * (1 + broadFold * foldWeight)
    let y = -0.015 + sourceY * 0.755 + shoulder * 0.008 + crownTuck * 0.025
    let z = -0.005 + sourceZ * 0.585 * depthScale * (1 + broadFold * foldWeight * 0.72)

    x -= crownTuck * 0.024

    x += Math.sin(sourceY * 4.4 + angle * 0.45) * 0.009 * lowerDrape
    z += Math.cos(sourceY * 4.9 - angle * 0.55) * 0.009 * foldWeight

    if (y < -0.54) {
      const settle = smoothstep01((-y - 0.54) / 0.16)
      const hemRipple = Math.sin(angle * 6.0 + 0.25) * 0.007
      y = THREE.MathUtils.lerp(y, -0.612 + hemRipple, settle * 0.94)
      x *= 1 + settle * 0.048
      z *= 1 + settle * 0.032
    }

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
    const lower = Math.max(0, -(centerY - 0.055))
    const aperture = (centerX / 0.475) ** 2 + ((centerY - 0.055) / (0.36 + lower * 0.015)) ** 2

    if (centerZ < -0.43 && aperture < 1.03) continue

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

function createCloakOpeningWallGeometry() {
  const segments = 88
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
      const side = Math.max(0, Math.abs(cosAngle) - 0.24)
      const sideTuck = side * side
      const organic = 1 + Math.sin(angle * 3.0 + 0.2) * 0.005 + Math.cos(angle * 5.0 - 0.4) * 0.003
      const radiusX = 0.43 + ease * (0.15 + sideTuck * 0.03)
      const radiusY = 0.333 + ease * (0.115 + lower * 0.025 - upper * 0.008)
      const y = 0.055 + sinAngle * radiusY * organic - lower * 0.012
      const z = -0.75 + ease * (0.292 + sideTuck * 0.036 + upper * 0.014) - lower * ease * 0.01

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
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createCloakFaceRollGeometry() {
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
    const side = Math.max(0, Math.abs(cosAngle) - 0.22)
    const sideTuck = side * side
    const organic = 1 + Math.sin(angle * 3.0 + 0.18) * 0.005 + Math.cos(angle * 5.0 - 0.35) * 0.003
    const centerRadiusX = 0.493 + sideTuck * 0.018
    const centerRadiusY = 0.397 + lower * 0.014 - upper * 0.006
    const centerZ = -0.706 + sideTuck * 0.012 + upper * 0.006
    const radialRadius = 0.06 + lower * 0.009 + sideTuck * 0.008
    const depthRadius = 0.052 + sideTuck * 0.009 + lower * 0.004

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const clothMelt = Math.max(0, tubeRadial) * (0.098 + sideTuck * 0.048 + upper * 0.014)
      const innerTuck = Math.max(0, -tubeRadial) * 0.012

      vertices.push(
        cosAngle * (centerRadiusX + tubeRadial * radialRadius) * organic,
        0.055 + sinAngle * (centerRadiusY + tubeRadial * radialRadius) * organic - lower * 0.012,
        centerZ + tubeDepth * depthRadius + clothMelt - innerTuck,
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

function createCloakHemRollGeometry() {
  const segments = 88
  const tubeSegments = 14
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const organic = 1 + Math.sin(angle * 6.0 + 0.25) * 0.008 + Math.cos(angle * 3.0) * 0.004

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const radial = Math.cos(tubeAngle)
      const vertical = Math.sin(tubeAngle)
      const radiusX = 0.692 + radial * 0.038
      const radiusZ = 0.49 + radial * 0.034

      vertices.push(
        cosAngle * radiusX * organic,
        -0.555 + vertical * 0.046,
        sinAngle * radiusZ * organic,
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

function createCloakSeamGeometry(points: [number, number, number][], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)))
  return new THREE.TubeGeometry(curve, Math.max(18, points.length * 10), radius, 7, false)
}

const CLOAK_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CLOAK_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uShadowColor;
  uniform vec3 uBaseColor;
  uniform vec3 uMidColor;
  uniform vec3 uLightColor;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.8, 0.44));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    vec3 fabricColor = uBaseColor;
    fabricColor = mix(uShadowColor, fabricColor, step(0.3, lightAmount));
    fabricColor = mix(fabricColor, uMidColor, step(0.56, lightAmount));
    fabricColor = mix(fabricColor, uLightColor, step(0.81, lightAmount));

    float weaveA = sin((vLocalPosition.x + vLocalPosition.z * 0.27) * 118.0 + vLocalPosition.y * 15.0);
    float weaveB = sin((vLocalPosition.y - vLocalPosition.z * 0.2) * 136.0 - vLocalPosition.x * 11.0);
    float wovenCloth = weaveA * weaveB;
    float angle = atan(vLocalPosition.z, vLocalPosition.x);
    float lowerWeight = 1.0 - smoothstep(-0.52, -0.08, vLocalPosition.y);
    float foldBand = 0.5 + 0.5 * sin(angle * 4.0 + vLocalPosition.y * 6.2 + 0.35);
    float softEdge = pow(1.0 - abs(normalize(vViewNormal).z), 2.0);

    fabricColor *= 1.0 + wovenCloth * 0.016;
    fabricColor = mix(fabricColor, uShadowColor, foldBand * lowerWeight * 0.09);
    fabricColor = mix(fabricColor, uLightColor, softEdge * 0.035);
    fabricColor = mix(fabricColor, uDeepColor, step(0.93, -wovenCloth) * 0.035);

    gl_FragColor = vec4(fabricColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function CloakFabricMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(CLOAK_DEEP) },
      uShadowColor: { value: new THREE.Color(CLOAK_SHADOW_FABRIC) },
      uBaseColor: { value: new THREE.Color(CLOAK_BASE) },
      uMidColor: { value: new THREE.Color(CLOAK_MID) },
      uLightColor: { value: new THREE.Color(CLOAK_LIGHT) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={CLOAK_VERTEX_SHADER}
      fragmentShader={CLOAK_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function CloakTrimMaterial({ variant }: { variant: CloakShellVariant }) {
  const palette = CLOAK_PALETTES[variant]
  return (
    <meshToonMaterial
      color={palette.trimBase}
      emissive={palette.trimDeep}
      emissiveIntensity={0.025}
      depthTest
      depthWrite
    />
  )
}

function CloakFoldSeams() {
  const seams = useMemo(
    () => [
      {
        name: 'cloak-shell-left-front-fabric-fold',
        points: [
          [-0.385, -0.19, -0.505],
          [-0.46, -0.37, -0.555],
          [-0.43, -0.555, -0.485],
        ] as [number, number, number][],
        radius: 0.038,
        color: CLOAK_BASE,
      },
      {
        name: 'cloak-shell-center-front-fabric-fold',
        points: [
          [-0.018, -0.265, -0.57],
          [0.018, -0.405, -0.592],
          [-0.012, -0.575, -0.515],
        ] as [number, number, number][],
        radius: 0.026,
        color: CLOAK_SHADOW_FABRIC,
      },
      {
        name: 'cloak-shell-right-front-fabric-fold',
        points: [
          [0.4, -0.175, -0.495],
          [0.49, -0.36, -0.54],
          [0.46, -0.55, -0.475],
        ] as [number, number, number][],
        radius: 0.036,
        color: CLOAK_BASE,
      },
      {
        name: 'cloak-shell-finished-rear-center-seam',
        points: [
          [0.01, 0.66, 0.035],
          [0, 0.45, 0.43],
          [-0.012, 0.08, 0.64],
          [0.005, -0.48, 0.54],
        ] as [number, number, number][],
        radius: 0.008,
        color: CLOAK_DEEP,
      },
    ],
    [],
  )
  const geometries = useMemo(
    () => seams.map((seam) => createCloakSeamGeometry(seam.points, seam.radius)),
    [seams],
  )

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])

  return (
    <group name="cloak-shell-tailored-fold-language">
      {seams.map((seam, index) => (
        <mesh key={seam.name} name={seam.name} geometry={geometries[index]}>
          {index < 3 ? <CloakFabricMaterial /> : <meshBasicMaterial color={seam.color} depthTest depthWrite />}
        </mesh>
      ))}
    </group>
  )
}

export function CloakShell({ fitted = false, variant = 'red' }: CloakShellProps) {
  const bodyGeometry = useMemo(() => createCloakBodyGeometry(), [])
  const hemGeometry = useMemo(() => createCloakHemRollGeometry(), [])

  useEffect(
    () => () => {
      bodyGeometry.dispose()
      hemGeometry.dispose()
    },
    [bodyGeometry, hemGeometry],
  )

  return (
    <group name={`cloak-shell-${variant}-continuous-tailored-garment`}>
      <OutlineMesh
        name="cloak-shell-one-piece-draped-fabric-body"
        outlineWidth={fitted ? 0.042 : 0.052}
        outlineColor={CLOAK_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<CloakFabricMaterial />}
      />
      <OutlineMesh
        name={`cloak-shell-${variant}-continuous-lower-trim`}
        outlineWidth={0.012}
        outlineColor={CLOAK_INK}
        geometry={<primitive object={hemGeometry} attach="geometry" />}
        material={<CloakTrimMaterial variant={variant} />}
      />
      <CloakFoldSeams />
    </group>
  )
}

export function CloakShellOpening({ variant = 'red' }: Pick<CloakShellProps, 'variant'>) {
  const wallGeometry = useMemo(() => createCloakOpeningWallGeometry(), [])
  const faceRollGeometry = useMemo(() => createCloakFaceRollGeometry(), [])

  useEffect(
    () => () => {
      wallGeometry.dispose()
      faceRollGeometry.dispose()
    },
    [faceRollGeometry, wallGeometry],
  )

  return (
    <group name={`cloak-shell-${variant}-sealed-integrated-hood-opening`}>
      <mesh name="cloak-shell-deep-opaque-opening-wall" geometry={wallGeometry}>
        <meshToonMaterial color={CLOAK_DEEP} side={THREE.DoubleSide} depthTest depthWrite />
      </mesh>
      <OutlineMesh
        name={`cloak-shell-${variant}-single-unbroken-face-roll`}
        outlineWidth={0.013}
        outlineColor={CLOAK_INK}
        geometry={<primitive object={faceRollGeometry} attach="geometry" />}
        material={<CloakTrimMaterial variant={variant} />}
      />
    </group>
  )
}
