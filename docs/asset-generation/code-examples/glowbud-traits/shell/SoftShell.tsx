import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { OutlineMesh } from '../../../../../src/render/OutlineMesh'

export const SOFT_SHELL_SHADOW = '#315b70'

export const SOFT_SHELL_BASE = '#67b9ca'
export const SOFT_SHELL_MID = '#79cddb'
export const SOFT_SHELL_LIGHT = '#c9f6f1'
const SOFT_SHELL_INK = '#173545'
const SOFT_SHELL_FIBER_DARK = '#347f94'
const SOFT_SHELL_FIBER = '#69bcc8'
const SOFT_SHELL_FIBER_LIGHT = '#ade6e2'

const SOFT_SHELL_FIBER_COUNT = 7200
const SOFT_SHELL_GUARD_FIBER_RATIO = 0.45
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

type SoftShellAnimation = 'idle' | 'hop' | 'grumble'

type SoftShellProps = {
  fitted?: boolean
  activity?: number
  animation?: SoftShellAnimation
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createSoftShellSurfaceGeometry() {
  const geometry = new THREE.SphereGeometry(1, 30, 18, 0, Math.PI * 2, 0.55, Math.PI - 0.55)
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
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0, -0.035, -0.08),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.035)),
      new THREE.Vector3(0.815, 0.735, 0.64),
    ),
  )
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createSegmentedFiberGeometry() {
  const segments = 8
  const positions: number[] = []
  const indices: number[] = []

  for (let ribbon = 0; ribbon < 2; ribbon += 1) {
    const angle = ribbon * Math.PI * 0.5
    const axisX = Math.cos(angle)
    const axisZ = Math.sin(angle)
    const baseIndex = positions.length / 3

    for (let segment = 0; segment <= segments; segment += 1) {
      const t = segment / segments
      positions.push(-axisX, t, -axisZ, axisX, t, axisZ)
    }

    for (let segment = 0; segment < segments; segment += 1) {
      const row = baseIndex + segment * 2
      indices.push(row, row + 2, row + 1, row + 2, row + 3, row + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

function createSoftFurGeometry(surfaceGeometry: THREE.BufferGeometry) {
  const random = mulberry32(0x50f7f00d)
  const samplingMesh = new THREE.Mesh(surfaceGeometry)
  const sampler = new MeshSurfaceSampler(samplingMesh) as MeshSurfaceSampler & {
    setRandomGenerator: (randomFunction: () => number) => MeshSurfaceSampler
  }
  sampler.setRandomGenerator(random).build()
  const fiber = createSegmentedFiberGeometry()
  const geometry = new THREE.InstancedBufferGeometry()

  geometry.index = fiber.index
  geometry.setAttribute('position', fiber.getAttribute('position'))

  const roots = new Float32Array(SOFT_SHELL_FIBER_COUNT * 3)
  const normals = new Float32Array(SOFT_SHELL_FIBER_COUNT * 3)
  const tangents = new Float32Array(SOFT_SHELL_FIBER_COUNT * 3)
  const lengths = new Float32Array(SOFT_SHELL_FIBER_COUNT)
  const widths = new Float32Array(SOFT_SHELL_FIBER_COUNT)
  const phases = new Float32Array(SOFT_SHELL_FIBER_COUNT)
  const shades = new Float32Array(SOFT_SHELL_FIBER_COUNT)
  const stiffness = new Float32Array(SOFT_SHELL_FIBER_COUNT)
  const layers = new Float32Array(SOFT_SHELL_FIBER_COUNT)

  const root = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const reference = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()

  for (let index = 0; index < SOFT_SHELL_FIBER_COUNT; index += 1) {
    sampler.sample(root, normal)
    normal.normalize()

    reference.set(0, 1, 0)
    if (Math.abs(normal.y) > 0.88) reference.set(1, 0, 0)
    tangent.crossVectors(reference, normal).normalize()
    const groomAngle =
      Math.sin(root.x * 7.3 + root.y * 4.1 - root.z * 2.8) * 1.1
      + Math.cos(root.z * 8.2 + root.x * 3.4) * 0.72
      + (index * GOLDEN_ANGLE % 0.18)
      + (random() - 0.5) * 0.48
    quaternion.setFromAxisAngle(normal, groomAngle)
    tangent.applyQuaternion(quaternion).normalize()

    const isGuardFiber = random() < SOFT_SHELL_GUARD_FIBER_RATIO
    const frontAperture = root.z < -0.28
      ? Math.hypot(root.x / 0.51, (root.y + 0.015) / 0.39)
      : 3
    const rimTuck = THREE.MathUtils.smoothstep(frontAperture, 0.92, 1.35)
    const undersideTuck = THREE.MathUtils.lerp(0.58, 1, THREE.MathUtils.smoothstep(root.y, -0.58, -0.25))
    const tuftRhythm = 0.93 + Math.sin(root.x * 9.2 - root.y * 5.7 + root.z * 7.4) * 0.08
    const baseLength = isGuardFiber
      ? THREE.MathUtils.lerp(0.135, 0.215, Math.pow(random(), 0.68)) * tuftRhythm
      : THREE.MathUtils.lerp(0.072, 0.122, Math.pow(random(), 0.82)) * (0.97 + (tuftRhythm - 0.93) * 0.42)
    const length = baseLength * THREE.MathUtils.lerp(0.58, 1, rimTuck) * undersideTuck
    const width = isGuardFiber
      ? THREE.MathUtils.lerp(0.0052, 0.009, Math.pow(random(), 1.55))
      : THREE.MathUtils.lerp(0.0042, 0.0068, Math.pow(random(), 1.9))

    root.addScaledVector(normal, -0.0065)
    roots.set([root.x, root.y, root.z], index * 3)
    normals.set([normal.x, normal.y, normal.z], index * 3)
    tangents.set([tangent.x, tangent.y, tangent.z], index * 3)
    lengths[index] = length
    widths[index] = width
    phases[index] = random()
    shades[index] = random()
    stiffness[index] = isGuardFiber
      ? THREE.MathUtils.lerp(0.66, 1.12, random())
      : THREE.MathUtils.lerp(0.96, 1.34, random())
    layers[index] = isGuardFiber ? 1 : 0
  }

  geometry.setAttribute('aRoot', new THREE.InstancedBufferAttribute(roots, 3))
  geometry.setAttribute('aNormal', new THREE.InstancedBufferAttribute(normals, 3))
  geometry.setAttribute('aTangent', new THREE.InstancedBufferAttribute(tangents, 3))
  geometry.setAttribute('aLength', new THREE.InstancedBufferAttribute(lengths, 1))
  geometry.setAttribute('aWidth', new THREE.InstancedBufferAttribute(widths, 1))
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
  geometry.setAttribute('aShade', new THREE.InstancedBufferAttribute(shades, 1))
  geometry.setAttribute('aStiffness', new THREE.InstancedBufferAttribute(stiffness, 1))
  geometry.setAttribute('aLayer', new THREE.InstancedBufferAttribute(layers, 1))
  geometry.instanceCount = SOFT_SHELL_FIBER_COUNT
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.035, -0.08), 1.35)
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-1.08, -1.0, -0.98),
    new THREE.Vector3(1.08, 0.98, 0.9),
  )
  fiber.dispose()
  return geometry
}

const FUR_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aRoot;
  attribute vec3 aNormal;
  attribute vec3 aTangent;
  attribute float aLength;
  attribute float aWidth;
  attribute float aPhase;
  attribute float aShade;
  attribute float aStiffness;
  attribute float aLayer;

  uniform float uTime;
  uniform float uActivity;
  uniform vec3 uForce;

  varying float vAcross;
  varying float vShade;
  varying float vTip;
  varying float vLayer;
  varying vec3 vFurNormal;

  void main() {
    float t = position.y;
    float tipWeight = t * t * (3.0 - 2.0 * t);
    float fineTipWeight = tipWeight * t;
    float taper = mix(1.0, 0.055, pow(t, 0.82));
    vec3 normal = normalize(aNormal);
    vec3 tangent = normalize(aTangent - normal * dot(aTangent, normal));
    vec3 bitangent = normalize(cross(normal, tangent));
    vec3 ribbonDirection = tangent * position.x + bitangent * position.z;
    vec3 ribbonOffset = ribbonDirection * aWidth * taper;

    vec3 gravity = vec3(0.0, -1.0, 0.0);
    vec3 surfaceDroop = gravity - normal * dot(gravity, normal);
    float droopAmount = mix(0.64, 0.92, 1.0 - aStiffness * 0.34) * mix(0.56, 1.0, aLayer);
    vec3 authoredComb = tangent * aLength * (0.56 + sin(aPhase * 18.8496) * 0.16);
    authoredComb += bitangent * aLength * sin(aPhase * 31.4159) * 0.11;
    vec3 droop = surfaceDroop * aLength * droopAmount;
    vec3 softWave = bitangent
      * sin(t * 3.14159 + aPhase * 6.28318)
      * aLength
      * 0.075
      * tipWeight;

    float breezeA = sin(uTime * 1.45 + aPhase * 18.8496 + dot(aRoot, vec3(4.2, 7.1, 3.7)));
    float breezeB = sin(uTime * 2.13 + aPhase * 9.4248 - dot(aRoot, vec3(2.7, 3.4, 6.2)));
    vec3 microMotion = (tangent * breezeA + bitangent * breezeB * 0.58)
      * (0.0045 + aLength * 0.025)
      * uActivity
      * mix(0.48, 1.0, aLayer)
      / max(0.58, aStiffness);

    float lengthResponse = smoothstep(0.055, 0.215, aLength);
    float springResponse = mix(0.4, 1.0, aLayer) * mix(0.52, 1.08, lengthResponse);

    vec3 center = aRoot
      + normal * (t * aLength * (1.0 - tipWeight * 0.42))
      + (droop + authoredComb) * tipWeight
      + softWave
      + uForce * fineTipWeight * springResponse / max(0.56, aStiffness)
      + microMotion * fineTipWeight;

    vec3 animatedNormal = normalize(normal + ribbonDirection * 0.28 - droop * tipWeight * 0.7 + uForce * fineTipWeight * 1.6);
    vAcross = position.x + position.z;
    vShade = aShade;
    vTip = t;
    vLayer = aLayer;
    vFurNormal = normalize(normalMatrix * animatedNormal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(center + ribbonOffset, 1.0);
  }
`

const FUR_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uShadowColor;
  uniform vec3 uDarkColor;
  uniform vec3 uMidColor;
  uniform vec3 uLightColor;

  varying float vAcross;
  varying float vShade;
  varying float vTip;
  varying float vLayer;
  varying vec3 vFurNormal;

  void main() {
    vec3 lightDirection = normalize(vec3(-0.38, 0.78, 0.5));
    float lightAmount = dot(normalize(vFurNormal), lightDirection) * 0.5 + 0.5;
    vec3 furColor = uMidColor;
    furColor = mix(uDarkColor, furColor, step(0.32, lightAmount));
    furColor = mix(furColor, uLightColor, step(0.69, lightAmount));
    furColor = mix(furColor, uLightColor, smoothstep(0.78, 0.98, vShade) * 0.28);
    furColor = mix(furColor, uDarkColor, (1.0 - smoothstep(0.0, 0.22, vTip)) * 0.34);
    furColor = mix(furColor, uDarkColor, (1.0 - vLayer) * 0.11);

    float edge = smoothstep(0.72, 1.0, abs(vAcross));
    float shaftCenter = 1.0 - smoothstep(0.08, 0.88, abs(vAcross));
    float shaftBody = smoothstep(0.12, 0.38, vTip) * (1.0 - smoothstep(0.82, 1.0, vTip));
    furColor = mix(furColor, uLightColor, shaftCenter * shaftBody * mix(0.075, 0.14, vLayer));
    furColor = mix(furColor, uShadowColor, edge * 0.13);
    gl_FragColor = vec4(furColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function createSoftFurMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uActivity: { value: 1 },
      uForce: { value: new THREE.Vector3() },
      uShadowColor: { value: new THREE.Color(SOFT_SHELL_SHADOW) },
      uDarkColor: { value: new THREE.Color(SOFT_SHELL_FIBER_DARK) },
      uMidColor: { value: new THREE.Color(SOFT_SHELL_FIBER) },
      uLightColor: { value: new THREE.Color(SOFT_SHELL_FIBER_LIGHT) },
    },
    vertexShader: FUR_VERTEX_SHADER,
    fragmentShader: FUR_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    transparent: false,
    dithering: true,
  })
}

function SoftFurField({
  surfaceGeometry,
  activity,
  animation,
}: {
  surfaceGeometry: THREE.BufferGeometry
  activity: number
  animation: SoftShellAnimation
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const initialized = useRef(false)
  const previousPosition = useRef(new THREE.Vector3())
  const previousVelocity = useRef(new THREE.Vector3())
  const springForce = useRef(new THREE.Vector3())
  const springVelocity = useRef(new THREE.Vector3())
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  const worldVelocity = useMemo(() => new THREE.Vector3(), [])
  const targetForce = useMemo(() => new THREE.Vector3(), [])
  const springDelta = useMemo(() => new THREE.Vector3(), [])
  const furGeometry = useMemo(() => createSoftFurGeometry(surfaceGeometry), [surfaceGeometry])
  const furMaterial = useMemo(() => createSoftFurMaterial(), [])

  useEffect(() => {
    return () => {
      furGeometry.dispose()
      furMaterial.dispose()
    }
  }, [furGeometry, furMaterial])

  useFrame(({ clock }, frameDelta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const delta = Math.min(frameDelta, 1 / 24)
    const time = clock.elapsedTime
    const motion = THREE.MathUtils.clamp(activity, 0, 1)
    mesh.getWorldPosition(worldPosition)

    if (!initialized.current) {
      previousPosition.current.copy(worldPosition)
      previousVelocity.current.set(0, 0, 0)
      initialized.current = true
    }

    worldVelocity.copy(worldPosition).sub(previousPosition.current).divideScalar(Math.max(delta, 0.001))
    targetForce.copy(worldVelocity).sub(previousVelocity.current).divideScalar(Math.max(delta, 0.001)).multiplyScalar(-0.0026)
    targetForce.clampLength(0, animation === 'hop' ? 0.105 : 0.075)
    targetForce.x += Math.sin(time * 0.73) * 0.013 * motion
    targetForce.y += Math.sin(time * 1.07 + 1.4) * 0.0045 * motion
    targetForce.z += Math.cos(time * 0.61 + 0.7) * 0.011 * motion
    if (animation === 'grumble') targetForce.x += Math.sin(time * 18.5) * 0.018 * motion

    springDelta.copy(targetForce).sub(springForce.current)
    springVelocity.current.addScaledVector(springDelta, 18 * delta)
    springVelocity.current.multiplyScalar(Math.exp(-7.6 * delta))
    springForce.current.addScaledVector(springVelocity.current, delta).clampLength(0, 0.12)

    furMaterial.uniforms.uTime.value = time
    furMaterial.uniforms.uActivity.value = motion
    furMaterial.uniforms.uForce.value.copy(springForce.current)
    previousPosition.current.copy(worldPosition)
    previousVelocity.current.copy(worldVelocity)
  })

  return (
    <mesh
      ref={meshRef}
      name="soft-shell-reactive-fur-field"
      geometry={furGeometry}
      material={furMaterial}
      frustumCulled={false}
      renderOrder={2}
    />
  )
}

export function SoftShell({ fitted = false, activity = 1, animation = 'idle' }: SoftShellProps) {
  const surfaceGeometry = useMemo(() => createSoftShellSurfaceGeometry(), [])

  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry])

  return (
    <group name="soft-shell-shag-coat">
      <OutlineMesh
        outlineWidth={fitted ? 0.02 : 0.028}
        outlineColor={fitted ? SOFT_SHELL_SHADOW : SOFT_SHELL_INK}
        geometry={<primitive object={surfaceGeometry} attach="geometry" />}
        material={<meshToonMaterial color={SOFT_SHELL_BASE} />}
      />
      <SoftFurField surfaceGeometry={surfaceGeometry} activity={activity} animation={animation} />
    </group>
  )
}
