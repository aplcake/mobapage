import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const LOG_SHELL_INK = '#1b100b'
export const LOG_SHELL_DEEP = '#3c1f10'
export const LOG_SHELL_SHADOW = '#593018'
export const LOG_SHELL_BASE = '#7b4723'
export const LOG_SHELL_MID = '#9d632f'
export const LOG_SHELL_LIGHT = '#c68a45'
export const LOG_SHELL_SAPWOOD = '#d9a45d'
export const LOG_SHELL_CUT_LIGHT = '#edc37b'
export const LOG_SHELL_HEARTWOOD = '#8b4c22'

type LogShellProps = {
  fitted?: boolean
}

type LogRootSpec = {
  points: [number, number, number][]
  baseRadius: number
  tipRadius: number
}

const LOG_ROOTS: LogRootSpec[] = [
  {
    points: [
      [-0.5, -0.4, 0.17],
      [-0.61, -0.56, 0.27],
      [-0.75, -0.64, 0.4],
    ],
    baseRadius: 0.085,
    tipRadius: 0.038,
  },
  {
    points: [
      [0.5, -0.42, 0.12],
      [0.61, -0.565, 0.25],
      [0.74, -0.64, 0.41],
    ],
    baseRadius: 0.079,
    tipRadius: 0.034,
  },
  {
    points: [
      [-0.17, -0.45, 0.48],
      [-0.26, -0.57, 0.59],
      [-0.39, -0.645, 0.68],
    ],
    baseRadius: 0.073,
    tipRadius: 0.031,
  },
]

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function signedPow(value: number, exponent: number) {
  return Math.sign(value) * Math.pow(Math.abs(value), exponent)
}

function triangleNoise(index: number, x: number, y: number, z: number) {
  const value = Math.sin(index * 12.9898 + x * 63.719 + y * 91.153 + z * 47.731) * 43758.5453
  return value - Math.floor(value)
}

function applyLogFacetColors(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position as THREE.BufferAttribute
  const normal = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color(LOG_SHELL_DEEP)
  const shadow = new THREE.Color(LOG_SHELL_SHADOW)
  const base = new THREE.Color(LOG_SHELL_BASE)
  const mid = new THREE.Color(LOG_SHELL_MID)
  const light = new THREE.Color(LOG_SHELL_LIGHT)
  const color = new THREE.Color()

  for (let index = 0; index < position.count; index += 3) {
    const x = (position.getX(index) + position.getX(index + 1) + position.getX(index + 2)) / 3
    const y = (position.getY(index) + position.getY(index + 1) + position.getY(index + 2)) / 3
    const z = (position.getZ(index) + position.getZ(index + 1) + position.getZ(index + 2)) / 3
    const normalY = (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3
    const noise = triangleNoise(index / 3, x, y, z)
    const angle = Math.atan2(z, x)
    const ridge = Math.sin(angle * 8.0 + y * 3.3 + Math.sin(y * 8.4) * 0.32)

    color.copy(base)
    if (normalY > 0.42) color.lerp(light, 0.34)
    if (normalY < -0.38) color.lerp(deep, 0.3)
    if (noise < 0.18) color.lerp(shadow, 0.3)
    if (noise > 0.78) color.lerp(mid, 0.28)
    if (ridge > 0.74) color.lerp(light, 0.12)
    if (ridge < -0.78) color.lerp(deep, 0.18)

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function createLogShellGeometry() {
  const source = new THREE.SphereGeometry(1, 24, 15, 0, Math.PI * 2, 0.5, Math.PI - 0.5)
  source.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, -0.025, -0.075),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.025)),
      new THREE.Vector3(0.8, 0.75, 0.66),
    ),
  )

  const position = source.attributes.position as THREE.BufferAttribute
  const center = new THREE.Vector3(0, -0.025, -0.075)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const localX = (x - center.x) / 0.8
    const localY = (y - center.y) / 0.75
    const localZ = (z - center.z) / 0.66
    const angle = Math.atan2(localZ, localX)
    const normalizedHeight = clamp01((localY + 1) * 0.5)
    const lowerWeight = smoothstep01((-localY - 0.22) / 0.68)
    const crownWeight = smoothstep01((localY - 0.28) / 0.62)
    const taper = THREE.MathUtils.lerp(1.06, 0.91, normalizedHeight)
    const trunkFluting =
      Math.sin(angle * 8.0 + localY * 1.9) * 0.042
      + Math.sin(angle * 4.0 - localY * 3.1 + 0.7) * 0.018
      + Math.cos(angle * 13.0 + localY * 2.2) * 0.008
    const broadBend = Math.sin(localY * 2.1 + angle * 0.55) * 0.012
    const rearFullness = localZ > 0 ? 1.055 : 1
    const faceTuck = localZ < -0.42 ? 0.982 : 1
    const potSaddle = Math.exp(-(localX ** 2) / 0.11 - ((localZ + 0.01) ** 2) / 0.12) * crownWeight

    const mappedX = signedPow(localX, 0.7)
    const mappedY = signedPow(localY, 0.72)
    const mappedZ = signedPow(localZ, 0.82)
    const radialMass = 1 + trunkFluting + broadBend
    let nextX = center.x + mappedX * 0.715 * taper * radialMass
    let nextY = center.y + mappedY * 0.72 - potSaddle * 0.042
    let nextZ = center.z + mappedZ * 0.605 * taper * radialMass * rearFullness * faceTuck

    nextX += Math.sin(localY * 2.8 + 0.3) * 0.012 * (1 - Math.abs(localX) * 0.35)
    nextZ += Math.cos(localY * 2.25 - 0.4) * 0.01

    if (nextY > 0.56) {
      const settle = smoothstep01((nextY - 0.56) / 0.14)
      const cutHeight = 0.623 + Math.sin(angle * 5.0 + 0.4) * 0.009 + Math.cos(angle * 9.0) * 0.004
      nextY = THREE.MathUtils.lerp(nextY, cutHeight - potSaddle * 0.018, settle * 0.92)
    }

    if (nextY < -0.5) {
      const settle = smoothstep01((-nextY - 0.5) / 0.16)
      nextY = THREE.MathUtils.lerp(nextY, -0.598 + Math.sin(angle * 6.0) * 0.006, settle * 0.84)
      nextX *= 1 + settle * 0.045 + lowerWeight * 0.015
      nextZ *= 1 + settle * 0.035
    }

    position.setXYZ(index, nextX, nextY, nextZ)
  }

  position.needsUpdate = true
  const geometry = source.toNonIndexed()
  source.dispose()
  geometry.computeVertexNormals()
  applyLogFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createLogTopCutGeometry() {
  const source = new THREE.CircleGeometry(1, 40)
  source.rotateX(-Math.PI / 2)
  const position = source.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const radius = Math.hypot(x, z)
    const irregular = 1 + Math.sin(angle * 5 + 0.35) * 0.025 + Math.cos(angle * 9 - 0.2) * 0.012
    const shallowDish = (1 - clamp01(radius)) * 0.007

    position.setXYZ(
      index,
      x * 0.6 * irregular + Math.sin(angle * 2) * 0.006,
      0.619 - shallowDish,
      z * 0.44 * irregular + Math.cos(angle * 3) * 0.005,
    )
  }

  position.needsUpdate = true
  const geometry = source.toNonIndexed()
  source.dispose()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createLogTopUndersideGeometry() {
  const source = new THREE.CylinderGeometry(1, 0.96, 0.05, 40, 1, false)
  const position = source.attributes.position as THREE.BufferAttribute

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const irregular = 1 + Math.sin(angle * 5 + 0.35) * 0.025 + Math.cos(angle * 9 - 0.2) * 0.012

    position.setXYZ(
      index,
      x * 0.47 * irregular,
      0.575 + y,
      z * 0.32 * irregular,
    )
  }

  position.needsUpdate = true
  const geometry = source.toNonIndexed()
  source.dispose()
  geometry.computeVertexNormals()
  applyLogFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createLogOpeningGeometry(layer: 'bark' | 'sapwood') {
  const segments = 44
  const tubeSegments = 8
  const vertices: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const lower = Math.max(0, -sinAngle)
    const upper = Math.max(0, sinAngle)
    const side = Math.max(0, Math.abs(cosAngle) - 0.18)
    const barkLayer = layer === 'bark'
    const centerX = barkLayer ? 0.452 + side * 0.028 : 0.397 + side * 0.014
    const centerY = barkLayer ? 0.329 + lower * 0.018 : 0.287 + lower * 0.012
    const centerZ = barkLayer ? -0.704 + side * 0.022 : -0.744 + side * 0.012
    const radialRadius = barkLayer ? 0.078 + lower * 0.008 + side * 0.008 : 0.04 + lower * 0.005
    const depthRadius = barkLayer ? 0.048 + side * 0.008 : 0.028 + side * 0.004
    const irregular = barkLayer
      ? 1 + Math.sin(angle * 6 + 0.4) * 0.018 + Math.cos(angle * 11 - 0.2) * 0.008
      : 1 + Math.sin(angle * 5 - 0.1) * 0.009

    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const tubeAngle = (tube / tubeSegments) * Math.PI * 2
      const tubeRadial = Math.cos(tubeAngle)
      const tubeDepth = Math.sin(tubeAngle)
      const shellMelt = Math.max(0, tubeRadial) * (barkLayer ? 0.084 + side * 0.038 : 0.048)
      const faceRoll = Math.max(0, -tubeRadial) * (barkLayer ? 0.016 : 0.01)

      vertices.push(
        0.024 + cosAngle * (centerX + tubeRadial * radialRadius) * irregular,
        -0.034 + sinAngle * (centerY + tubeRadial * radialRadius) * irregular - lower * 0.025 - upper * 0.004,
        centerZ + tubeDepth * depthRadius + shellMelt - faceRoll,
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

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  if (layer === 'bark') applyLogFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createTaperedRootGeometry(spec: LogRootSpec) {
  const curve = new THREE.CatmullRomCurve3(spec.points.map((point) => new THREE.Vector3(...point)))
  const tubularSegments = 10
  const radialSegments = 7
  const frames = curve.computeFrenetFrames(tubularSegments, false)
  const vertices: number[] = []
  const indices: number[] = []
  const point = new THREE.Vector3()
  const offset = new THREE.Vector3()

  for (let segment = 0; segment <= tubularSegments; segment += 1) {
    const t = segment / tubularSegments
    curve.getPointAt(t, point)
    const radius = THREE.MathUtils.lerp(spec.baseRadius, spec.tipRadius, Math.pow(t, 0.82))

    for (let radial = 0; radial <= radialSegments; radial += 1) {
      const angle = (radial / radialSegments) * Math.PI * 2
      offset
        .copy(frames.normals[segment])
        .multiplyScalar(Math.cos(angle) * radius)
        .addScaledVector(frames.binormals[segment], Math.sin(angle) * radius)
      vertices.push(point.x + offset.x, point.y + offset.y, point.z + offset.z)
    }
  }

  for (let segment = 0; segment < tubularSegments; segment += 1) {
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const row = radialSegments + 1
      const base = segment * row + radial
      indices.push(base, base + row, base + 1)
      indices.push(base + 1, base + row, base + row + 1)
    }
  }

  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  applyLogFacetColors(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

const LOG_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;

  varying vec3 vFacetColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vFacetColor = color;
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const LOG_BARK_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uDeepColor;
  uniform vec3 uShadowColor;
  uniform vec3 uLightColor;
  uniform vec3 uHeartwoodColor;

  varying vec3 vFacetColor;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  float knotRing(float distanceToCenter, float radius, float width) {
    return 1.0 - smoothstep(width, width * 2.0, abs(distanceToCenter - radius));
  }

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.48));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.62, 0.82, step(0.28, lightAmount));
    lightBand = mix(lightBand, 1.05, step(0.69, lightAmount));

    float barkAngle = atan(vLocalPosition.z, vLocalPosition.x);
    float coarseWarp = sin(vLocalPosition.y * 5.4 + barkAngle * 2.0) * 0.46;
    coarseWarp += sin(vLocalPosition.y * 13.8 - barkAngle * 3.0) * 0.13;
    float ridgeSignal = abs(sin(barkAngle * 8.0 + coarseWarp));
    float fissure = smoothstep(0.84, 0.985, ridgeSignal);
    float ridgeLight = 1.0 - smoothstep(0.0, 0.26, ridgeSignal);

    float longGrain = sin(barkAngle * 23.0 + vLocalPosition.y * 3.8 + sin(vLocalPosition.y * 18.0) * 0.42);
    float longGrainBand = step(0.62, longGrain) * 0.055 - step(0.7, -longGrain) * 0.04;
    float barkPlate = sin(vLocalPosition.y * 21.0 + sin(barkAngle * 5.0) * 1.2);
    float plateShadow = step(0.78, barkPlate * sin(barkAngle * 15.0 - vLocalPosition.y * 4.0)) * 0.12;

    float backGate = smoothstep(0.28, 0.5, vLocalPosition.z);
    float backKnotDistance = length(vec2((vLocalPosition.x + 0.24) * 1.05, vLocalPosition.y - 0.08));
    float backKnotRing = knotRing(backKnotDistance, 0.125, 0.018) * backGate;
    float backKnotCore = (1.0 - smoothstep(0.0, 0.067, backKnotDistance)) * backGate;

    float rightGate = smoothstep(0.36, 0.58, vLocalPosition.x);
    float rightKnotDistance = length(vec2((vLocalPosition.z - 0.08) * 1.16, vLocalPosition.y + 0.18));
    float rightKnotRing = knotRing(rightKnotDistance, 0.105, 0.016) * rightGate;
    float rightKnotCore = (1.0 - smoothstep(0.0, 0.052, rightKnotDistance)) * rightGate;

    float leftGate = smoothstep(0.36, 0.58, -vLocalPosition.x);
    float leftKnotDistance = length(vec2((vLocalPosition.z - 0.2) * 1.12, vLocalPosition.y - 0.27));
    float leftKnotRing = knotRing(leftKnotDistance, 0.086, 0.014) * leftGate;
    float leftKnotCore = (1.0 - smoothstep(0.0, 0.043, leftKnotDistance)) * leftGate;

    float knotRingAmount = max(backKnotRing, max(rightKnotRing, leftKnotRing));
    float knotCoreAmount = max(backKnotCore, max(rightKnotCore, leftKnotCore));

    vec3 barkColor = vFacetColor * (lightBand + longGrainBand + ridgeLight * 0.07);
    barkColor = mix(barkColor, uShadowColor * lightBand, plateShadow);
    barkColor = mix(barkColor, uDeepColor * mix(0.72, 1.0, lightAmount), fissure * 0.72);
    barkColor = mix(barkColor, uLightColor * lightBand, ridgeLight * 0.1);
    barkColor = mix(barkColor, uHeartwoodColor * lightBand, knotRingAmount * 0.82);
    barkColor = mix(barkColor, uDeepColor, knotCoreAmount * 0.9);

    gl_FragColor = vec4(barkColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const LOG_CUT_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const LOG_CUT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSapwoodColor;
  uniform vec3 uCutLightColor;
  uniform vec3 uHeartwoodColor;
  uniform vec3 uDeepColor;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.48));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.68, 0.86, step(0.28, lightAmount));
    lightBand = mix(lightBand, 1.04, step(0.7, lightAmount));

    vec2 cutPoint = vec2(vLocalPosition.x / 0.6, vLocalPosition.z / 0.44);
    float cutRadius = length(cutPoint);
    float cutAngle = atan(cutPoint.y, cutPoint.x);
    float ringWarp = sin(cutAngle * 5.0 + 0.3) * 0.022 + sin(cutAngle * 9.0 + cutRadius * 12.0) * 0.009;
    float ringSignal = abs(sin((cutRadius + ringWarp) * 54.0));
    float darkRing = smoothstep(0.72, 0.95, ringSignal);
    float lightRing = 1.0 - smoothstep(0.0, 0.27, ringSignal);
    float heartwood = 1.0 - smoothstep(0.22, 0.58, cutRadius + sin(cutAngle * 3.0) * 0.022);
    float pith = 1.0 - smoothstep(0.015, 0.07, cutRadius);
    float crackA = (1.0 - smoothstep(0.0, 0.022, abs(sin(cutAngle - 0.72)))) * step(0.0, cos(cutAngle - 0.72));
    float crackB = (1.0 - smoothstep(0.0, 0.018, abs(sin(cutAngle + 2.08)))) * step(0.0, cos(cutAngle + 2.08));
    float radialCrack = max(crackA, crackB) * smoothstep(0.38, 0.92, cutRadius);

    vec3 cutColor = mix(uSapwoodColor, uCutLightColor, lightRing * 0.34);
    cutColor = mix(cutColor, uHeartwoodColor, heartwood * 0.7);
    cutColor = mix(cutColor, uDeepColor, darkRing * 0.14 + radialCrack * 0.72 + pith * 0.72);
    cutColor *= lightBand;

    gl_FragColor = vec4(cutColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const LOG_SAPWOOD_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uSapwoodColor;
  uniform vec3 uCutLightColor;
  uniform vec3 uHeartwoodColor;
  uniform vec3 uDeepColor;

  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.42, 0.78, 0.48));
    float lightAmount = dot(normalize(vViewNormal), lightDirection) * 0.5 + 0.5;
    float lightBand = mix(0.68, 0.86, step(0.28, lightAmount));
    lightBand = mix(lightBand, 1.04, step(0.7, lightAmount));

    float grain = sin(vLocalPosition.y * 34.0 + sin(vLocalPosition.x * 15.0) * 1.2 + vLocalPosition.x * 4.0);
    float grainBand = smoothstep(0.62, 0.92, grain);
    float pore = step(0.88, sin(vLocalPosition.x * 71.0 + vLocalPosition.y * 53.0) * sin(vLocalPosition.y * 37.0));
    vec3 sapColor = mix(uSapwoodColor, uCutLightColor, grainBand * 0.28);
    sapColor = mix(sapColor, uHeartwoodColor, pore * 0.2);
    sapColor = mix(sapColor, uDeepColor, step(0.82, -grain) * 0.09);
    sapColor *= lightBand;

    gl_FragColor = vec4(sapColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function LogBarkMaterial() {
  const uniforms = useMemo(
    () => ({
      uDeepColor: { value: new THREE.Color(LOG_SHELL_DEEP) },
      uShadowColor: { value: new THREE.Color(LOG_SHELL_SHADOW) },
      uLightColor: { value: new THREE.Color(LOG_SHELL_LIGHT) },
      uHeartwoodColor: { value: new THREE.Color(LOG_SHELL_HEARTWOOD) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={LOG_VERTEX_SHADER}
      fragmentShader={LOG_BARK_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function LogCutMaterial() {
  const uniforms = useMemo(
    () => ({
      uSapwoodColor: { value: new THREE.Color(LOG_SHELL_SAPWOOD) },
      uCutLightColor: { value: new THREE.Color(LOG_SHELL_CUT_LIGHT) },
      uHeartwoodColor: { value: new THREE.Color(LOG_SHELL_HEARTWOOD) },
      uDeepColor: { value: new THREE.Color(LOG_SHELL_DEEP) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={LOG_CUT_VERTEX_SHADER}
      fragmentShader={LOG_CUT_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function LogSapwoodMaterial() {
  const uniforms = useMemo(
    () => ({
      uSapwoodColor: { value: new THREE.Color(LOG_SHELL_SAPWOOD) },
      uCutLightColor: { value: new THREE.Color(LOG_SHELL_CUT_LIGHT) },
      uHeartwoodColor: { value: new THREE.Color(LOG_SHELL_HEARTWOOD) },
      uDeepColor: { value: new THREE.Color(LOG_SHELL_DEEP) },
    }),
    [],
  )

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={LOG_CUT_VERTEX_SHADER}
      fragmentShader={LOG_SAPWOOD_FRAGMENT_SHADER}
      side={THREE.FrontSide}
      depthTest
      depthWrite
      dithering
    />
  )
}

function LogRoot({ spec, index }: { spec: LogRootSpec; index: number }) {
  const geometry = useMemo(() => createTaperedRootGeometry(spec), [spec])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <OutlineMesh
      name={`log-shell-root-${index}`}
      outlineWidth={0.0045}
      outlineColor={LOG_SHELL_INK}
      geometry={<primitive object={geometry} attach="geometry" />}
      material={<meshToonMaterial color={LOG_SHELL_SHADOW} />}
    />
  )
}

export function LogShell({ fitted = false }: LogShellProps) {
  const bodyGeometry = useMemo(() => createLogShellGeometry(), [])
  const topCutGeometry = useMemo(() => createLogTopCutGeometry(), [])
  const topUndersideGeometry = useMemo(() => createLogTopUndersideGeometry(), [])

  useEffect(
    () => () => {
      bodyGeometry.dispose()
      topCutGeometry.dispose()
      topUndersideGeometry.dispose()
    },
    [bodyGeometry, topCutGeometry, topUndersideGeometry],
  )

  return (
    <group name="log-shell-upright-hollow-stump">
      <OutlineMesh
        name="log-shell-body"
        outlineWidth={fitted ? 0.044 : 0.054}
        outlineColor={LOG_SHELL_INK}
        geometry={<primitive object={bodyGeometry} attach="geometry" />}
        material={<LogBarkMaterial />}
      />
      <group name="log-shell-integrated-growth-ring-crown">
        <mesh name="log-shell-top-closed-bark-underside">
          <primitive object={topUndersideGeometry} attach="geometry" />
          <LogBarkMaterial />
        </mesh>
        <mesh
          name="log-shell-top-cut"
        >
          <primitive object={topCutGeometry} attach="geometry" />
          <LogCutMaterial />
        </mesh>
      </group>
      <group name="log-shell-root-buttresses">
        {LOG_ROOTS.map((spec, index) => (
          <LogRoot key={`log-shell-root-${index}`} spec={spec} index={index} />
        ))}
      </group>
    </group>
  )
}

export function LogShellOpeningLip() {
  const barkGeometry = useMemo(() => createLogOpeningGeometry('bark'), [])
  const sapwoodGeometry = useMemo(() => createLogOpeningGeometry('sapwood'), [])

  useEffect(
    () => () => {
      barkGeometry.dispose()
      sapwoodGeometry.dispose()
    },
    [barkGeometry, sapwoodGeometry],
  )

  return (
    <group name="log-shell-carved-sapwood-opening">
      <OutlineMesh
        name="log-shell-opening-bark"
        outlineWidth={0.015}
        outlineColor={LOG_SHELL_INK}
        geometry={<primitive object={barkGeometry} attach="geometry" />}
        material={<LogBarkMaterial />}
      />
      <OutlineMesh
        name="log-shell-opening-sapwood"
        outlineWidth={0.008}
        outlineColor={LOG_SHELL_DEEP}
        geometry={<primitive object={sapwoodGeometry} attach="geometry" />}
        material={<LogSapwoodMaterial />}
      />
      <mesh position={[0.02, -0.33, -0.766]} rotation-z={0.02} scale={[0.335, 0.019, 0.012]}>
        <sphereGeometry args={[1, 9, 4]} />
        <meshBasicMaterial color={LOG_SHELL_DEEP} depthTest depthWrite />
      </mesh>
    </group>
  )
}
