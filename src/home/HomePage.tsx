'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { PsychedelicPogoOrbAsset } from '../../docs/asset-generation/code-examples/PsychedelicPogoOrbAsset.example'
import { TinyRascalCrowd } from './TinyRascalCrowd'

const INK = '#17121f'
const SOFT_INK = '#21192a'
const CREAM = '#fff0bc'
const BRASS = '#d7b34e'
const TEAL = '#2f7d88'
const MINT = '#84efe0'
const CORAL = '#f17862'
const PINK = '#ff88ce'
const AMBER = '#ffcc6f'
const TEAK = '#9f6233'
const TEAK_LIGHT = '#c88549'
const TEAK_DARK = '#4f2b1a'
const ROASTED_TEAK = '#714728'
const WALNUT = '#352015'
const ORB_STAGE_SCALE = 0.56
const DANCE_BASE_Y = -0.67
const SHOW_STAGE_CHARACTER = false
const TAU = Math.PI * 2
const DANCE_TRANSITION_SECONDS = 0.72
const HOME_ROUTE_TRANSITION_MS = 3100

type Vec3Tuple = readonly [number, number, number]
type WayfindingChoice = 'courtyard' | 'burn'
type InfoPanelControls = {
  infoOpen: boolean
  setInfoOpen: Dispatch<SetStateAction<boolean>>
}
type HomeRouteTransitionControls = {
  transitionChoice: WayfindingChoice | null
  onDestinationSelect: (choice: WayfindingChoice) => void
}
type HomeStageProps = InfoPanelControls & HomeRouteTransitionControls
type DanceMoveId = 'floss' | 'discoPoint' | 'handsUp' | 'runningMan' | 'gangnamBounce' | 'twist' | 'shuffleClap'
type DancePose = {
  bodyX: number
  bodyY: number
  bodyRotateX: number
  bodyRotateY: number
  bodyRotateZ: number
  bodyScaleX: number
  bodyScaleY: number
  bodyScaleZ: number
  leftElbow: THREE.Vector3
  leftHand: THREE.Vector3
  rightElbow: THREE.Vector3
  rightHand: THREE.Vector3
  leftKnee: THREE.Vector3
  leftFoot: THREE.Vector3
  rightKnee: THREE.Vector3
  rightFoot: THREE.Vector3
  leftHandScale: THREE.Vector3
  rightHandScale: THREE.Vector3
  leftFootScale: THREE.Vector3
  rightFootScale: THREE.Vector3
  leftFootRotateZ: number
  rightFootRotateZ: number
  sparkle: number
}

const DANCE_SEQUENCE: readonly { id: DanceMoveId; duration: number }[] = [
  { id: 'floss', duration: 4.9 },
  { id: 'discoPoint', duration: 4.45 },
  { id: 'handsUp', duration: 4.25 },
  { id: 'runningMan', duration: 4.75 },
  { id: 'gangnamBounce', duration: 5.05 },
  { id: 'twist', duration: 4.2 },
  { id: 'shuffleClap', duration: 4.4 },
]
const DANCE_SEQUENCE_DURATION = DANCE_SEQUENCE.reduce((total, move) => total + move.duration, 0)

const LEFT_SHOULDER = new THREE.Vector3(-0.78, -0.08, -0.64)
const RIGHT_SHOULDER = new THREE.Vector3(0.78, -0.08, -0.64)
const LEFT_HIP = new THREE.Vector3(-0.42, -0.78, -0.62)
const RIGHT_HIP = new THREE.Vector3(0.42, -0.78, -0.62)
const SEGMENT_Y_AXIS = new THREE.Vector3(0, 1, 0)
const DESTINATION_ROUTES: Record<WayfindingChoice, string> = {
  courtyard: '/courtyard',
  burn: '/burn-room',
}

const SPOTLIGHT_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SPOTLIGHT_FRAGMENT_SHADER = `
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
uniform float uLean;
uniform vec3 uColor;

void main() {
  float y = vUv.y;
  float centerDrift = sin(y * 5.4 + uTime * 0.12) * 0.006 + sin(y * 13.0 - uTime * 0.09) * 0.004;
  float center = 0.5 + uLean * (y - 0.45) + centerDrift;
  float taper = smoothstep(0.02, 1.0, y);
  float halfWidth = mix(0.5, 0.048, pow(taper, 0.86));
  float dist = abs(vUv.x - center);
  float radial = dist / max(halfWidth, 0.001);
  float feather = 1.0 - smoothstep(0.62, 1.05, radial);
  float core = exp(-radial * radial * 4.4);
  float hotCore = exp(-radial * radial * 10.0);
  float topFade = 1.0 - smoothstep(0.94, 1.0, y);
  float floorFade = smoothstep(0.015, 0.2, y);
  float verticalFalloff = mix(0.56, 1.0, smoothstep(0.16, 0.78, y));
  float dustA = sin(vUv.x * 38.0 + y * 23.0 + uTime * 0.2);
  float dustB = sin(vUv.x * 19.0 - y * 31.0 - uTime * 0.13);
  float dust = smoothstep(0.5, 1.0, dustA * 0.55 + dustB * 0.45) * 0.035;
  float alpha = (feather * 0.2 + core * 0.32 + hotCore * 0.08 + dust * feather) * floorFade * topFade * verticalFalloff * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`

function createSpotlightMaterial(color: string, opacity: number, lean: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uLean: { value: lean },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: SPOTLIGHT_VERTEX_SHADER,
    fragmentShader: SPOTLIGHT_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

function homeCursorInkMaterial({ opacity = 1 }: { opacity?: number } = {}) {
  return <meshBasicMaterial color={INK} transparent={opacity < 1} opacity={opacity} depthWrite={false} depthTest={false} toneMapped={false} />
}

function homeCursorFaceMaterial() {
  return <meshToonMaterial color="#ffffff" depthWrite={false} depthTest={false} />
}

function homeCursorShadeMaterial() {
  return <meshToonMaterial color="#d7d1c5" depthWrite={false} depthTest={false} />
}

function homeCursorGlowMaterial({ color = '#ffffff', opacity = 0.22 }: { color?: string; opacity?: number } = {}) {
  return <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
}

function HomeToonCursor() {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const tipGlow = useRef<THREE.Mesh>(null)
  const trailA = useRef<THREE.Mesh>(null)
  const trailB = useRef<THREE.Mesh>(null)
  const clickRing = useRef<THREE.Mesh>(null)
  const { camera, gl, pointer, size } = useThree()
  const cameraForward = useMemo(() => new THREE.Vector3(), [])
  const cameraRight = useMemo(() => new THREE.Vector3(), [])
  const cameraUp = useMemo(() => new THREE.Vector3(), [])
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const smoothedPointer = useRef(new THREE.Vector2(-0.18, -0.18))
  const previousPointer = useRef(new THREE.Vector2(-0.18, -0.18))
  const pointerVisible = useRef(0)
  const hoverAmount = useRef(0)
  const pressAmount = useRef(0)
  const clickPulse = useRef(0)
  const isPressed = useRef(false)
  const hasPointer = useRef(false)
  const cursorGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    // Local origin is the click hotspot: the visible arrow tip.
    shape.moveTo(0, 0)
    shape.lineTo(0.018, -0.292)
    shape.lineTo(0.096, -0.218)
    shape.lineTo(0.152, -0.354)
    shape.lineTo(0.226, -0.324)
    shape.lineTo(0.17, -0.188)
    shape.lineTo(0.292, -0.188)
    shape.lineTo(0, 0)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.068,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.011,
      bevelSegments: 4,
    })
    geometry.translate(0, 0, -0.034)
    geometry.computeVertexNormals()
    return geometry
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    const showCursor = () => {
      hasPointer.current = true
      pointerVisible.current = Math.max(pointerVisible.current, 0.45)
      canvas.style.cursor = 'none'
    }
    const hideCursor = () => {
      hasPointer.current = false
      isPressed.current = false
    }
    const pressCursor = () => {
      isPressed.current = true
      clickPulse.current = 1
    }
    const releaseCursor = () => {
      isPressed.current = false
      clickPulse.current = Math.max(clickPulse.current, 0.82)
    }

    canvas.style.cursor = 'none'
    canvas.addEventListener('pointerenter', showCursor)
    canvas.addEventListener('pointermove', showCursor)
    canvas.addEventListener('pointerleave', hideCursor)
    canvas.addEventListener('pointerdown', pressCursor)
    window.addEventListener('pointerup', releaseCursor)

    return () => {
      canvas.removeEventListener('pointerenter', showCursor)
      canvas.removeEventListener('pointermove', showCursor)
      canvas.removeEventListener('pointerleave', hideCursor)
      canvas.removeEventListener('pointerdown', pressCursor)
      window.removeEventListener('pointerup', releaseCursor)
      canvas.style.cursor = ''
    }
  }, [gl])

  useEffect(() => {
    const rootNode = root.current
    if (!rootNode) return

    rootNode.traverse((object) => {
      object.frustumCulled = false
      object.raycast = () => undefined
    })
  }, [])

  useEffect(() => {
    return () => {
      cursorGeometry.dispose()
    }
  }, [cursorGeometry])

  useFrame(({ clock }, dt) => {
    const rootNode = root.current
    const bodyNode = body.current
    if (!rootNode || !bodyNode) return

    gl.domElement.style.cursor = 'none'

    const follow = 1 - Math.exp(-22 * dt)
    previousPointer.current.copy(smoothedPointer.current)
    smoothedPointer.current.lerp(pointer, follow)
    const pointerSpeed = smoothedPointer.current.distanceTo(previousPointer.current) / Math.max(dt, 0.001)

    const hotUi =
      pointer.x < -0.68 && pointer.y > 0.62
      || Math.abs(pointer.x) > 0.48 && pointer.y < 0.26
      || pointer.y < -0.48
    hoverAmount.current += ((hotUi ? 1 : 0) - hoverAmount.current) * (1 - Math.exp(-12 * dt))
    pressAmount.current += ((isPressed.current ? 1 : 0) - pressAmount.current) * (1 - Math.exp(-28 * dt))
    clickPulse.current = Math.max(0, clickPulse.current - dt * 2.9)
    pointerVisible.current += ((hasPointer.current ? 1 : 0) - pointerVisible.current) * (1 - Math.exp(-10 * dt))

    const cameraDistance = size.width < 620 ? 3.45 : 4.35
    const perspectiveCamera = camera as THREE.PerspectiveCamera
    const fov = perspectiveCamera.isPerspectiveCamera ? THREE.MathUtils.degToRad(perspectiveCamera.fov) : 0.72
    const viewHeight = 2 * Math.tan(fov / 2) * cameraDistance
    const viewWidth = viewHeight * (size.width / size.height)
    camera.getWorldDirection(cameraForward).normalize()
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
    targetPosition.copy(camera.position)
      .addScaledVector(cameraForward, cameraDistance)
      .addScaledVector(cameraRight, viewWidth * smoothedPointer.current.x * 0.5)
      .addScaledVector(cameraUp, viewHeight * smoothedPointer.current.y * 0.5)

    rootNode.visible = pointerVisible.current > 0.025
    rootNode.position.copy(targetPosition)
    rootNode.quaternion.copy(camera.quaternion)
    rootNode.scale.setScalar(size.width < 620 ? 0.3 : 0.37)

    const t = clock.elapsedTime
    const clickBounce = clickPulse.current > 0 ? Math.sin((1 - clickPulse.current) * Math.PI) * clickPulse.current : 0
    const hover = hoverAmount.current
    const press = pressAmount.current
    const movementSquash = Math.min(0.1, pointerSpeed * 0.02)
    const idleWiggle = Math.sin(t * 5.6) * 0.007 + Math.sin(t * 9.3) * 0.004

    bodyNode.position.set(0, 0, 0)
    bodyNode.rotation.set(
      0,
      0,
      idleWiggle + hover * -0.026 + press * 0.042 + clickBounce * -0.055 + Math.min(0.055, pointerSpeed * 0.0035),
    )
    bodyNode.scale.set(
      1 + hover * 0.045 + clickBounce * 0.09 + movementSquash * 0.34,
      1 + hover * 0.026 - press * 0.1 - movementSquash * 0.18 + clickBounce * 0.034,
      1 + hover * 0.06 + press * 0.08 + clickBounce * 0.08,
    )

    const trailOpacity = Math.min(0.32, 0.06 + pointerSpeed * 0.045 + hover * 0.07 + clickBounce * 0.18)
    if (trailA.current) {
      trailA.current.position.set(0.108 + pointerSpeed * 0.007, -0.152, -0.055)
      trailA.current.scale.set(0.07 + pointerSpeed * 0.004, 0.032 + hover * 0.008, 1)
      const material = trailA.current.material as THREE.MeshBasicMaterial
      material.opacity = trailOpacity
    }
    if (trailB.current) {
      trailB.current.position.set(0.155 + pointerSpeed * 0.008, -0.086, -0.06)
      trailB.current.scale.set(0.05 + pointerSpeed * 0.003, 0.024 + hover * 0.006, 1)
      const material = trailB.current.material as THREE.MeshBasicMaterial
      material.opacity = trailOpacity * 0.6
    }
    if (tipGlow.current) {
      tipGlow.current.scale.setScalar(0.028 + hover * 0.018 + clickBounce * 0.056)
      const material = tipGlow.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.12 + hover * 0.16 + clickBounce * 0.32
    }
    if (clickRing.current) {
      const ringT = 1 - clickPulse.current
      clickRing.current.visible = clickPulse.current > 0.02
      clickRing.current.scale.setScalar(0.075 + ringT * 0.38)
      const material = clickRing.current.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(0, clickPulse.current * 0.5)
    }
  })

  return (
    <group ref={root} visible={false} renderOrder={100}>
      <group ref={body}>
        <mesh ref={trailA} position={[0.16, -0.18, -0.055]} rotation={[0, 0, -0.35]} renderOrder={96}>
          <circleGeometry args={[1, 28]} />
          {homeCursorGlowMaterial({ color: '#fff8ee', opacity: 0.18 })}
        </mesh>
        <mesh ref={trailB} position={[0.24, -0.1, -0.06]} rotation={[0, 0, -0.22]} renderOrder={95}>
          <circleGeometry args={[1, 24]} />
          {homeCursorGlowMaterial({ color: '#fff1bd', opacity: 0.08 })}
        </mesh>
        <mesh geometry={cursorGeometry} scale={[1.12, 1.12, 1.1]} position={[0, 0, -0.032]} renderOrder={98}>
          {homeCursorInkMaterial()}
        </mesh>
        <mesh geometry={cursorGeometry} renderOrder={101}>
          {homeCursorFaceMaterial()}
        </mesh>
        <mesh position={[0.08, -0.13, 0.08]} rotation={[0, 0, -1.02]} scale={[0.07, 0.011, 0.024]} renderOrder={104}>
          <boxGeometry args={[1, 1, 1]} />
          {homeCursorGlowMaterial({ color: '#ffffff', opacity: 0.66 })}
        </mesh>
        <mesh position={[0.157, -0.255, 0.058]} rotation={[0, 0, 0.38]} scale={[0.05, 0.01, 0.02]} renderOrder={100}>
          <boxGeometry args={[1, 1, 1]} />
          {homeCursorShadeMaterial()}
        </mesh>
        <mesh ref={tipGlow} position={[0, 0, 0.072]} renderOrder={105}>
          <circleGeometry args={[1, 28]} />
          {homeCursorGlowMaterial({ color: '#ffffff', opacity: 0.22 })}
        </mesh>
        <mesh ref={clickRing} position={[0, 0, 0.06]} renderOrder={104} visible={false}>
          <ringGeometry args={[0.68, 1, 42]} />
          {homeCursorGlowMaterial({ color: '#ffffff', opacity: 0.28 })}
        </mesh>
      </group>
    </group>
  )
}

function SpotlightBeam() {
  const broadBeamMaterial = useMemo(() => createSpotlightMaterial('#ffe8bd', 0.17, -0.012), [])
  const coreBeamMaterial = useMemo(() => createSpotlightMaterial('#fffaf0', 0.22, 0.006), [])
  const sideBloomMaterial = useMemo(() => createSpotlightMaterial('#d8e1ff', 0.038, 0.02), [])
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff2bd',
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const poolCoreMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fffdf0',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const lampGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff7d6',
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  useFrame((state) => {
    const time = state.clock.elapsedTime
    broadBeamMaterial.uniforms.uTime.value = time
    coreBeamMaterial.uniforms.uTime.value = time + 1.7
    sideBloomMaterial.uniforms.uTime.value = time + 3.4
  })

  return (
    <group position={[0, 1.12, 0.42]}>
      <mesh position={[0, 1.0, 0]} scale={[3.12, 4.72, 1]} material={broadBeamMaterial} renderOrder={-8}>
        <planeGeometry args={[1, 1, 1, 64]} />
      </mesh>
      <mesh position={[0.02, 0.96, -0.015]} scale={[1.72, 4.54, 1]} material={coreBeamMaterial} renderOrder={-7}>
        <planeGeometry args={[1, 1, 1, 64]} />
      </mesh>
      <mesh position={[0.1, 0.95, 0.04]} rotation={[0, 0, -0.012]} scale={[3.36, 4.42, 1]} material={sideBloomMaterial} renderOrder={-9}>
        <planeGeometry args={[1, 1, 1, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.71, -0.44]} scale={[1.18, 0.68, 1]} material={glowMaterial} renderOrder={-3}>
        <circleGeometry args={[1.5, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.03, -0.695, -0.44]} scale={[0.62, 0.3, 1]} material={poolCoreMaterial} renderOrder={-2}>
        <circleGeometry args={[1.25, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.69, -0.44]} scale={[1.02, 0.54, 1]} renderOrder={-2}>
        <ringGeometry args={[0.78, 1, 96]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group position={[0, 4.32, 0.04]} rotation={[0.08, 0, 0]}>
        <mesh position={[0, -0.17, -0.03]} scale={[0.82, 0.3, 1]} material={lampGlowMaterial} renderOrder={-1}>
          <circleGeometry args={[1, 72]} />
        </mesh>
        <mesh scale={[0.56, 0.16, 0.56]}>
          <cylinderGeometry args={[1, 0.86, 1, 64]} />
          <meshStandardMaterial color={CREAM} emissive="#ffeaba" emissiveIntensity={0.24} roughness={0.34} metalness={0.08} />
        </mesh>
        <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.52, 80]} />
          <meshStandardMaterial color={INK} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.34, 72]} />
          <meshBasicMaterial color="#fff8da" transparent opacity={0.72} />
        </mesh>
      </group>
    </group>
  )
}

function SpotlightCatchLights() {
  return (
    <group>
      <mesh position={[0.02, 0.6, -1.075]} scale={[0.74, 0.13, 1]} renderOrder={24}>
        <circleGeometry args={[1, 80]} />
        <meshBasicMaterial color="#fff9dc" transparent opacity={0.22} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.04, 0.38, -1.08]} rotation={[0, 0, -0.05]} scale={[1.02, 0.28, 1]} renderOrder={23}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#ffe9ab" transparent opacity={0.075} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-0.23, -0.36, -1.07]} rotation={[0, 0, 0.12]} scale={[0.34, 0.09, 1]} renderOrder={24}>
        <circleGeometry args={[1, 44]} />
        <meshBasicMaterial color="#fff3bd" transparent opacity={0.12} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.38, -0.36, -1.07]} rotation={[0, 0, -0.08]} scale={[0.3, 0.08, 1]} renderOrder={24}>
        <circleGeometry args={[1, 44]} />
        <meshBasicMaterial color="#fff3bd" transparent opacity={0.1} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function Pedestal() {
  const bolts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2
        return [Math.cos(angle) * 1.58, Math.sin(angle) * 1.58, angle] as const
      }),
    [],
  )
  const legs = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => {
        const angle = Math.PI / 4 + index * (Math.PI / 2)
        return [Math.cos(angle) * 1.32, Math.sin(angle) * 1.32, angle] as const
      }),
    [],
  )
  const terrazzoChips = useMemo(
    () =>
      [
        [-0.96, -0.28, 0.08, 0.025, -0.5, MINT],
        [-0.62, 0.42, 0.06, 0.02, 0.7, CORAL],
        [-0.22, -0.5, 0.07, 0.018, 0.35, AMBER],
        [0.22, 0.48, 0.06, 0.02, -0.2, PINK],
        [0.58, -0.42, 0.08, 0.022, 0.42, MINT],
        [0.98, 0.22, 0.055, 0.02, -0.65, CREAM],
      ] as const,
    [],
  )

  return (
    <group position={[0, -2.22, 0]}>
      <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.16, 1.42, 1]} renderOrder={-4}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#090611" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.2, 0]} scale={[1.54, 0.16, 1.54]}>
        <cylinderGeometry args={[1, 1.08, 1, 72]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.18} emissive="#5f3c09" emissiveIntensity={0.03} />
      </mesh>
      <mesh position={[0, 0.42, 0]} scale={[1.42, 0.05, 1.42]}>
        <cylinderGeometry args={[1, 1, 1, 72]} />
        <meshStandardMaterial color="#fff2b1" roughness={0.38} metalness={0.08} emissive="#ffe19a" emissiveIntensity={0.09} />
      </mesh>
      <mesh position={[0, 0.22, 0]} scale={[1.66, 0.05, 1.66]}>
        <torusGeometry args={[1, 0.042, 10, 80]} />
        <meshStandardMaterial color={INK} roughness={0.46} />
      </mesh>
      <mesh position={[0, -0.05, 0]} scale={[1.9, 0.22, 1.9]}>
        <cylinderGeometry args={[1, 0.88, 1, 72]} />
        <meshStandardMaterial color={TEAL} roughness={0.48} metalness={0.12} />
      </mesh>
      <mesh position={[0, -0.27, 0]} scale={[2.02, 0.08, 2.02]}>
        <torusGeometry args={[1, 0.052, 10, 80]} />
        <meshStandardMaterial color={INK} roughness={0.44} />
      </mesh>
      <mesh position={[0, -0.11, -1.89]} scale={[1.16, 0.13, 0.022]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={CREAM} emissive="#ffe9a1" emissiveIntensity={0.08} roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.018, -1.9]} scale={[0.7, 0.034, 0.024]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={CORAL} />
      </mesh>
      <mesh position={[0, 0.456, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
        <circleGeometry args={[1.08, 96]} />
        <meshBasicMaterial color="#fff8ce" transparent opacity={0.13} depthWrite={false} depthTest blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.06, 0.46, -0.03]} rotation={[-Math.PI / 2, 0, 0.08]} scale={[1.22, 0.76, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#fffdf1" transparent opacity={0.18} depthWrite={false} depthTest blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-0.05, 0.458, 0.04]} rotation={[-Math.PI / 2, 0, -0.12]} scale={[1.58, 0.98, 1]} renderOrder={-2}>
        <ringGeometry args={[0.62, 1, 96]} />
        <meshBasicMaterial color="#ffe39f" transparent opacity={0.1} depthWrite={false} depthTest blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-0.38, 0.462, -0.2]} rotation={[-Math.PI / 2, 0, -0.08]} scale={[0.4, 0.14, 1]} renderOrder={1}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color={INK} transparent opacity={0.24} depthWrite={false} depthTest />
      </mesh>
      <mesh position={[0.43, 0.462, -0.18]} rotation={[-Math.PI / 2, 0, 0.09]} scale={[0.4, 0.14, 1]} renderOrder={1}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color={INK} transparent opacity={0.22} depthWrite={false} depthTest />
      </mesh>
      <mesh position={[0.28, 0.461, -0.18]} rotation={[-Math.PI / 2, 0, 0.26]} scale={[0.5, 0.17, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} depthWrite={false} depthTest blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-0.42, 0.459, -0.1]} rotation={[-Math.PI / 2, 0, -0.22]} scale={[0.88, 0.34, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={MINT} transparent opacity={0.105} depthWrite={false} depthTest blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.52, 0.459, -0.16]} rotation={[-Math.PI / 2, 0, 0.18]} scale={[0.74, 0.3, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={CORAL} transparent opacity={0.09} depthWrite={false} depthTest blending={THREE.AdditiveBlending} />
      </mesh>
      {terrazzoChips.map(([x, z, sx, sz, rotation, color], index) => (
        <mesh key={`pedestal-chip-${index}`} position={[x, 0.464, z]} rotation={[-Math.PI / 2, 0, rotation]} scale={[sx, sz, 1]} renderOrder={0}>
          <circleGeometry args={[1, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.56} depthWrite={false} depthTest />
        </mesh>
      ))}
      {bolts.map(([x, z], index) => (
        <mesh key={`pedestal-bolt-${index}`} position={[x, 0.45, z]} scale={[0.034, 0.012, 0.034]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={INK} roughness={0.38} metalness={0.1} />
        </mesh>
      ))}
      {legs.map(([x, z, angle], index) => (
        <group key={`pedestal-leg-${index}`} position={[x, -0.42, z]} rotation={[0.28, angle, 0.18]}>
          <mesh scale={[0.055, 0.58, 0.055]}>
            <cylinderGeometry args={[0.68, 1, 1, 10]} />
            <meshStandardMaterial color={INK} roughness={0.44} />
          </mesh>
          <mesh position={[0, -0.36, 0]} scale={[0.1, 0.04, 0.1]}>
            <sphereGeometry args={[1, 14, 8]} />
            <meshStandardMaterial color={INK} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function WallSconce({ x, color }: { x: number; color: string }) {
  const tilt = x < 0 ? -0.04 : 0.04

  return (
    <group position={[x, 0.62, 2.7]} rotation={[0, 0, tilt]}>
      <pointLight position={[0, 0.1, 0.34]} color={color} intensity={0.58} distance={3.35} decay={1.62} />
      <pointLight position={[0, -0.54, 0.24]} color="#ffd39a" intensity={0.18} distance={2.45} decay={1.75} />
      <mesh position={[0, 0.08, -0.07]} scale={[1.92, 1.42, 1]} renderOrder={-12}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.52, -0.08]} scale={[2.34, 2.18, 1]} renderOrder={-13}>
        <circleGeometry args={[1, 112]} />
        <meshBasicMaterial color="#ffd39a" transparent opacity={0.086} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.3, -0.075]} scale={[0.72, 1.5, 1]} renderOrder={-11}>
        <circleGeometry args={[1, 80]} />
        <meshBasicMaterial color="#fff5cf" transparent opacity={0.1} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.02, 0.006]} scale={[0.44, 0.64, 0.045]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={WALNUT} emissive="#160806" emissiveIntensity={0.16} roughness={0.54} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.12, 0.04]} scale={[0.5, 0.13, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BRASS} emissive="#6d4712" emissiveIntensity={0.08} roughness={0.36} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.12, 0.04]} scale={[0.32, 0.42, 0.1]}>
        <sphereGeometry args={[1, 28, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.18} roughness={0.3} />
      </mesh>
      <mesh position={[0.04, 0.2, 0.11]} scale={[0.1, 0.14, 1]} renderOrder={2}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#fff8d4" transparent opacity={0.46} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.08, -0.02]} scale={[1.12, 0.98, 1]} renderOrder={-8}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.28, -0.035]} scale={[1.34, 1.5, 1]} renderOrder={-10}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.42, -0.025]} scale={[0.98, 0.76, 1]} renderOrder={-9}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#fff0bd" transparent opacity={0.12} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function ToonTubeStroke({
  points,
  radius = 0.014,
  color = INK,
  opacity = 1,
  renderOrder = 0,
}: {
  points: readonly Vec3Tuple[]
  radius?: number
  color?: string
  opacity?: number
  renderOrder?: number
}) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal', 0.42),
    [points],
  )

  return (
    <mesh renderOrder={renderOrder}>
      <tubeGeometry args={[curve, 42, radius, 8, false]} />
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function ToonBox({
  position,
  rotation = [0, 0, 0],
  scale,
  color,
  emissive = '#160806',
  emissiveIntensity = 0.03,
  roughness = 0.52,
  metalness = 0.04,
  outlineColor = SOFT_INK,
  outlineOpacity = 0.22,
  outlineScale = [1.028, 1.028, 1.06],
  outlineOffset = [0, 0, -0.022],
}: {
  position: Vec3Tuple
  rotation?: Vec3Tuple
  scale: Vec3Tuple
  color: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  outlineColor?: string
  outlineOpacity?: number
  outlineScale?: Vec3Tuple
  outlineOffset?: Vec3Tuple
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={outlineOffset} scale={[scale[0] * outlineScale[0], scale[1] * outlineScale[1], scale[2] * outlineScale[2]]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={outlineColor} transparent={outlineOpacity < 1} opacity={outlineOpacity} />
      </mesh>
      <mesh scale={scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={roughness} metalness={metalness} />
      </mesh>
    </group>
  )
}

function TeakSlatPanel({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  slatCount = 3,
  renderOrder = -6,
}: {
  position: Vec3Tuple
  rotation?: Vec3Tuple
  width: number
  height: number
  slatCount?: number
  renderOrder?: number
}) {
  const slats = useMemo(
    () =>
      Array.from({ length: slatCount }, (_, index) => {
        const x = -width / 2 + ((index + 0.5) / slatCount) * width
        const tone = index % 3 === 0 ? '#bd7b44' : index % 3 === 1 ? TEAK : '#8b5632'
        return [x, tone] as const
      }),
    [slatCount, width],
  )

  return (
    <group position={position} rotation={rotation}>
      <mesh scale={[width, height, 1]} renderOrder={renderOrder - 1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={TEAK_LIGHT} transparent opacity={0.11} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {slats.map(([x, color], index) => (
        <mesh key={`teak-slat-${position.join('-')}-${index}`} position={[x, 0, 0.04]} scale={[0.026, height * 0.86, 0.04]} renderOrder={renderOrder}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} emissive="#261207" emissiveIntensity={0.018} roughness={0.56} metalness={0.02} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.5, 0.052]} scale={[width, 0.02, 0.038]} renderOrder={renderOrder + 1}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={TEAK_LIGHT} emissive="#55360d" emissiveIntensity={0.024} roughness={0.44} metalness={0.06} />
      </mesh>
      <mesh position={[0, -height * 0.5, 0.052]} scale={[width, 0.02, 0.038]} renderOrder={renderOrder + 1}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={TEAK_LIGHT} emissive="#55360d" emissiveIntensity={0.024} roughness={0.44} metalness={0.06} />
      </mesh>
    </group>
  )
}

function RearHallwayPortal() {
  const doorLeaves = [-0.58, 0.58] as const
  const hingeYs = [-1.06, -0.18, 0.7] as const
  const showLegacyDoorDetail = false

  return (
    <group position={[0, 0, 2.64]}>
      <mesh position={[0, 0.2, -0.08]} scale={[4.18, 3.62, 1]} renderOrder={-16}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff0bf" transparent opacity={0.072} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.38, -0.055]} scale={[3.36, 2.98, 1]} renderOrder={-15}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.055} depthWrite={false} />
      </mesh>
      <ToonBox position={[0, -0.58, 0.16]} scale={[3.2, 2.78, 0.12]} color="#60331f" emissive="#170906" emissiveIntensity={0.03} roughness={0.58} outlineOpacity={0.12} outlineScale={[1.012, 1.018, 1.08]} />
      <ToonBox position={[-1.6, -0.58, -0.02]} scale={[0.19, 2.96, 0.18]} color={ROASTED_TEAK} emissive="#1d0d06" emissiveIntensity={0.04} roughness={0.52} metalness={0.04} outlineOpacity={0.16} outlineScale={[1.12, 1.012, 1.08]} />
      <ToonBox position={[1.6, -0.58, -0.02]} scale={[0.19, 2.96, 0.18]} color={ROASTED_TEAK} emissive="#1d0d06" emissiveIntensity={0.04} roughness={0.52} metalness={0.04} outlineOpacity={0.16} outlineScale={[1.12, 1.012, 1.08]} />
      <ToonBox position={[0, -2.05, -0.025]} scale={[3.28, 0.2, 0.18]} color={ROASTED_TEAK} emissive="#1b0b05" emissiveIntensity={0.038} roughness={0.5} metalness={0.05} outlineOpacity={0.16} outlineScale={[1.012, 1.12, 1.08]} />
      <ToonBox position={[0, 0.98, -0.025]} scale={[3.32, 0.2, 0.18]} color={ROASTED_TEAK} emissive="#1b0b05" emissiveIntensity={0.038} roughness={0.5} metalness={0.05} outlineOpacity={0.16} outlineScale={[1.012, 1.12, 1.08]} />
      <ToonBox position={[0, 1.56, -0.02]} scale={[3.06, 0.72, 0.14]} color={TEAK_LIGHT} emissive="#462009" emissiveIntensity={0.034} roughness={0.52} metalness={0.04} outlineOpacity={0.14} outlineScale={[1.018, 1.04, 1.08]} />
      <mesh position={[0, 1.56, -0.1]} scale={[2.44, 0.38, 1]} renderOrder={7}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#d7f0e7" emissive="#c7fff0" emissiveIntensity={0.24} roughness={0.36} metalness={0.04} transparent opacity={0.74} side={THREE.DoubleSide} />
      </mesh>
      {[-0.82, 0, 0.82].map((x) => (
        <ToonBox key={`grand-back-transom-bar-${x}`} position={[x, 1.56, -0.14]} scale={[0.045, 0.42, 0.055]} color={ROASTED_TEAK} emissive="#241106" emissiveIntensity={0.03} roughness={0.48} metalness={0.05} outlineOpacity={0.08} outlineScale={[1.18, 1.02, 1.06]} />
      ))}
      <ToonBox position={[0, 1.78, -0.14]} scale={[2.58, 0.04, 0.055]} color={BRASS} emissive="#62410f" emissiveIntensity={0.08} roughness={0.34} metalness={0.2} outlineOpacity={0.08} outlineScale={[1.012, 1.28, 1.08]} />
      <ToonBox position={[0, 1.34, -0.14]} scale={[2.58, 0.04, 0.055]} color={BRASS} emissive="#62410f" emissiveIntensity={0.07} roughness={0.36} metalness={0.18} outlineOpacity={0.08} outlineScale={[1.012, 1.28, 1.08]} />
      {doorLeaves.map((x) => (
        <group key={`grand-back-door-leaf-${x}`} position={[x, -0.62, -0.08]}>
          <ToonBox
            position={[0, 0, 0]}
            scale={[1.04, 2.64, 0.16]}
            color={x < 0 ? '#8f4d28' : '#844724'}
            emissive="#2f1607"
            emissiveIntensity={0.045}
            roughness={0.6}
            metalness={0.03}
            outlineOpacity={0.18}
            outlineScale={[1.022, 1.018, 1.08]}
          />
          <ToonBox
            position={[0, 0.56, -0.08]}
            scale={[0.66, 0.68, 0.08]}
            color={x < 0 ? '#b86e39' : '#a96536'}
            emissive="#371907"
            emissiveIntensity={0.04}
            roughness={0.56}
            metalness={0.03}
            outlineOpacity={0.16}
            outlineScale={[1.035, 1.035, 1.08]}
          />
          <ToonBox
            position={[0, -0.52, -0.08]}
            scale={[0.66, 1.04, 0.08]}
            color={x < 0 ? '#a96132' : '#99582d'}
            emissive="#291306"
            emissiveIntensity={0.035}
            roughness={0.58}
            metalness={0.03}
            outlineOpacity={0.14}
            outlineScale={[1.035, 1.025, 1.08]}
          />
          <ToonBox position={[0, 1.18, -0.1]} scale={[0.76, 0.05, 0.07]} color={BRASS} emissive="#5d3b0f" emissiveIntensity={0.07} roughness={0.36} metalness={0.18} outlineOpacity={0.08} outlineScale={[1.012, 1.28, 1.06]} />
          <ToonBox position={[0, 0.14, -0.1]} scale={[0.76, 0.045, 0.07]} color={BRASS} emissive="#5d3b0f" emissiveIntensity={0.064} roughness={0.36} metalness={0.18} outlineOpacity={0.08} outlineScale={[1.012, 1.28, 1.06]} />
          <ToonBox position={[0, -1.18, -0.1]} scale={[0.78, 0.05, 0.07]} color={BRASS} emissive="#5d3b0f" emissiveIntensity={0.064} roughness={0.36} metalness={0.18} outlineOpacity={0.08} outlineScale={[1.012, 1.28, 1.06]} />
          <mesh position={[x < 0 ? -0.28 : 0.28, 0.06, -0.16]} scale={[0.07, 1.84, 1]} renderOrder={8}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#fff0bd" transparent opacity={0.06} depthWrite={false} depthTest={false} />
          </mesh>
        </group>
      ))}
      <ToonBox position={[0, -0.62, -0.22]} scale={[0.055, 2.56, 0.075]} color={ROASTED_TEAK} emissive="#1c0d06" emissiveIntensity={0.028} roughness={0.5} metalness={0.04} outlineOpacity={0.08} outlineScale={[1.28, 1.01, 1.06]} />
      <ToonBox position={[0, -0.62, -0.27]} scale={[0.022, 2.36, 0.06]} color={BRASS} emissive="#62410f" emissiveIntensity={0.07} roughness={0.36} metalness={0.2} outlineOpacity={0.06} outlineScale={[1.8, 1.012, 1.04]} />
      {[-0.18, 0.18].map((x) => (
        <group key={`grand-back-door-handle-${x}`} position={[x, -0.56, -0.34]}>
          <mesh scale={[0.066, 0.12, 0.052]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color={BRASS} emissive="#7a5015" emissiveIntensity={0.1} roughness={0.28} metalness={0.24} />
          </mesh>
          <mesh position={[x < 0 ? -0.12 : 0.12, -0.02, 0]} rotation={[0, 0, x < 0 ? -0.2 : 0.2]} scale={[0.22, 0.034, 0.042]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={BRASS} emissive="#7a5015" emissiveIntensity={0.09} roughness={0.3} metalness={0.24} />
          </mesh>
        </group>
      ))}
      {[-1.21, 1.21].map((x) =>
        hingeYs.map((y) => (
          <ToonBox key={`grand-back-door-hinge-${x}-${y}`} position={[x, y - 0.62, -0.26]} scale={[0.09, 0.24, 0.07]} color={BRASS} emissive="#5d3b0f" emissiveIntensity={0.074} roughness={0.34} metalness={0.2} outlineOpacity={0.08} outlineScale={[1.08, 1.04, 1.06]} />
        )),
      )}
      <mesh position={[0, 1.6, -0.32]} scale={[2.74, 0.78, 1]} renderOrder={-4}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color="#fff0bd" transparent opacity={0.06} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.36, -0.32]} scale={[3.4, 2.58, 1]} renderOrder={-5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffd99a" transparent opacity={0.035} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -2.12, -0.3]} scale={[3.2, 0.34, 1]} renderOrder={-4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.06} depthWrite={false} />
      </mesh>
      {showLegacyDoorDetail ? (
        <>
      <mesh position={[0.08, -0.52, -0.03]} scale={[2.98, 3.44, 1]} renderOrder={-12}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={ROASTED_TEAK} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.88, -0.02]} scale={[1.5, 1.02, 1]} renderOrder={-11}>
        <circleGeometry args={[1, 88]} />
        <meshBasicMaterial color={ROASTED_TEAK} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.58, -0.02]} scale={[3.02, 2.88, 1]} renderOrder={-11}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={ROASTED_TEAK} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.86, 0.005]} scale={[1.35, 0.9, 1]} renderOrder={-10}>
        <circleGeometry args={[1, 88]} />
        <meshBasicMaterial color={TEAK_LIGHT} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.58, 0.006]} scale={[2.7, 2.62, 1]} renderOrder={-10}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={TEAK_LIGHT} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.86, 0.02]} scale={[1.18, 0.76, 1]} renderOrder={-9}>
        <circleGeometry args={[1, 80]} />
        <meshBasicMaterial color={ROASTED_TEAK} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.54, 0.021]} scale={[2.36, 2.34, 1]} renderOrder={-9}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={ROASTED_TEAK} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.86, 0.164]} scale={[1.47, 0.94, 1]} renderOrder={7}>
        <ringGeometry args={[0.86, 1.05, 96]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.24} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.86, 0.192]} scale={[1.34, 0.84, 1]} renderOrder={8}>
        <ringGeometry args={[0.88, 0.99, 96]} />
        <meshBasicMaterial color={BRASS} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <ToonBox position={[0, 1.88, 0.075]} scale={[3.24, 0.18, 0.12]} color={ROASTED_TEAK} emissiveIntensity={0.034} outlineOpacity={0.18} outlineScale={[1.015, 1.16, 1.12]} />
      <ToonBox position={[0, 1.68, 0.104]} scale={[2.8, 0.055, 0.07]} color={BRASS} emissive="#5b3a0e" emissiveIntensity={0.08} roughness={0.34} metalness={0.2} outlineOpacity={0.12} outlineScale={[1.01, 1.34, 1.1]} />
      <ToonBox position={[0, -1.99, 0.08]} scale={[3.16, 0.18, 0.12]} color={ROASTED_TEAK} emissiveIntensity={0.032} outlineOpacity={0.18} outlineScale={[1.015, 1.14, 1.12]} />
      <ToonBox position={[-1.55, -0.44, 0.07]} scale={[0.15, 3.06, 0.1]} color={ROASTED_TEAK} emissiveIntensity={0.032} outlineOpacity={0.2} outlineScale={[1.18, 1.01, 1.1]} />
      <ToonBox position={[1.55, -0.44, 0.07]} scale={[0.15, 3.06, 0.1]} color={ROASTED_TEAK} emissiveIntensity={0.032} outlineOpacity={0.2} outlineScale={[1.18, 1.01, 1.1]} />
      <ToonBox position={[0, -0.58, 0.078]} scale={[0.04, 2.62, 0.05]} color={ROASTED_TEAK} emissiveIntensity={0.018} outlineOpacity={0.16} outlineScale={[1.34, 1.01, 1.08]} />
      <ToonBox position={[0, -0.58, 0.112]} scale={[0.018, 2.46, 0.04]} color={BRASS} emissive="#5b3a0e" emissiveIntensity={0.08} roughness={0.34} metalness={0.2} outlineOpacity={0.1} outlineScale={[1.58, 1.01, 1.08]} />
      <TeakSlatPanel position={[0, -0.52, 0.085]} width={2.32} height={2.34} slatCount={3} renderOrder={-5} />
      {[-0.66, 0.66].map((x) => (
        <group key={`grand-back-door-panel-${x}`} position={[x, -0.62, 0.04]}>
          <ToonBox
            position={[0, 0.08, 0.072]}
            scale={[0.68, 1.84, 0.07]}
            color={x < 0 ? '#aa6535' : '#9e5d31'}
            emissive="#2f1607"
            emissiveIntensity={0.036}
            roughness={0.58}
            metalness={0.02}
            outlineOpacity={0.18}
            outlineScale={[1.028, 1.018, 1.08]}
          />
          <ToonBox
            position={[0, 0.52, 0.122]}
            scale={[0.46, 0.46, 0.055]}
            color={TEAK_LIGHT}
            emissive="#371907"
            emissiveIntensity={0.036}
            roughness={0.54}
            metalness={0.02}
            outlineOpacity={0.16}
            outlineScale={[1.04, 1.04, 1.08]}
          />
          <mesh position={[0, 0.58, 0.012]} scale={[0.62, 0.88, 1]} renderOrder={-8}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={TEAK_LIGHT} transparent opacity={0.2} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.54, 0.012]} scale={[0.66, 0.78, 1]} renderOrder={-8}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={TEAK_DARK} transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.58, 0.05]} scale={[0.7, 0.055, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={BRASS} emissive="#55360d" emissiveIntensity={0.07} roughness={0.36} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0.14, 0.05]} scale={[0.7, 0.04, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={BRASS} emissive="#55360d" emissiveIntensity={0.06} roughness={0.36} metalness={0.18} />
          </mesh>
          <mesh position={[0, -0.95, 0.05]} scale={[0.72, 0.052, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={BRASS} emissive="#55360d" emissiveIntensity={0.06} roughness={0.36} metalness={0.18} />
          </mesh>
          <mesh position={[-0.38, -0.14, 0.05]} scale={[0.045, 1.7, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={ROASTED_TEAK} roughness={0.5} />
          </mesh>
          <mesh position={[0.38, -0.14, 0.05]} scale={[0.045, 1.7, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={ROASTED_TEAK} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {[-0.22, 0.22].map((x) => (
        <group key={`grand-back-door-handle-${x}`} position={[x, -0.5, 0.12]}>
          <mesh scale={[0.07, 0.13, 0.05]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color={BRASS} emissive="#6d4712" emissiveIntensity={0.09} roughness={0.28} metalness={0.24} />
          </mesh>
          <mesh position={[x < 0 ? -0.1 : 0.1, -0.04, 0]} rotation={[0, 0, x < 0 ? -0.34 : 0.34]} scale={[0.18, 0.032, 0.04]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={BRASS} emissive="#6d4712" emissiveIntensity={0.08} roughness={0.3} metalness={0.24} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.28, 0.055]} scale={[2.1, 0.035, 0.04]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BRASS} emissive="#55360d" emissiveIntensity={0.06} roughness={0.36} metalness={0.18} />
      </mesh>
      {[-0.72, 0.72].map((x) => (
        <mesh key={`grand-back-door-visible-brass-line-${x}`} position={[x, -0.46, 0.095]} scale={[0.034, 2.16, 0.045]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={BRASS} emissive="#5b3a0e" emissiveIntensity={0.034} roughness={0.42} metalness={0.12} />
        </mesh>
      ))}
      {[-0.68, 0.68].map((x) => (
        <group key={`grand-back-door-side-inset-${x}`} position={[x, -0.52, 0.06]}>
          <mesh position={[0, 0.24, 0]} scale={[0.36, 1.4, 1]} renderOrder={-7}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={TEAK_LIGHT} transparent opacity={0.075} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.86, 0.035]} scale={[0.46, 0.05, 0.045]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={TEAK_LIGHT} emissive="#5b3a0e" emissiveIntensity={0.025} roughness={0.44} metalness={0.08} />
          </mesh>
          <mesh position={[0, -0.36, 0.035]} scale={[0.46, 0.05, 0.045]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={TEAK_LIGHT} emissive="#5b3a0e" emissiveIntensity={0.022} roughness={0.44} metalness={0.08} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.34, 0.1]} scale={[0.16, 0.16, 0.06]}>
        <sphereGeometry args={[1, 24, 14]} />
        <meshStandardMaterial color={BRASS} emissive="#6d4712" emissiveIntensity={0.09} roughness={0.3} metalness={0.22} />
      </mesh>
      <mesh position={[0, 1.34, 0.125]} scale={[0.07, 0.07, 0.04]}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshStandardMaterial color="#fff0bc" emissive="#ffe2a0" emissiveIntensity={0.14} roughness={0.34} metalness={0.12} />
      </mesh>
      <mesh position={[0, -0.38, 0.16]} scale={[0.026, 2.78, 1]} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.26} depthWrite={false} depthTest={false} />
      </mesh>
      {[-1.02, 1.02].map((x) => (
        <group key={`grand-back-door-visible-overlay-${x}`} position={[x, -0.34, 0.165]}>
          <mesh scale={[0.044, 2.38, 1]} renderOrder={5}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={BRASS} transparent opacity={0.18} depthWrite={false} depthTest={false} />
          </mesh>
          <mesh position={[0, 0.28, 0.002]} scale={[0.44, 1.26, 1]} renderOrder={4}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={TEAK_LIGHT} transparent opacity={0.075} depthWrite={false} depthTest={false} />
          </mesh>
          <mesh position={[0, 0.9, 0.004]} scale={[0.52, 0.038, 1]} renderOrder={6}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={BRASS} transparent opacity={0.18} depthWrite={false} depthTest={false} />
          </mesh>
          <mesh position={[0, -0.4, 0.004]} scale={[0.52, 0.038, 1]} renderOrder={6}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={BRASS} transparent opacity={0.16} depthWrite={false} depthTest={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.34, 0.17]} scale={[0.34, 0.08, 1]} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.24} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={[0, 1.05, 0.035]} rotation={[0, 0, 0.02]} scale={[0.78, 0.34, 1]} renderOrder={-7}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color="#fff0bc" transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <ToonTubeStroke
        points={[
          [-1.5, -2.0, 0.13],
          [-1.6, -0.74, 0.13],
          [-1.26, 0.62, 0.13],
          [-0.48, 1.48, 0.13],
          [0, 1.64, 0.13],
          [0.48, 1.48, 0.13],
          [1.26, 0.62, 0.13],
          [1.6, -0.74, 0.13],
          [1.5, -2.0, 0.13],
        ]}
        color={ROASTED_TEAK}
        opacity={0.42}
        radius={0.012}
        renderOrder={1}
      />
      <ToonTubeStroke
        points={[
          [-1.28, -1.86, 0.14],
          [-1.34, -0.72, 0.14],
          [-1.02, 0.48, 0.14],
          [-0.38, 1.22, 0.14],
          [0, 1.34, 0.14],
          [0.38, 1.22, 0.14],
          [1.02, 0.48, 0.14],
          [1.34, -0.72, 0.14],
          [1.28, -1.86, 0.14],
        ]}
        color={BRASS}
        opacity={0.46}
        radius={0.008}
        renderOrder={1}
      />
      <mesh position={[0, 0.82, 0.24]} scale={[1.35, 0.92, 1]} renderOrder={20}>
        <ringGeometry args={[0.9, 1, 96]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.24} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-1.34, -0.58, 0.24]} scale={[0.045, 2.58, 1]} renderOrder={20}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.16} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={[1.34, -0.58, 0.24]} scale={[0.045, 2.58, 1]} renderOrder={20}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.16} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={[0, -1.86, 0.24]} scale={[2.72, 0.05, 1]} renderOrder={20}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.18} depthWrite={false} depthTest={false} />
      </mesh>
        </>
      ) : null}
    </group>
  )
}

function DoorDestinationPlaque({
  side,
  label,
  background,
  trim,
  textColor,
  glow,
}: {
  side: 'left' | 'right'
  label: string
  background: string
  trim: string
  textColor: string
  glow: string
}) {
  const sign = side === 'left' ? -1 : 1
  const labelTexture = useMemo<THREE.CanvasTexture | null>(() => {
    if (typeof document === 'undefined') return null

    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 192
    const context = canvas.getContext('2d')
    if (!context) return null

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'

    const lines = label.includes(' ') ? label.split(' ') : [label]
    const fontSize = lines.length > 1 ? 68 : 76
    context.font = `900 ${fontSize}px Arial Black, Impact, sans-serif`
    context.lineWidth = 10
    context.strokeStyle = SOFT_INK
    context.fillStyle = textColor

    lines.forEach((line, index) => {
      const y = lines.length > 1 ? 66 + index * 68 : 96
      context.strokeText(line, canvas.width / 2, y)
      context.fillText(line, canvas.width / 2, y)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }, [label, textColor])

  return (
    <group position={[0.15 * -sign, 1.74, 0]} rotation={[0, -sign * Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.028]} scale={[1.46, 0.42, 0.055]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.22} />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[1.36, 0.35, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={background} emissive={background} emissiveIntensity={0.08} roughness={0.44} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.165, 0.036]} scale={[1.22, 0.026, 0.024]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.08} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.165, 0.036]} scale={[1.22, 0.026, 0.024]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.07} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.02, 0.05]} scale={[1.62, 0.52, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.07} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.006, 0.064]} scale={[1.24, 0.3, 1]} renderOrder={10}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={labelTexture ?? undefined} transparent opacity={labelTexture ? 1 : 0} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  )
}

function createWayfindingArrowTipGeometry(direction: 'left' | 'right') {
  const sign = direction === 'left' ? -1 : 1
  const points = [
    [sign * 1.14, 0, 0],
    [sign * 0.42, 0.46, 0],
    [sign * 0.42, -0.46, 0],
  ]
  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
  geometry.setIndex([0, 1, 2])
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createRoundedWayfindingArrowShape(direction: 'left' | 'right', inset = 0) {
  const sign = direction === 'left' ? -1 : 1
  const widthScale = Math.max(0.48, 1 - inset * 0.52)
  const heightScale = Math.max(0.48, 1 - inset * 0.82)
  const x = (value: number) => sign * value * widthScale
  const y = (value: number) => value * heightScale
  const shape = new THREE.Shape()

  shape.moveTo(x(-1.08), y(-0.44))
  shape.quadraticCurveTo(x(-1.26), y(-0.44), x(-1.28), y(-0.28))
  shape.lineTo(x(-1.28), y(0.28))
  shape.quadraticCurveTo(x(-1.26), y(0.44), x(-1.08), y(0.44))
  shape.lineTo(x(0.34), y(0.44))
  shape.quadraticCurveTo(x(0.48), y(0.44), x(0.58), y(0.34))
  shape.lineTo(x(1.13), y(0.08))
  shape.quadraticCurveTo(x(1.29), y(0), x(1.13), y(-0.08))
  shape.lineTo(x(0.58), y(-0.34))
  shape.quadraticCurveTo(x(0.48), y(-0.44), x(0.34), y(-0.44))
  shape.lineTo(x(-1.08), y(-0.44))
  return shape
}

function createOrnateMuseumPlaqueShape(width: number, height: number, inset = 0) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const xInset = inset * 0.18
  const yInset = inset * 0.1
  const left = -halfWidth + xInset
  const right = halfWidth - xInset
  const top = halfHeight - yInset
  const bottom = -halfHeight + yInset
  const endBulge = Math.max(0.18, 0.34 - inset * 0.04)
  const corner = Math.max(0.08, 0.16 - inset * 0.02)
  const waist = Math.max(0.05, 0.12 - inset * 0.02)
  const shape = new THREE.Shape()

  shape.moveTo(left + endBulge, bottom)
  shape.lineTo(right - endBulge, bottom)
  shape.bezierCurveTo(right - corner, bottom, right - corner * 0.42, bottom + waist, right - corner * 0.42, bottom + corner)
  shape.quadraticCurveTo(right - corner * 0.18, bottom + corner * 1.35, right + endBulge * 0.1, bottom + corner * 1.52)
  shape.quadraticCurveTo(right + endBulge * 0.36, 0, right + endBulge * 0.1, top - corner * 1.52)
  shape.quadraticCurveTo(right - corner * 0.18, top - corner * 1.35, right - corner * 0.42, top - corner)
  shape.bezierCurveTo(right - corner * 0.42, top - waist, right - corner, top, right - endBulge, top)
  shape.lineTo(left + endBulge, top)
  shape.bezierCurveTo(left + corner, top, left + corner * 0.42, top - waist, left + corner * 0.42, top - corner)
  shape.quadraticCurveTo(left + corner * 0.18, top - corner * 1.35, left - endBulge * 0.1, top - corner * 1.52)
  shape.quadraticCurveTo(left - endBulge * 0.36, 0, left - endBulge * 0.1, bottom + corner * 1.52)
  shape.quadraticCurveTo(left + corner * 0.18, bottom + corner * 1.35, left + corner * 0.42, bottom + corner)
  shape.bezierCurveTo(left + corner * 0.42, bottom + waist, left + corner, bottom, left + endBulge, bottom)

  return shape
}

function createMuseumDiamondShape(width: number, height: number) {
  const shape = new THREE.Shape()
  shape.moveTo(0, height / 2)
  shape.lineTo(width / 2, 0)
  shape.lineTo(0, -height / 2)
  shape.lineTo(-width / 2, 0)
  shape.lineTo(0, height / 2)
  return shape
}

function WayfindingTextPlane({
  lines,
  width,
  height,
  position,
  renderOrder = 28,
}: {
  lines: readonly { text: string; size: number; y: number; fill?: string }[]
  width: number
  height: number
  position: Vec3Tuple
  renderOrder?: number
}) {
  const texture = useMemo<THREE.CanvasTexture | null>(() => {
    if (typeof document === 'undefined') return null

    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 320
    const context = canvas.getContext('2d')
    if (!context) return null

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'

    lines.forEach((line) => {
      let fontSize = line.size
      const fontFamily = '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif'
      context.font = `640 ${fontSize}px ${fontFamily}`
      const maxTextWidth = canvas.width * 0.9
      const measuredWidth = context.measureText(line.text).width
      if (measuredWidth > maxTextWidth) {
        fontSize *= maxTextWidth / measuredWidth
        context.font = `640 ${fontSize}px ${fontFamily}`
      }

      context.lineWidth = Math.max(4, fontSize * 0.046)
      context.strokeStyle = '#fff7c9'
      context.fillStyle = line.fill ?? CREAM
      context.shadowColor = 'rgba(12, 8, 20, 0.28)'
      context.shadowBlur = fontSize * 0.045
      context.shadowOffsetY = fontSize * 0.018
      context.strokeText(line.text, canvas.width / 2, line.y)
      context.shadowColor = 'transparent'
      context.shadowBlur = 0
      context.shadowOffsetY = 0
      context.lineWidth = Math.max(2, fontSize * 0.012)
      context.strokeStyle = 'rgba(25, 18, 33, 0.92)'
      context.strokeText(line.text, canvas.width / 2, line.y)
      context.fillText(line.text, canvas.width / 2, line.y)
    })

    const labelTexture = new THREE.CanvasTexture(canvas)
    labelTexture.colorSpace = THREE.SRGBColorSpace
    labelTexture.minFilter = THREE.LinearFilter
    labelTexture.magFilter = THREE.LinearFilter
    labelTexture.needsUpdate = true
    return labelTexture
  }, [lines])

  if (!texture) return null

  return (
    <mesh position={position} rotation={[0, Math.PI, 0]} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function WayfindingArrowPlaque({
  choice,
  direction,
  label,
  position,
  idlePhase = 0,
  baseScale = 1,
  transitionChoice,
  active,
  onSelect,
}: {
  choice: WayfindingChoice
  direction: 'left' | 'right'
  label: string
  position: Vec3Tuple
  idlePhase?: number
  baseScale?: number
  transitionChoice?: WayfindingChoice | null
  active: boolean
  onSelect: (choice: WayfindingChoice) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const pulseHaloRef = useRef<THREE.Mesh>(null)
  const shineSweepRef = useRef<THREE.Mesh>(null)
  const premiumRimGlowRef = useRef<THREE.Mesh>(null)
  const premiumFaceGlowRef = useRef<THREE.Mesh>(null)
  const premiumTipGlintRef = useRef<THREE.Mesh>(null)
  const premiumBottomLipRef = useRef<THREE.Mesh>(null)
  const transitionProgressRef = useRef(0)
  const clickPulseRef = useRef(0)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const arrowTipGeometry = useMemo(() => createWayfindingArrowTipGeometry(direction), [direction])
  const arrowOuterShape = useMemo(() => createRoundedWayfindingArrowShape(direction, 0), [direction])
  const arrowRimShape = useMemo(() => createRoundedWayfindingArrowShape(direction, 0.08), [direction])
  const arrowFaceShape = useMemo(() => createRoundedWayfindingArrowShape(direction, 0.16), [direction])
  const arrowInsetShape = useMemo(() => createRoundedWayfindingArrowShape(direction, 0.34), [direction])
  const arrowHighlightShape = useMemo(() => createRoundedWayfindingArrowShape(direction, 0.24), [direction])
  const sign = direction === 'left' ? -1 : 1
  const bodyCenterX = direction === 'left' ? 0.34 : -0.34
  const isBurn = choice === 'burn'
  const accent = isBurn ? '#ff4f36' : '#85d75c'
  const faceColor = active || hovered ? (isBurn ? '#ff916f' : '#c4f06d') : isBurn ? '#e85032' : '#80c845'
  const insetColor = active || hovered ? (isBurn ? '#ffc89f' : '#ddff8e') : isBurn ? '#ff9b62' : '#b8e660'
  const bellyColor = isBurn ? '#ff6845' : '#9ee36a'
  const rimColor = isBurn ? '#ffb348' : '#f3e66d'
  const gleamColor = isBurn ? '#fff0bc' : '#f5ffb8'
  const deepEdgeColor = isBurn ? '#6d1d17' : '#28501e'
  const sideEdgeColor = isBurn ? '#9b2d22' : '#3e7827'
  const readablePanelColor = isBurn ? '#ffb56e' : '#c8ec62'
  const labelLines = label === 'EXPLORE COURTYARD'
    ? [
        { text: 'EXPLORE', size: 126, y: 110, fill: SOFT_INK },
        { text: 'COURTYARD', size: 120, y: 224, fill: SOFT_INK },
      ] as const
    : [{ text: label, size: 156, y: 166, fill: SOFT_INK }] as const

  useFrame(({ clock }, dt) => {
    const group = groupRef.current
    if (!group) return

    const time = clock.elapsedTime
    const transitionActive = transitionChoice !== null && transitionChoice !== undefined
    const transitionSelected = transitionChoice === choice
    transitionProgressRef.current = transitionActive ? Math.min(1, transitionProgressRef.current + dt * 1.42) : 0
    const rawExitProgress = transitionProgressRef.current
    const exitProgress = rawExitProgress * rawExitProgress * (3 - rawExitProgress * 2)
    clickPulseRef.current = Math.max(0, clickPulseRef.current - dt * 3.8)
    const clickPulse = clickPulseRef.current
    const hoverLift = hovered ? -0.075 : 0
    const hoverNudge = hovered ? sign * 0.045 : 0
    const pressDepth = pressed ? 0.11 : 0
    const pressNudge = pressed ? sign * -0.028 : 0
    const activeLift = active ? -0.018 : 0
    const idleFloat = Math.sin(time * 1.36 + idlePhase) * 0.045 + Math.sin(time * 0.72 + idlePhase * 1.7) * 0.018
    const idleDrift = Math.sin(time * 0.92 + idlePhase + 0.8) * 0.028
    const idleWobble = Math.sin(time * 1.18 + idlePhase * 1.2) * 0.035
    const hoverBob = hovered ? Math.sin(time * 9.5) * 0.012 : 0
    const targetZ = position[2] + hoverLift + pressDepth + activeLift
    const targetY = position[1] + idleFloat + (hovered ? 0.018 : 0) + hoverBob + Math.sin((1 - clickPulse) * Math.PI) * clickPulse * 0.018
    const bounce = Math.sin((1 - clickPulse) * Math.PI) * clickPulse
    const exitScale = transitionActive
      ? Math.max(0.018, transitionSelected ? 1 + Math.sin(rawExitProgress * Math.PI) * 0.38 - exitProgress * 0.98 : 1 - exitProgress * 0.98)
      : 1
    const exitX = transitionActive ? sign * (transitionSelected ? 0.64 : -0.28) * exitProgress : 0
    const exitY = transitionActive ? (transitionSelected ? -0.1 : -0.32) * exitProgress : 0
    const exitZ = transitionActive ? -0.58 * exitProgress : 0
    const targetScaleX = baseScale * exitScale * (1 + (hovered ? 0.08 : 0) + (active ? 0.025 : 0) + bounce * 0.064 - (pressed ? 0.05 : 0))
    const targetScaleY = baseScale * exitScale * (1 + (hovered ? 0.035 : 0) + (active ? 0.018 : 0) - bounce * 0.022 - (pressed ? 0.065 : 0))
    const targetScaleZ = baseScale * exitScale * (1 + (hovered ? 0.055 : 0) + bounce * 0.04 - (pressed ? 0.045 : 0))
    const targetRotationZ = idleWobble + (hovered ? (direction === 'left' ? 0.02 : -0.02) : 0) + (transitionActive ? sign * exitProgress * (transitionSelected ? 0.52 : -0.35) : 0)

    group.position.x = THREE.MathUtils.lerp(group.position.x, position[0] + idleDrift + hoverNudge + pressNudge + exitX, 0.28)
    group.position.y = THREE.MathUtils.lerp(group.position.y, targetY + exitY, 0.28)
    group.position.z = THREE.MathUtils.lerp(group.position.z, targetZ + exitZ, 0.32)
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, targetRotationZ, 0.18)
    group.scale.x = THREE.MathUtils.lerp(group.scale.x, targetScaleX, 0.25)
    group.scale.y = THREE.MathUtils.lerp(group.scale.y, targetScaleY, 0.25)
    group.scale.z = THREE.MathUtils.lerp(group.scale.z, targetScaleZ, 0.25)

    const hoverStrength = hovered ? 1 : active ? 0.72 : 0
    const pulse = 0.5 + Math.sin(time * 2.35 + idlePhase) * 0.5

    if (pulseHaloRef.current) {
      pulseHaloRef.current.scale.set(1.58 + pulse * 0.16 + hoverStrength * 0.1, 0.72 + pulse * 0.08 + hoverStrength * 0.04, 1)
      const material = pulseHaloRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.075 + pulse * 0.035 + hoverStrength * 0.08
    }

    if (shineSweepRef.current) {
      const sweepPhase = (time * (hovered ? 0.7 : 0.42) + idlePhase * 0.13) % 1
      shineSweepRef.current.position.x = bodyCenterX - sign * 0.66 + sign * sweepPhase * 1.3
      shineSweepRef.current.rotation.z = -sign * 0.32
      shineSweepRef.current.scale.set(0.06 + hoverStrength * 0.018, 0.48, 1)
      const material = shineSweepRef.current.material as THREE.MeshBasicMaterial
      material.opacity = (0.035 + hoverStrength * 0.05) * Math.sin(sweepPhase * Math.PI)
    }

    if (premiumRimGlowRef.current) {
      const rimBeat = 0.5 + Math.sin(time * 2.1 + idlePhase * 0.8) * 0.5
      premiumRimGlowRef.current.scale.set(1 + hoverStrength * 0.026 + rimBeat * 0.008, 1 + hoverStrength * 0.018 + rimBeat * 0.006, 1)
      const material = premiumRimGlowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.12 + hoverStrength * 0.18 + rimBeat * 0.045
    }

    if (premiumFaceGlowRef.current) {
      const faceBreath = 0.5 + Math.sin(time * 1.65 + idlePhase) * 0.5
      premiumFaceGlowRef.current.scale.set(1 + hoverStrength * 0.018, 0.96 + faceBreath * 0.018 + hoverStrength * 0.018, 1)
      const material = premiumFaceGlowRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.08 + hoverStrength * 0.12 + faceBreath * 0.025
    }

    if (premiumTipGlintRef.current) {
      const tipBeat = 0.5 + Math.sin(time * 3.4 + idlePhase * 1.4) * 0.5
      premiumTipGlintRef.current.scale.set(0.12 + tipBeat * 0.024 + hoverStrength * 0.024, 0.32 + tipBeat * 0.045 + hoverStrength * 0.045, 1)
      const material = premiumTipGlintRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.1 + tipBeat * 0.08 + hoverStrength * 0.12
    }

    if (premiumBottomLipRef.current) {
      premiumBottomLipRef.current.position.y = -0.365 + (pressed ? 0.038 : hovered ? -0.018 : 0)
      const material = premiumBottomLipRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.44 + hoverStrength * 0.16
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      scale={[baseScale, baseScale, baseScale]}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        setHovered(false)
        setPressed(false)
        document.body.style.cursor = ''
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
        setPressed(true)
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        setPressed(false)
        clickPulseRef.current = 1
        onSelect(choice)
      }}
      onPointerCancel={(event) => {
        event.stopPropagation()
        setPressed(false)
      }}
    >
      <mesh position={[0, 0, -0.2]} scale={[2.34, 1.02, 1]} renderOrder={1}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={bellyColor} transparent opacity={0.001} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh ref={pulseHaloRef} position={[0, -0.015, -0.21]} scale={[1.58, 0.72, 1]} renderOrder={2}>
        <circleGeometry args={[1, 80]} />
        <meshBasicMaterial color={bellyColor} transparent opacity={0.09} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.08, -0.075, 0.24]} scale={[2.02, 0.78, 1]} renderOrder={4}>
        <circleGeometry args={[1, 80]} />
        <meshBasicMaterial color={INK} transparent opacity={0.44} depthWrite={false} depthTest={false} />
      </mesh>
      <group position={[0.09, -0.085, 0.2]} scale={[1.22, 1.2, 1]}>
        <mesh renderOrder={8}>
          <shapeGeometry args={[arrowOuterShape]} />
          <meshBasicMaterial color={INK} transparent opacity={0.82} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0.05, -0.07, 0.18]} scale={[1.88, 0.7, 1]} renderOrder={7}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.36} depthWrite={false} depthTest={false} />
      </mesh>
      <group position={[0.035, -0.045, 0.12]} scale={[1.09, 1.16, 1]}>
        <mesh position={[bodyCenterX, 0, 0.015]} scale={[1.64, 0.76, 0.15]} renderOrder={8}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={INK} transparent opacity={0.86} />
        </mesh>
        {[-0.72, 0.72].map((offset) => (
          <mesh key={`wayfinding-button-shadow-cap-${offset}`} position={[bodyCenterX + offset, 0, 0.03]} scale={[0.4, 0.38, 1]} renderOrder={8}>
            <circleGeometry args={[1, 44]} />
            <meshBasicMaterial color={INK} transparent opacity={0.86} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh geometry={arrowTipGeometry} position={[0, 0, 0.04]} scale={[1.12, 1.18, 1]} renderOrder={8}>
          <meshBasicMaterial color={INK} transparent opacity={0.86} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group position={[0.05 * -sign, -0.035, 0.095]} scale={[1.08, 1.13, 1]}>
        <mesh position={[bodyCenterX, 0, 0.02]} scale={[1.6, 0.72, 0.16]} renderOrder={9}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={deepEdgeColor} emissive={deepEdgeColor} emissiveIntensity={0.06} roughness={0.5} metalness={0.04} />
        </mesh>
        {[-0.72, 0.72].map((offset) => (
          <mesh key={`wayfinding-button-deep-cap-${offset}`} position={[bodyCenterX + offset, 0, 0.04]} scale={[0.38, 0.36, 1]} renderOrder={9}>
            <circleGeometry args={[1, 48]} />
            <meshStandardMaterial color={deepEdgeColor} emissive={deepEdgeColor} emissiveIntensity={0.06} roughness={0.5} metalness={0.04} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh geometry={arrowTipGeometry} position={[0, 0, 0.045]} scale={[1.12, 1.14, 1]} renderOrder={9}>
          <meshStandardMaterial color={deepEdgeColor} emissive={deepEdgeColor} emissiveIntensity={0.06} roughness={0.5} metalness={0.04} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group position={[0.018 * sign, 0.018, 0.02]} scale={[1.12, 1.17, 1]}>
        <mesh position={[bodyCenterX, 0, 0.005]} scale={[1.6, 0.7, 0.12]} renderOrder={9}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={rimColor} emissive={accent} emissiveIntensity={0.1} roughness={0.34} metalness={0.06} />
        </mesh>
        {[-0.72, 0.72].map((offset) => (
          <mesh key={`wayfinding-button-rim-cap-${offset}`} position={[bodyCenterX + offset, 0, 0.025]} scale={[0.37, 0.35, 1]} renderOrder={9}>
            <circleGeometry args={[1, 48]} />
            <meshStandardMaterial color={rimColor} emissive={accent} emissiveIntensity={0.1} roughness={0.34} metalness={0.06} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh geometry={arrowTipGeometry} position={[0, 0, 0.03]} scale={[1.1, 1.1, 1]} renderOrder={9}>
          <meshStandardMaterial color={rimColor} emissive={accent} emissiveIntensity={0.1} roughness={0.34} metalness={0.06} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group position={[0, 0, 0.04]} scale={[1.08, 1.14, 1]}>
        <mesh position={[bodyCenterX, 0, 0.01]} scale={[1.52, 0.66, 0.16]} renderOrder={10}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={ROASTED_TEAK} emissive="#2f1406" emissiveIntensity={0.08} roughness={0.48} metalness={0.04} />
        </mesh>
        <mesh position={[bodyCenterX, 0, -0.02]} scale={[1.48, 0.62, 0.12]} renderOrder={11}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={faceColor} emissive={accent} emissiveIntensity={active || hovered ? 0.24 : 0.11} roughness={0.36} metalness={0.03} />
        </mesh>
        {[-0.72, 0.72].map((offset) => (
          <mesh key={`wayfinding-button-face-cap-${offset}`} position={[bodyCenterX + offset, 0, 0.03]} scale={[0.34, 0.33, 1]} renderOrder={11}>
            <circleGeometry args={[1, 48]} />
            <meshStandardMaterial color={faceColor} emissive={accent} emissiveIntensity={active || hovered ? 0.24 : 0.11} roughness={0.36} metalness={0.03} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh geometry={arrowTipGeometry} position={[0, 0, 0.035]} scale={[1.02, 1.04, 1]} renderOrder={11}>
          <meshStandardMaterial color={faceColor} emissive={accent} emissiveIntensity={active || hovered ? 0.24 : 0.11} roughness={0.36} metalness={0.03} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group position={[0, 0.015, -0.06]} scale={[0.9, 0.78, 1]}>
        <mesh position={[bodyCenterX, 0, 0]} scale={[1.34, 0.44, 0.08]} renderOrder={15}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={insetColor} emissive={accent} emissiveIntensity={active || hovered ? 0.16 : 0.075} roughness={0.42} metalness={0.02} />
        </mesh>
        {[-0.62, 0.62].map((offset) => (
          <mesh key={`wayfinding-button-inset-cap-${offset}`} position={[bodyCenterX + offset, 0, 0.045]} scale={[0.24, 0.22, 1]} renderOrder={15}>
            <circleGeometry args={[1, 42]} />
            <meshStandardMaterial color={insetColor} emissive={accent} emissiveIntensity={active || hovered ? 0.16 : 0.075} roughness={0.42} metalness={0.02} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh geometry={arrowTipGeometry} position={[sign * 0.015, 0, 0.05]} scale={[0.78, 0.7, 1]} renderOrder={15}>
          <meshStandardMaterial color={insetColor} emissive={accent} emissiveIntensity={active || hovered ? 0.16 : 0.075} roughness={0.42} metalness={0.02} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group position={[0.02 * sign, 0.025, -0.18]} scale={[1.18, 1.2, 1]}>
        <mesh position={[0.055, -0.052, 0.1]} renderOrder={18}>
          <shapeGeometry args={[arrowOuterShape]} />
          <meshBasicMaterial color={INK} transparent opacity={0.9} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.018, -0.032, 0.072]} renderOrder={19}>
          <shapeGeometry args={[arrowOuterShape]} />
          <meshBasicMaterial color={deepEdgeColor} transparent opacity={1} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.012, 0.038]} renderOrder={20}>
          <shapeGeometry args={[arrowRimShape]} />
          <meshBasicMaterial color={rimColor} transparent opacity={1} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.012 * sign, 0.016, 0.006]} renderOrder={21}>
          <shapeGeometry args={[arrowFaceShape]} />
          <meshBasicMaterial color={faceColor} transparent opacity={1} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.045 * sign, -0.01, -0.024]} scale={[1, 0.9, 1]} renderOrder={22}>
          <shapeGeometry args={[arrowInsetShape]} />
          <meshBasicMaterial color={readablePanelColor} transparent opacity={1} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={premiumRimGlowRef} position={[0, -0.01, -0.045]} scale={[1, 1, 1]} renderOrder={23}>
          <shapeGeometry args={[arrowRimShape]} />
          <meshBasicMaterial color={gleamColor} transparent opacity={0.16} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={premiumFaceGlowRef} position={[-0.04 * sign, 0.02, -0.052]} scale={[0.96, 0.96, 1]} renderOrder={24}>
          <shapeGeometry args={[arrowInsetShape]} />
          <meshBasicMaterial color={isBurn ? '#fff1be' : '#f9ffbd'} transparent opacity={0.1} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.12 * sign, 0.18, -0.04]} scale={[0.74, 0.22, 1]} renderOrder={24}>
          <shapeGeometry args={[arrowHighlightShape]} />
          <meshBasicMaterial color={gleamColor} transparent opacity={hovered || active ? 0.22 : 0.14} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={premiumTipGlintRef} position={[0.94 * sign, 0.015, -0.06]} rotation={[0, 0, -sign * 0.08]} scale={[0.12, 0.32, 1]} renderOrder={26}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={isBurn ? '#fff2b8' : '#faffba'} transparent opacity={0.12} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.58 * sign, 0.005, -0.032]} rotation={[0, 0, -sign * 0.02]} scale={[0.075, 0.46, 1]} renderOrder={25}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={isBurn ? '#ffd093' : '#f8ffad'} transparent opacity={hovered || active ? 0.26 : 0.14} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={premiumBottomLipRef} position={[-0.02 * sign, -0.365, -0.018]} scale={[1.26, 0.085, 1]} renderOrder={27}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={isBurn ? '#6b1b16' : '#21491c'} transparent opacity={0.44} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.8 * sign, -0.21, -0.026]} scale={[0.4, 0.045, 1]} renderOrder={25}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={sideEdgeColor} transparent opacity={0.5} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[bodyCenterX - sign * 0.1, 0.12, -0.115]} scale={[1.08, 0.16, 1]} renderOrder={18}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#fff6d7" transparent opacity={hovered || active ? 0.22 : 0.13} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0, -0.16]} scale={[1.48, 0.7, 1]} renderOrder={6}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color={bellyColor} transparent opacity={active ? 0.22 : hovered ? 0.18 : 0.08} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[bodyCenterX - sign * 0.06, 0.2, -0.145]} scale={[1.22, 0.035, 0.025]} renderOrder={22}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={gleamColor} emissive={gleamColor} emissiveIntensity={0.12} roughness={0.24} metalness={0.04} transparent opacity={0.84} />
      </mesh>
      <mesh ref={shineSweepRef} position={[bodyCenterX, 0.02, -0.19]} rotation={[0, 0, -sign * 0.32]} scale={[0.06, 0.48, 1]} renderOrder={23}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fffbe5" transparent opacity={0.04} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <WayfindingTextPlane
        width={1.95}
        height={0.56}
        position={[direction === 'left' ? 0.23 : -0.23, -0.005, -0.235]}
        renderOrder={30}
        lines={labelLines}
      />
    </group>
  )
}

function WayfindingSelectionBurst({ transitionChoice }: { transitionChoice: WayfindingChoice | null }) {
  const groupRef = useRef<THREE.Group>(null)
  const elapsedRef = useRef(0)
  const shards = useMemo(
    () =>
      Array.from({ length: 9 }, (_, index) => {
        const angle = -0.95 + index * 0.24
        return {
          angle,
          distance: 0.2 + (index % 3) * 0.08,
          length: 0.18 + (index % 4) * 0.035,
        }
      }),
    [],
  )

  useFrame((_, dt) => {
    const group = groupRef.current
    if (!group || !transitionChoice) return

    elapsedRef.current = Math.min(1.4, elapsedRef.current + dt)
    const t = Math.min(1, elapsedRef.current / 0.78)
    const eased = t * t * (3 - t * 2)
    group.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.58 + eased * 0.28)
    group.rotation.z = (transitionChoice === 'burn' ? -1 : 1) * eased * 0.24

    group.children.forEach((child, index) => {
      if (!('material' in child)) return
      const material = child.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
      if ('opacity' in material) {
        material.opacity = Math.max(0, (index === 0 ? 0.35 : 0.62) * (1 - eased))
        material.transparent = true
      }
    })
  })

  if (!transitionChoice) return null

  const sign = transitionChoice === 'burn' ? -1 : 1
  const color = transitionChoice === 'burn' ? '#ff5630' : '#fff5bf'
  const core = transitionChoice === 'burn' ? '#ffb14a' : '#d8fff0'

  return (
    <group ref={groupRef} position={[transitionChoice === 'burn' ? -1.58 : 1.58, -0.94, -0.34]} rotation={[0, 0, sign * 0.08]}>
      <mesh scale={[1.46, 0.62, 1]} renderOrder={34}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={core} transparent opacity={0.28} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {shards.map((shard, index) => (
        <mesh
          key={`wayfinding-selection-shard-${index}`}
          position={[
            sign * (0.24 + Math.cos(shard.angle) * shard.distance),
            Math.sin(shard.angle) * shard.distance * 0.48,
            -0.08 - index * 0.002,
          ]}
          rotation={[0, 0, sign * (shard.angle + 0.4)]}
          scale={[shard.length, 0.036, 0.018]}
          renderOrder={35}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={color} transparent opacity={0.54} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

function MuseumWelcomeTitlePlane({ position, width, height, renderOrder = 38 }: { position: Vec3Tuple; width: number; height: number; renderOrder?: number }) {
  const texture = useMemo<THREE.CanvasTexture | null>(() => {
    if (typeof document === 'undefined') return null

    const canvas = document.createElement('canvas')
    canvas.width = 1536
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) return null

    const drawLetterSpaced = (
      text: string,
      x: number,
      y: number,
      size: number,
      spacing: number,
      fill: string,
    ) => {
      const fontFamily = 'Arial Black, Impact, Georgia, serif'
      context.font = `900 ${size}px ${fontFamily}`
      context.textBaseline = 'middle'
      context.lineJoin = 'round'
      context.miterLimit = 3

      const letters = [...text]
      const totalWidth = letters.reduce((sum, letter, index) => sum + context.measureText(letter).width + (index === letters.length - 1 ? 0 : spacing), 0)
      let cursor = x - totalWidth / 2

      letters.forEach((letter) => {
        const metrics = context.measureText(letter)
        const centerX = cursor + metrics.width / 2

        context.lineWidth = Math.max(16, size * 0.14)
        context.strokeStyle = '#2b1713'
        context.strokeText(letter, centerX + size * 0.016, y + size * 0.034)

        context.lineWidth = Math.max(9, size * 0.07)
        context.strokeStyle = '#fff1b8'
        context.strokeText(letter, centerX, y)

        context.fillStyle = fill
        context.fillText(letter, centerX, y)
        cursor += metrics.width + spacing
      })
    }

    const drawDivider = (y: number, inset: number) => {
      context.save()
      context.strokeStyle = '#5a2c19'
      context.lineWidth = 8
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(inset, y + 4)
      context.lineTo(canvas.width - inset, y + 4)
      context.stroke()
      context.strokeStyle = '#ffdf86'
      context.lineWidth = 4
      context.beginPath()
      context.moveTo(inset, y)
      context.lineTo(canvas.width - inset, y)
      context.stroke()
      context.restore()
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'

    const panelGradient = context.createLinearGradient(0, 54, 0, 458)
    panelGradient.addColorStop(0, '#fff0b7')
    panelGradient.addColorStop(0.62, '#f3c968')
    panelGradient.addColorStop(1, '#d38a3c')
    context.fillStyle = panelGradient
    context.fillRect(92, 56, canvas.width - 184, canvas.height - 112)

    context.lineWidth = 16
    context.strokeStyle = '#2b1713'
    context.strokeRect(92, 56, canvas.width - 184, canvas.height - 112)
    context.lineWidth = 7
    context.strokeStyle = '#ffd975'
    context.strokeRect(118, 82, canvas.width - 236, canvas.height - 164)
    drawDivider(116, 292)
    drawDivider(396, 292)

    context.shadowColor = 'rgba(28, 13, 15, 0.22)'
    context.shadowBlur = 0
    context.shadowOffsetY = 5
    drawLetterSpaced('WELCOME TO', canvas.width / 2, 168, 108, 11, '#17121f')
    context.shadowOffsetY = 7
    drawLetterSpaced('THE MUSEUM', canvas.width / 2, 318, 160, 1, '#17121f')
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetY = 0

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }, [])

  if (!texture) return null

  return (
    <mesh position={position} rotation={[0, Math.PI, 0]} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function FloatingWelcomePlaque() {
  const groupRef = useRef<THREE.Group>(null)
  const outerShape = useMemo(() => createOrnateMuseumPlaqueShape(4.24, 1.2, 0), [])
  const carvedShape = useMemo(() => createOrnateMuseumPlaqueShape(4.0, 1.0, 1), [])
  const brassShape = useMemo(() => createOrnateMuseumPlaqueShape(3.66, 0.8, 2), [])
  const faceShape = useMemo(() => createOrnateMuseumPlaqueShape(3.42, 0.64, 3), [])
  const diamondShape = useMemo(() => createMuseumDiamondShape(0.22, 0.22), [])

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return

    const time = clock.elapsedTime
    const floatY = Math.sin(time * 1.08 + 0.4) * 0.028 + Math.sin(time * 0.58 + 1.3) * 0.016
    const driftX = Math.sin(time * 0.82 + 2.1) * 0.018
    const wobble = Math.sin(time * 1.22 + 0.5) * 0.014
    const targetScale = 1 + Math.sin(time * 0.82 + 1.8) * 0.008

    group.position.x = THREE.MathUtils.lerp(group.position.x, driftX, 0.22)
    group.position.y = THREE.MathUtils.lerp(group.position.y, 0.48 + floatY, 0.24)
    group.position.z = THREE.MathUtils.lerp(group.position.z, 0, 0.25)
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, wobble, 0.18)
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, targetScale, 0.24))
  })

  return (
    <group ref={groupRef} position={[0, 0.48, 0]}>
      <mesh position={[0.13, -0.13, 0.29]} scale={[1.02, 1.05, 1]} renderOrder={7}>
        <shapeGeometry args={[outerShape]} />
        <meshBasicMaterial color={INK} transparent opacity={0.62} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.09, 0.18]} scale={[4.18, 1.02, 1]} renderOrder={8}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color={INK} transparent opacity={0.26} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={[0.065, -0.072, 0.16]} scale={[1.01, 1.02, 1]} renderOrder={10}>
        <shapeGeometry args={[outerShape]} />
        <meshBasicMaterial color="#070406" transparent opacity={0.92} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.08]} renderOrder={13}>
        <shapeGeometry args={[outerShape]} />
        <meshBasicMaterial color={ROASTED_TEAK} transparent opacity={1} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-0.02, 0.055, 0.025]} renderOrder={15}>
        <shapeGeometry args={[carvedShape]} />
        <meshBasicMaterial color="#422010" transparent opacity={1} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, -0.03]} renderOrder={17}>
        <shapeGeometry args={[brassShape]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.98} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.028, -0.075]} renderOrder={18}>
        <shapeGeometry args={[faceShape]} />
        <meshBasicMaterial color="#d4933f" transparent opacity={1} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.31, -0.09]} scale={[3.1, 0.05, 1]} renderOrder={20}>
        <capsuleGeometry args={[0.5, 1, 8, 24]} />
        <meshBasicMaterial color="#fff0aa" transparent opacity={0.06} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.31, -0.068]} scale={[3, 0.06, 1]} renderOrder={20}>
        <capsuleGeometry args={[0.5, 1, 8, 24]} />
        <meshBasicMaterial color="#54220d" transparent opacity={0.4} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      {[-1.92, 1.92].map((x) => (
        <group key={`welcome-sign-corner-cap-${x}`} position={[x, 0.39, -0.06]}>
          <mesh scale={[0.21, 0.21, 1]} renderOrder={22}>
            <circleGeometry args={[1, 36]} />
            <meshBasicMaterial color={INK} transparent opacity={0.86} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.018]} scale={[0.155, 0.155, 1]} renderOrder={23}>
            <circleGeometry args={[1, 36]} />
            <meshBasicMaterial color={BRASS} transparent opacity={0.95} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.04]} scale={[0.72, 0.72, 1]} renderOrder={24}>
            <shapeGeometry args={[diamondShape]} />
            <meshBasicMaterial color="#fff1a8" transparent opacity={0.78} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[-1.92, 1.92].map((x) => (
        <group key={`welcome-sign-lower-cap-${x}`} position={[x, -0.39, -0.06]}>
          <mesh scale={[0.18, 0.18, 1]} renderOrder={22}>
            <circleGeometry args={[1, 36]} />
            <meshBasicMaterial color={INK} transparent opacity={0.76} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.022]} scale={[0.115, 0.115, 1]} renderOrder={23}>
            <circleGeometry args={[1, 36]} />
            <meshBasicMaterial color="#ffe29a" transparent opacity={0.84} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[-1.54, 1.54].map((x) => (
        <mesh key={`welcome-sign-side-diamond-${x}`} position={[x, 0, -0.115]} scale={[1.08, 1.08, 1]} renderOrder={24}>
          <shapeGeometry args={[diamondShape]} />
          <meshBasicMaterial color="#4d2412" transparent opacity={0.12} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.18]} scale={[4.08, 1.1, 1]} renderOrder={5}>
        <circleGeometry args={[1, 80]} />
        <meshBasicMaterial color="#ffd89b" transparent opacity={0.05} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <MuseumWelcomeTitlePlane width={3.54} height={0.88} position={[0, 0.018, -0.22]} />
    </group>
  )
}

function InfoDeskWindow({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return

    const time = clock.elapsedTime
    group.position.y = -0.12 + Math.sin(time * 0.86 + 0.4) * 0.018
    group.rotation.z = Math.sin(time * 0.92 + 0.7) * 0.006
  })

  if (!visible) return null

  return (
    <group
      ref={groupRef}
      position={[0, -0.08, -2.34]}
      scale={[0.92, 0.92, 0.92]}
      renderOrder={40}
      onPointerOver={(event) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        document.body.style.cursor = ''
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        document.body.style.cursor = ''
        onClose()
      }}
    >
      <mesh position={[0.1, -0.12, 0.2]} rotation={[0, 0, -0.018]} scale={[2.12, 1.32, 1]} renderOrder={35}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.22} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={[0.05, -0.04, 0.08]} scale={[3.36, 2.12, 0.16]} renderOrder={40}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, 0, 0.02]} scale={[3.12, 1.9, 0.18]} renderOrder={42}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4b2715" emissive="#160806" emissiveIntensity={0.08} roughness={0.44} metalness={0.06} />
      </mesh>
      <mesh position={[0, 0, -0.08]} scale={[2.82, 1.62, 0.1]} renderOrder={44}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e8c382" emissive="#8f551e" emissiveIntensity={0.1} roughness={0.36} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.02, -0.245]} scale={[2.48, 1.36, 1]} renderOrder={68}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#e8c382" transparent opacity={0.99} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.68, -0.16]} scale={[2.44, 0.22, 0.06]} renderOrder={46}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ROASTED_TEAK} emissive="#321607" emissiveIntensity={0.08} roughness={0.48} metalness={0.04} />
      </mesh>
      <mesh position={[-0.72, -0.08, -0.17]} scale={[0.035, 1.14, 0.035]} renderOrder={47}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BRASS} emissive="#8e5f17" emissiveIntensity={0.12} roughness={0.3} metalness={0.26} />
      </mesh>
      <mesh position={[0, -0.02, -0.2]} scale={[3.42, 2.04, 1]} renderOrder={34}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color="#ffd89b" transparent opacity={0.12} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {[-1.34, 1.34].map((x) => (
        <mesh key={`info-window-bolt-${x}`} position={[x, 0.68, -0.17]} scale={[0.07, 0.07, 0.025]} renderOrder={49}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={BRASS} emissive="#8e5f17" emissiveIntensity={0.14} roughness={0.28} metalness={0.26} />
        </mesh>
      ))}
      <WayfindingTextPlane
        width={2.46}
        height={1.44}
        position={[0.14, -0.03, -0.23]}
        renderOrder={72}
        lines={[
          { text: 'FOYER MAP', size: 92, y: 58, fill: SOFT_INK },
          { text: 'LEFT - SUNNY COURTYARD', size: 56, y: 146, fill: SOFT_INK },
          { text: 'RIGHT - BURN ROOM', size: 56, y: 216, fill: SOFT_INK },
          { text: 'CHOOSE A SOFT ARROW', size: 44, y: 282, fill: SOFT_INK },
        ]}
      />
    </group>
  )
}

function MuseumWayfindingSign({ infoOpen, setInfoOpen, transitionChoice, onDestinationSelect }: InfoPanelControls & HomeRouteTransitionControls) {
  const rootRef = useRef<THREE.Group>(null)
  const [activeChoice, setActiveChoice] = useState<WayfindingChoice | null>(null)

  useFrame(({ clock }) => {
    const root = rootRef.current
    if (!root) return

    const time = clock.elapsedTime
    root.position.x = Math.sin(time * 0.56) * 0.026
    root.position.y = 1.82 + Math.sin(time * 0.72 + 0.4) * 0.026
    root.position.z = -1.72 + Math.sin(time * 0.48 + 1.1) * 0.028
    root.rotation.z = Math.sin(time * 0.52) * 0.006
  })

  const handleSelect = (choice: WayfindingChoice) => {
    if (transitionChoice) return
    setActiveChoice(choice)
    setInfoOpen(false)
    onDestinationSelect(choice)
  }

  return (
    <>
      <group ref={rootRef} position={[0, 1.82, -1.72]} scale={[1.18, 1.18, 1.18]}>
        <mesh position={[0, -0.18, -0.26]} scale={[6.16, 2.08, 1]} renderOrder={-2}>
          <circleGeometry args={[1, 84]} />
          <meshBasicMaterial color="#fff0bc" transparent opacity={0.09} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <FloatingWelcomePlaque />
        {!infoOpen ? (
          <group scale={[1.08, 1.08, 1.08]}>
            <WayfindingArrowPlaque choice="burn" direction="left" label="BURN ROOM" position={[-1.58, -0.94, -0.06]} idlePhase={2.1} baseScale={0.78} transitionChoice={transitionChoice} active={activeChoice === 'burn' || transitionChoice === 'burn'} onSelect={handleSelect} />
            <WayfindingArrowPlaque choice="courtyard" direction="right" label="EXPLORE COURTYARD" position={[1.58, -0.94, -0.06]} idlePhase={0.6} baseScale={0.78} transitionChoice={transitionChoice} active={activeChoice === 'courtyard' || transitionChoice === 'courtyard'} onSelect={handleSelect} />
            <WayfindingSelectionBurst transitionChoice={transitionChoice} />
          </group>
        ) : null}
      </group>
      <InfoDeskWindow visible={false} onClose={() => setInfoOpen(false)} />
    </>
  )
}

function ToonSwingDoor({ side, transitionChoice }: { side: 'left' | 'right'; transitionChoice?: WayfindingChoice | null }) {
  const sign = side === 'left' ? -1 : 1
  const doorRef = useRef<THREE.Group>(null)
  const transitionOpenRef = useRef(0)
  const isIncinerator = side === 'left'
  const doorChoice: WayfindingChoice = isIncinerator ? 'burn' : 'courtyard'
  const accent = isIncinerator ? '#ff7a2b' : '#fff0a6'
  const frameColor = isIncinerator ? '#4b5354' : ROASTED_TEAK
  const jambColor = isIncinerator ? '#8a9087' : '#d7c6a0'
  const doorFrameColor = isIncinerator ? '#2d3335' : ROASTED_TEAK
  const doorColor = isIncinerator ? '#555f60' : '#a96838'
  const upperPanelColor = isIncinerator ? '#737c7c' : '#d7f5dc'
  const lowerPanelColor = isIncinerator ? '#3a4244' : '#a85f31'
  const railColor = isIncinerator ? '#d2a34a' : TEAK_LIGHT
  const doorMetalness = isIncinerator ? 0.34 : 0.02
  const doorRoughness = isIncinerator ? 0.34 : 0.58

  useFrame((state, dt) => {
    const time = state.clock.elapsedTime
    const cycle = 0.5 + Math.sin(time * 0.52 + (side === 'left' ? 0.2 : 2.4)) * 0.5
    const eased = cycle * cycle * (3 - cycle * 2)
    const isTransitionTarget = transitionChoice === doorChoice
    transitionOpenRef.current = THREE.MathUtils.lerp(transitionOpenRef.current, isTransitionTarget ? 1 : 0, 1 - Math.exp(-dt * 5.4))
    const transitionOpen = transitionOpenRef.current
    const idleOpen = transitionChoice ? 0.1 : 0.12 + eased * 0.58
    const openAngle = THREE.MathUtils.lerp(idleOpen, 1.36, transitionOpen)

    if (doorRef.current) doorRef.current.rotation.y = -sign * openAngle
  })

  return (
    <group position={[sign * 4.88, -0.76, -0.5]} rotation={[0, sign * 0.07, 0]}>
      <DoorDestinationPlaque
        side={side}
        label={isIncinerator ? 'INCINERATOR' : 'COURTYARD EXIT'}
        background={isIncinerator ? '#293033' : '#c98543'}
        trim={isIncinerator ? '#f2b34c' : BRASS}
        textColor={isIncinerator ? '#ffd489' : '#fff6cb'}
        glow={isIncinerator ? '#ff6d2b' : '#fff3aa'}
      />
      <mesh position={[0.035 * -sign, -0.02, 0]} scale={[0.08, 2.76, 1.42]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={frameColor} emissive={isIncinerator ? '#1a1f20' : '#160d07'} emissiveIntensity={0.03} roughness={isIncinerator ? 0.38 : 0.68} metalness={isIncinerator ? 0.26 : 0.04} />
      </mesh>
      <mesh position={[0, -0.04, -0.7]} scale={[0.13, 2.72, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={jambColor} emissive={isIncinerator ? '#202626' : '#2d1b0b'} emissiveIntensity={0.018} roughness={isIncinerator ? 0.4 : 0.66} metalness={isIncinerator ? 0.18 : 0.02} />
      </mesh>
      <mesh position={[0, -0.04, 0.7]} scale={[0.13, 2.72, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={jambColor} emissive={isIncinerator ? '#202626' : '#2d1b0b'} emissiveIntensity={0.018} roughness={isIncinerator ? 0.4 : 0.66} metalness={isIncinerator ? 0.18 : 0.02} />
      </mesh>
      <mesh position={[0, 1.32, 0]} scale={[0.14, 0.16, 1.52]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={frameColor} emissive={isIncinerator ? '#141819' : '#160d07'} emissiveIntensity={0.032} roughness={isIncinerator ? 0.38 : 0.52} metalness={isIncinerator ? 0.26 : 0.06} />
      </mesh>
      <mesh position={[0, -1.4, 0]} scale={[0.15, 0.12, 1.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={isIncinerator ? '#f0a23e' : BRASS} emissive={isIncinerator ? '#74330d' : '#3f2709'} emissiveIntensity={0.06} roughness={0.42} metalness={isIncinerator ? 0.22 : 0.16} />
      </mesh>
      <mesh position={[0.012 * -sign, -1.47, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.64, 0.98, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color={INK} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0.05 * -sign, 1.5, 0]} scale={[0.18, 0.22, 1.72]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={frameColor} roughness={isIncinerator ? 0.36 : 0.52} metalness={isIncinerator ? 0.24 : 0.04} />
      </mesh>
      <mesh position={[0.07 * -sign, 1.36, 0]} scale={[0.2, 0.035, 1.6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={isIncinerator ? '#f0a23e' : BRASS} emissive={isIncinerator ? '#74330d' : '#3c2508'} emissiveIntensity={0.06} roughness={0.38} metalness={0.18} />
      </mesh>
      <group ref={doorRef} position={[0, 0, -0.58]}>
        <mesh position={[0, 0, 0.54]} scale={[0.235, 2.55, 1.25]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={SOFT_INK} transparent opacity={isIncinerator ? 0.28 : 0.2} />
        </mesh>
        <mesh position={[0, 0, 0.56]} scale={[0.2, 2.42, 1.16]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={doorFrameColor} roughness={isIncinerator ? 0.34 : 0.56} metalness={isIncinerator ? 0.28 : 0.04} />
        </mesh>
        <mesh position={[0.012 * -sign, 0, 0.56]} scale={[0.14, 2.26, 1.02]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={doorColor} emissive={isIncinerator ? '#1a2224' : '#2b1507'} emissiveIntensity={isIncinerator ? 0.035 : 0.05} roughness={doorRoughness} metalness={doorMetalness} />
        </mesh>
        <ToonBox position={[0.09 * -sign, 0.34, 0.58]} scale={[0.032, 0.68, 0.56]} color={upperPanelColor} emissive={isIncinerator ? '#1f292a' : '#b8ffe3'} emissiveIntensity={isIncinerator ? 0.025 : 0.12} roughness={isIncinerator ? 0.34 : 0.38} metalness={isIncinerator ? 0.22 : 0.04} outlineOpacity={0.16} outlineScale={[1.28, 1.04, 1.035]} />
        <ToonBox position={[0.09 * -sign, -0.58, 0.58]} scale={[0.032, 0.56, 0.54]} color={lowerPanelColor} emissive={isIncinerator ? '#101516' : '#321607'} emissiveIntensity={0.026} roughness={isIncinerator ? 0.36 : 0.6} metalness={isIncinerator ? 0.24 : 0.04} outlineOpacity={0.16} outlineScale={[1.28, 1.04, 1.035]} />
        <mesh position={[0.11 * -sign, 0.97, 0.56]} scale={[0.038, 0.055, 0.86]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={railColor} emissive={isIncinerator ? '#5a250a' : '#3d2608'} emissiveIntensity={0.04} roughness={isIncinerator ? 0.34 : 0.46} metalness={isIncinerator ? 0.2 : 0.08} />
        </mesh>
        <mesh position={[0.11 * -sign, -1.1, 0.56]} scale={[0.038, 0.055, 0.86]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={railColor} emissive={isIncinerator ? '#5a250a' : '#3d2608'} emissiveIntensity={0.04} roughness={isIncinerator ? 0.34 : 0.46} metalness={isIncinerator ? 0.2 : 0.08} />
        </mesh>
        <mesh position={[0.13 * -sign, -0.18, 1.0]} scale={[0.045, 0.12, 0.045]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={isIncinerator ? '#f0a23e' : BRASS} emissive={isIncinerator ? '#85370d' : '#6d4712'} emissiveIntensity={0.09} roughness={0.32} metalness={0.22} />
        </mesh>
        {[-0.78, -0.08, 0.62].map((y) => (
          <mesh key={`toon-door-hinge-${side}-${y}`} position={[0.13 * sign, y, -0.02]} scale={[0.045, 0.18, 0.055]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={isIncinerator ? '#d6a354' : BRASS} emissive="#3c2508" emissiveIntensity={0.055} roughness={isIncinerator ? 0.3 : 0.42} metalness={isIncinerator ? 0.26 : 0.16} />
          </mesh>
        ))}
        <mesh position={[0.145 * -sign, 0.58, 0.26]} scale={[0.026, 0.08, 0.26]} rotation={[0, 0, 0.12 * sign]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={isIncinerator ? '#ffb14a' : '#fff0bc'} transparent opacity={isIncinerator ? 0.28 : 0.22} />
        </mesh>
        {isIncinerator ? (
          <>
            {[-0.42, 0.42].map((z) =>
              [-0.86, -0.32, 0.26, 0.82].map((y) => (
                <mesh key={`incinerator-rivet-${z}-${y}`} position={[0.13 * -sign, y, z + 0.56]} scale={[0.026, 0.036, 0.026]}>
                  <sphereGeometry args={[1, 12, 8]} />
                  <meshStandardMaterial color="#d7c8a0" emissive="#4f3712" emissiveIntensity={0.035} roughness={0.32} metalness={0.34} />
                </mesh>
              )),
            )}
            <mesh position={[0.142 * -sign, -0.03, 0.56]} scale={[0.018, 1.46, 0.026]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ff6e2b" transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0.15 * -sign, 0.65, 0.56]} scale={[0.024, 0.075, 0.78]} rotation={[0, 0, 0.16 * sign]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#f2b34c" emissive="#6e2d0b" emissiveIntensity={0.08} roughness={0.32} metalness={0.18} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0.142 * -sign, 0.36, 0.58]} scale={[0.016, 0.78, 0.48]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#e8fff3" emissive="#d6ffe8" emissiveIntensity={0.28} roughness={0.22} metalness={0.02} transparent opacity={0.62} />
            </mesh>
            <mesh position={[0.155 * -sign, 0.28, 0.58]} scale={[0.012, 1.24, 0.82]} renderOrder={-1}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#fff0a8" transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0.16 * -sign, 0.82, 0.54]} scale={[0.016, 0.08, 0.42]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#78cfa5" emissive="#3edb9f" emissiveIntensity={0.08} roughness={0.4} />
            </mesh>
          </>
        )}
      </group>
      <mesh position={[0.04 * -sign, 0.05, 0]} scale={[0.02, 2.44, 1.26]} renderOrder={-1}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={accent} transparent opacity={isIncinerator ? 0.048 : 0.052} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.06 * -sign, 0.04, -0.04]} scale={[0.02, 2.82, 1.74]} renderOrder={-2}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={isIncinerator ? '#ff5b22' : '#fff2a8'} transparent opacity={isIncinerator ? 0.018 : 0.03} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

type DoorTransitionFlameSlashSpec = {
  x: number
  y: number
  scaleY: number
  phase: number
}

function DoorTransitionFlameSlash({ slash, index }: { slash: DoorTransitionFlameSlashSpec; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return

    const wave = Math.sin(clock.elapsedTime * 5.2 + slash.phase)
    mesh.rotation.z = -0.2 + wave * 0.16
    mesh.scale.y = slash.scaleY * (0.88 + Math.max(0, wave) * 0.2)

    const material = mesh.material as THREE.MeshBasicMaterial
    material.opacity = 0.46 + Math.max(0, wave) * 0.18
  })

  return (
    <mesh ref={meshRef} position={[slash.x, slash.y, -0.2]} rotation={[0, 0, -0.2]} scale={[0.07, slash.scaleY, 0.018]} renderOrder={24}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={index % 2 === 0 ? '#ffd25a' : '#ff361a'} transparent opacity={0.58} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

function DoorTransitionEffects({ transitionChoice }: { transitionChoice: WayfindingChoice | null }) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const washRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const elapsedRef = useRef(0)
  const flameSlashes = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => ({
        x: -0.42 + index * 0.14,
        y: -0.44 + (index % 4) * 0.18,
        scaleY: 0.38 + (index % 3) * 0.12,
        phase: index * 0.7,
      })),
    [],
  )

  useFrame((_, dt) => {
    if (!transitionChoice) {
      elapsedRef.current = 0
      return
    }

    elapsedRef.current = Math.min(3, elapsedRef.current + dt)
    const t = Math.min(1, elapsedRef.current / 2.35)
    const eased = t * t * (3 - t * 2)
    const pulse = 0.5 + Math.sin(elapsedRef.current * 8.4) * 0.5

    if (groupRef.current) {
      groupRef.current.scale.setScalar(0.74 + eased * 1.22 + pulse * 0.03)
      groupRef.current.position.z = -0.76 - eased * 0.2
    }
    if (coreRef.current) {
      const material = coreRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.16 + eased * 0.58 + pulse * 0.08
    }
    if (washRef.current) {
      const material = washRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.08 + eased * 0.34
      washRef.current.scale.set(1.1 + eased * 2.4, 1.7 + eased * 2.8, 1)
    }
    if (lightRef.current) lightRef.current.intensity = 0.8 + eased * 5.4 + pulse * 0.35
  })

  if (!transitionChoice) return null

  const sign = transitionChoice === 'burn' ? -1 : 1
  const isBurn = transitionChoice === 'burn'
  const coreColor = isBurn ? '#ff4a1d' : '#fffdf2'
  const washColor = isBurn ? '#ff7a24' : '#dffff0'

  return (
    <group ref={groupRef} position={[sign * 4.78, -0.18, -0.76]} rotation={[0, sign * 0.08, 0]}>
      <pointLight ref={lightRef} position={[0, 0.08, -0.08]} color={isBurn ? '#ff5a22' : '#fff8d6'} distance={4.6} decay={1.35} intensity={1} />
      <mesh ref={washRef} position={[0, 0.18, -0.1]} scale={[1.1, 1.7, 1]} renderOrder={18}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={washColor} transparent opacity={0.1} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={coreRef} position={[0, 0.02, -0.16]} scale={[0.58, 1.02, 1]} renderOrder={22}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.26} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {isBurn ? (
        flameSlashes.map((slash, index) => (
          <DoorTransitionFlameSlash key={`door-transition-flame-${index}`} slash={slash} index={index} />
        ))
      ) : (
        [-0.34, 0, 0.34].map((x, index) => (
          <mesh key={`door-transition-white-ray-${index}`} position={[x, 0.04, -0.22]} rotation={[0, 0, x * -0.22]} scale={[0.09, 1.08 + index * 0.18, 0.018]} renderOrder={24}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.42} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))
      )}
    </group>
  )
}

function SideWallReturn({ side }: { side: 'left' | 'right' }) {
  const sign = side === 'left' ? -1 : 1
  const color = side === 'left' ? '#dfc79e' : '#e5cfaa'
  const inlays = useMemo(() => [-1.72, 1.72] as const, [])

  return (
    <group position={[sign * 5.16, 0.12, 0.34]} rotation={[0, sign * 0.065, 0]}>
      <mesh scale={[0.16, 5.58, 5.84]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} emissive="#3a2410" emissiveIntensity={0.034} roughness={0.78} />
      </mesh>
      <mesh position={[-sign * 0.104, 0, 0]} scale={[0.026, 4.9, 5.22]} renderOrder={-4}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#fff1c4" transparent opacity={0.045} depthWrite={false} />
      </mesh>
      {inlays.map((z) => (
        <mesh key={`side-quiet-inlay-${side}-${z}`} position={[-sign * 0.098, 0.02, z]} scale={[0.034, 4.28, 0.052]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={TEAK} emissive="#261207" emissiveIntensity={0.02} roughness={0.58} metalness={0.02} />
        </mesh>
      ))}
      <mesh position={[0, -2.28, 0]} scale={[0.2, 0.14, 5.34]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ROASTED_TEAK} emissive="#241607" emissiveIntensity={0.034} roughness={0.52} metalness={0.06} />
      </mesh>
      <mesh position={[0, -2.13, 0]} scale={[0.22, 0.026, 5.18]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={TEAK_LIGHT} emissive="#51340c" emissiveIntensity={0.034} roughness={0.44} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.48, 0]} scale={[0.2, 0.14, 5.44]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ROASTED_TEAK} emissive="#110806" emissiveIntensity={0.034} roughness={0.52} />
      </mesh>
      <mesh position={[0, 2.31, 0]} scale={[0.22, 0.034, 5.22]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={TEAK_LIGHT} emissive="#51340c" emissiveIntensity={0.032} roughness={0.44} metalness={0.08} />
      </mesh>
    </group>
  )
}

function RoomDepthJoinery() {
  return (
    <group>
      <mesh position={[0, -2.452, 2.54]} rotation={[-Math.PI / 2, 0, 0]} scale={[9.82, 0.48, 1]} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={INK} transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <mesh position={[-4.52, -2.448, 0.48]} rotation={[-Math.PI / 2, 0, -0.36]} scale={[0.38, 5.46, 1]} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={INK} transparent opacity={0.085} depthWrite={false} />
      </mesh>
      <mesh position={[4.52, -2.448, 0.48]} rotation={[-Math.PI / 2, 0, 0.36]} scale={[0.38, 5.46, 1]} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={INK} transparent opacity={0.085} depthWrite={false} />
      </mesh>
      <mesh position={[-4.58, -2.442, -1.52]} rotation={[-Math.PI / 2, 0, -0.03]} scale={[0.72, 1.92, 1]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={INK} transparent opacity={0.055} depthWrite={false} />
      </mesh>
      <mesh position={[4.58, -2.442, -1.52]} rotation={[-Math.PI / 2, 0, 0.03]} scale={[0.72, 1.92, 1]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={INK} transparent opacity={0.055} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.441, 2.16]} rotation={[-Math.PI / 2, 0, 0]} scale={[5.68, 0.2, 1]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1f0e07" transparent opacity={0.075} depthWrite={false} />
      </mesh>
      <mesh position={[-4.86, 2.28, 0.72]} rotation={[0, -0.36, 0]} scale={[0.09, 0.14, 3.92]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8f6844" emissive="#1f1007" emissiveIntensity={0.022} roughness={0.62} />
      </mesh>
      <mesh position={[4.86, 2.28, 0.72]} rotation={[0, 0.36, 0]} scale={[0.09, 0.14, 3.92]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#946d49" emissive="#1f1007" emissiveIntensity={0.022} roughness={0.62} />
      </mesh>
      <mesh position={[-4.78, 2.08, 0.74]} rotation={[0, -0.36, 0]} scale={[0.06, 0.034, 3.86]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BRASS} emissive="#51340c" emissiveIntensity={0.055} roughness={0.38} metalness={0.16} />
      </mesh>
      <mesh position={[4.78, 2.08, 0.74]} rotation={[0, 0.36, 0]} scale={[0.06, 0.034, 3.86]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BRASS} emissive="#51340c" emissiveIntensity={0.055} roughness={0.38} metalness={0.16} />
      </mesh>
    </group>
  )
}

function StageBackdrop({ infoOpen, setInfoOpen, transitionChoice, onDestinationSelect }: HomeStageProps) {
  const floorSeamsX = useMemo(() => [-2.2, 0, 2.2] as const, [])
  const floorSeamsZ = useMemo(() => [-1.08, 1.76] as const, [])
  const wallPanels = useMemo(
    () =>
      [
        [-3.56, 0.08, 1.26, 2.42, '#f5ddb7'],
        [3.56, 0.08, 1.26, 2.42, '#f0d3a4'],
      ] as const,
    [],
  )
  const coveLights = useMemo(
    () =>
      [
        [-3.72, '#ffe1a3'],
        [0, '#fff0bd'],
        [3.72, '#ffe1a3'],
      ] as const,
    [],
  )

  return (
    <group>
      <mesh position={[0, 0.34, 2.94]} scale={[10.92, 5.98, 0.14]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ead9bd" emissive="#5b3314" emissiveIntensity={0.044} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.45, 2.66]} scale={[7.8, 4.28, 1]} renderOrder={-16}>
        <circleGeometry args={[1, 112]} />
        <meshBasicMaterial color="#fff0c8" transparent opacity={0.07} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -1.5, 2.83]} scale={[10.74, 1.32, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b8743d" emissive="#4a210b" emissiveIntensity={0.032} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.86, 2.766]} scale={[10.32, 0.032, 1]} renderOrder={-12}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff2c2" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.02, 2.764]} scale={[10.44, 0.36, 1]} renderOrder={-13}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#321406" transparent opacity={0.075} depthWrite={false} />
      </mesh>
      <mesh position={[0, -1.18, 2.762]} scale={[10.38, 0.045, 1]} renderOrder={-12}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#6b3214" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {wallPanels.map(([x, y, width, height, color], index) => (
        <group key={`museum-wall-panel-${index}`}>
          <mesh position={[x + 0.055, y - 0.055, 2.724]} scale={[width * 1.02, height * 1.01, 1]} renderOrder={-15}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={INK} transparent opacity={0.038} depthWrite={false} />
          </mesh>
          <mesh position={[x, y, 2.735]} scale={[width, height, 1]} renderOrder={-13}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={color} transparent opacity={0.118} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[x, y + height * 0.5, 2.748]} scale={[width + 0.08, 0.04, 1]} renderOrder={-11}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#fff2c5" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <mesh position={[x, y - height * 0.5, 2.748]} scale={[width + 0.08, 0.038, 1]} renderOrder={-11}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#87502a" transparent opacity={0.14} depthWrite={false} />
          </mesh>
          <mesh position={[x - width * 0.5, y, 2.746]} scale={[0.04, height + 0.06, 1]} renderOrder={-11}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#b57945" transparent opacity={0.13} depthWrite={false} />
          </mesh>
          <mesh position={[x + width * 0.5, y, 2.746]} scale={[0.04, height + 0.06, 1]} renderOrder={-11}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#fff2c5" transparent opacity={0.12} depthWrite={false} />
          </mesh>
          <mesh position={[x, y + height * 0.18, 2.75]} scale={[width * 0.76, 0.018, 1]} renderOrder={-10}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#8b5632" transparent opacity={0.11} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[-4.72, 0.1, 2.758]} scale={[0.26, 4.58, 1]} renderOrder={-13}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#351708" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh position={[4.72, 0.1, 2.758]} scale={[0.26, 4.58, 1]} renderOrder={-13}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff0bd" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      <TeakSlatPanel position={[-3.78, 0.05, 2.82]} width={0.46} height={2.36} slatCount={1} renderOrder={-5} />
      <TeakSlatPanel position={[3.78, 0.05, 2.82]} width={0.46} height={2.36} slatCount={1} renderOrder={-5} />
      <SideWallReturn side="left" />
      <SideWallReturn side="right" />
      <RoomDepthJoinery />
      <ToonSwingDoor side="left" transitionChoice={transitionChoice} />
      <ToonSwingDoor side="right" transitionChoice={transitionChoice} />
      <DoorTransitionEffects transitionChoice={transitionChoice} />
      <RearHallwayPortal />
      <MuseumWayfindingSign infoOpen={infoOpen} setInfoOpen={setInfoOpen} transitionChoice={transitionChoice} onDestinationSelect={onDestinationSelect} />

      <ToonBox position={[0, -0.62, 2.71]} scale={[10.42, 0.07, 0.055]} color={ROASTED_TEAK} roughness={0.5} outlineOpacity={0.18} outlineScale={[1.003, 1.18, 1.12]} />
      <ToonBox position={[0, -0.78, 2.704]} scale={[10.2, 0.034, 0.04]} color={BRASS} emissive="#41280b" emissiveIntensity={0.06} roughness={0.4} metalness={0.14} outlineOpacity={0.14} outlineScale={[1.003, 1.28, 1.1]} />
      <ToonBox position={[0, -2.16, 2.7]} scale={[10.46, 0.16, 0.09]} color={ROASTED_TEAK} emissive="#241607" emissiveIntensity={0.034} roughness={0.48} metalness={0.06} outlineOpacity={0.2} outlineScale={[1.003, 1.08, 1.1]} />
      <ToonBox position={[0, -2.0, 2.695]} scale={[10.28, 0.032, 0.04]} color={BRASS} emissive="#3c2508" emissiveIntensity={0.05} roughness={0.4} metalness={0.14} outlineOpacity={0.14} outlineScale={[1.003, 1.32, 1.1]} />
      <ToonBox position={[0, 2.48, 2.72]} scale={[10.64, 0.18, 0.08]} color={ROASTED_TEAK} emissive="#110806" emissiveIntensity={0.034} roughness={0.52} outlineOpacity={0.2} outlineScale={[1.003, 1.08, 1.1]} />
      <ToonBox position={[0, 2.3, 2.7]} scale={[10.44, 0.055, 0.05]} color={BRASS} emissive="#3c2508" emissiveIntensity={0.05} roughness={0.4} metalness={0.14} outlineOpacity={0.14} outlineScale={[1.003, 1.22, 1.1]} />
      {coveLights.map(([x, color], index) => (
        <group key={`foyer-cove-light-${index}`} position={[x, 2.25, 2.66]}>
          <ToonBox position={[0, 0, 0]} scale={[0.74, 0.11, 0.04]} color="#755035" roughness={0.48} metalness={0.05} outlineOpacity={0.22} outlineScale={[1.04, 1.12, 1.08]} />
          <mesh position={[0, -0.1, 0.03]} scale={[0.62, 0.08, 1]} renderOrder={-7}>
            <circleGeometry args={[1, 48]} />
            <meshBasicMaterial color={color} transparent opacity={0.24} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[0, -0.3, 0.02]} scale={[1.2, 0.5, 1]} renderOrder={-8}>
            <circleGeometry args={[1, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.074} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, -2.52, -0.28]} rotation={[-Math.PI / 2, 0, 0]} scale={[11.84, 7.72, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#c18d5c" emissive="#3c1c08" emissiveIntensity={0.038} roughness={0.78} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.508, 1.68]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.62, 2.4, 1]} renderOrder={-14}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#7e4d2a" emissive="#211006" emissiveIntensity={0.05} roughness={0.84} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-3.5, -2.506, 0.52]} rotation={[-Math.PI / 2, 0, -0.64]} scale={[2.86, 0.72, 1]} renderOrder={-14}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#8f5a33" emissive="#241206" emissiveIntensity={0.045} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[3.5, -2.506, 0.52]} rotation={[-Math.PI / 2, 0, 0.64]} scale={[2.86, 0.72, 1]} renderOrder={-14}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#8a542f" emissive="#241206" emissiveIntensity={0.045} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.502, 0.34]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.38, 6.32, 1]} renderOrder={-13}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#312c25" transparent opacity={0.038} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.494, -0.16]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.08, 5.18, 1]} renderOrder={-7}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff1ba" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.488, 0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.5, 4.08, 1]} renderOrder={-6}>
        <ringGeometry args={[0.72, 1, 72]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {floorSeamsX.map((x, index) => (
        <mesh key={`museum-floor-seam-x-${x}`} position={[x, -2.486, -0.28]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.014, 6.16, 1]} renderOrder={-4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={index % 2 === 0 ? '#7a4625' : '#d4a06b'} transparent opacity={0.115} depthWrite={false} />
        </mesh>
      ))}
      {floorSeamsZ.map((z) => (
        <mesh key={`museum-floor-seam-z-${z}`} position={[0, -2.484, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[10.84, 0.014, 1]} renderOrder={-4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#704020" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      ))}
      {[-0.88, 0.88].map((x) => (
        <mesh key={`rear-hall-brass-guide-${x}`} position={[x, -2.478, 0.72]} rotation={[-Math.PI / 2, 0, x < 0 ? -0.085 : 0.085]} scale={[0.028, 4.2, 1]} renderOrder={-2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={BRASS} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}
      {[-1, 1].map((sign) => (
        <mesh key={`side-hall-brass-guide-${sign}`} position={[sign * 3.05, -2.476, 0.52]} rotation={[-Math.PI / 2, 0, sign * 0.72]} scale={[2.36, 0.026, 1]} renderOrder={-2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={BRASS} transparent opacity={0.14} depthWrite={false} />
        </mesh>
      ))}

      <mesh position={[0, -2.505, 2.72]} rotation={[-Math.PI / 2, 0, 0]} scale={[8.72, 0.32, 1]} renderOrder={-3}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={INK} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.499, 1.92]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.18, 0.18, 1]} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff1ba" transparent opacity={0.065} depthWrite={false} />
      </mesh>
      {([
        [-3.06, '#ffe0a8'],
        [3.06, '#ffe8bb'],
      ] as const).map(([x, color]) => (
        <mesh key={`back-wall-sconce-floor-glow-${x}`} position={[x, -2.492, 1.54]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.72, 1.16, 1]} renderOrder={-4}>
          <circleGeometry args={[1, 80]} />
          <meshBasicMaterial color={color} transparent opacity={0.105} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <WallSconce x={-3.06} color="#ffe0a8" />
      <WallSconce x={3.06} color="#ffe8bb" />
    </group>
  )
}

function MuseumBench({ x, z, rotationY = 0 }: { x: number; z: number; rotationY?: number }) {
  const legOffsets = [
    [-0.5, -0.13],
    [0.5, -0.13],
    [-0.5, 0.13],
    [0.5, 0.13],
  ] as const

  return (
    <group position={[x, -2.16, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, -0.27, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.46, 0.52, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.095} depthWrite={false} />
      </mesh>
      <ToonBox
        position={[0, 0.22, 0]}
        scale={[1.28, 0.16, 0.42]}
        color={TEAK_LIGHT}
        emissive="#3f1d09"
        emissiveIntensity={0.03}
        roughness={0.54}
        metalness={0.03}
        outlineOpacity={0.16}
        outlineScale={[1.025, 1.14, 1.055]}
      />
      <ToonBox
        position={[0, 0.32, -0.045]}
        scale={[1.12, 0.04, 0.31]}
        color="#d79554"
        emissive="#5a2c0e"
        emissiveIntensity={0.035}
        roughness={0.46}
        metalness={0.06}
        outlineOpacity={0.08}
        outlineScale={[1.01, 1.22, 1.04]}
      />
      {legOffsets.map(([legX, legZ]) => (
        <ToonBox
          key={`museum-bench-leg-${x}-${legX}-${legZ}`}
          position={[legX, -0.05, legZ]}
          scale={[0.09, 0.42, 0.09]}
          color={ROASTED_TEAK}
          emissive="#1c0d06"
          emissiveIntensity={0.024}
          roughness={0.56}
          metalness={0.05}
          outlineOpacity={0.12}
          outlineScale={[1.08, 1.035, 1.08]}
        />
      ))}
      <ToonBox
        position={[0, -0.29, 0]}
        scale={[1.1, 0.045, 0.28]}
        color={BRASS}
        emissive="#5d3b0f"
        emissiveIntensity={0.075}
        roughness={0.36}
        metalness={0.18}
        outlineOpacity={0.08}
        outlineScale={[1.015, 1.24, 1.08]}
      />
    </group>
  )
}

function AmbientVibeLayer() {
  return (
    <group>
      <mesh position={[0, -2.416, -0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.18, 4.18, 1]} renderOrder={-8}>
        <circleGeometry args={[1, 144]} />
        <meshBasicMaterial color={SOFT_INK} transparent opacity={0.105} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.409, -0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.92, 3.92, 1]} renderOrder={-7}>
        <circleGeometry args={[1, 160]} />
        <meshStandardMaterial color="#a75b38" emissive="#351407" emissiveIntensity={0.04} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.401, -0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.58, 3.58, 1]} renderOrder={-6}>
        <ringGeometry args={[0.88, 1, 144]} />
        <meshBasicMaterial color={BRASS} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.398, -0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.82, 2.82, 1]} renderOrder={-6}>
        <circleGeometry args={[1, 128]} />
        <meshBasicMaterial color="#d69654" transparent opacity={0.24} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.394, -0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.5, 2.5, 1]} renderOrder={-5}>
        <ringGeometry args={[0.66, 0.69, 132]} />
        <meshBasicMaterial color="#fff0bc" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-0.82, -2.39, -0.78]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.88, 0.88, 1]} renderOrder={-4}>
        <circleGeometry args={[1, 80]} />
        <meshBasicMaterial color="#f3c978" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.92, -2.388, -0.22]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.58, 0.58, 1]} renderOrder={-4}>
        <circleGeometry args={[1, 72]} />
        <meshBasicMaterial color={ROASTED_TEAK} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.384, -0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.28, 1.28, 1]} renderOrder={-4}>
        <ringGeometry args={[0.72, 1, 104]} />
        <meshBasicMaterial color="#ffe3a1" transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <ToonTubeStroke
        points={[
          [-1.86, -2.335, 0.26],
          [-0.92, -2.33, 0.06],
          [0, -2.326, -0.02],
          [0.92, -2.33, 0.06],
          [1.86, -2.335, 0.26],
        ]}
        color="#fff0bc"
        opacity={0.18}
        radius={0.008}
        renderOrder={-1}
      />
      <MuseumBench x={-4.28} z={-1.96} rotationY={Math.PI / 2 + 0.018} />
      <MuseumBench x={4.28} z={-1.96} rotationY={Math.PI / 2 - 0.018} />
    </group>
  )
}

function CharacterHalo() {
  const mintGlowRef = useRef<THREE.MeshBasicMaterial>(null)
  const pinkGlowRef = useRef<THREE.MeshBasicMaterial>(null)
  const goldGlowRef = useRef<THREE.MeshBasicMaterial>(null)
  const mintLightRef = useRef<THREE.PointLight>(null)
  const coralLightRef = useRef<THREE.PointLight>(null)
  const goldLightRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const softPulse = 0.5 + Math.sin(time * 1.35) * 0.5
    const slowBreath = 0.5 + Math.sin(time * 0.72 + 1.4) * 0.5

    if (mintGlowRef.current) mintGlowRef.current.opacity = 0.088 + softPulse * 0.026
    if (pinkGlowRef.current) pinkGlowRef.current.opacity = 0.046 + slowBreath * 0.022
    if (goldGlowRef.current) goldGlowRef.current.opacity = 0.058 + softPulse * 0.022
    if (mintLightRef.current) mintLightRef.current.intensity = 1.34 + softPulse * 0.28
    if (coralLightRef.current) coralLightRef.current.intensity = 0.78 + slowBreath * 0.24
    if (goldLightRef.current) goldLightRef.current.intensity = 0.72 + softPulse * 0.18
  })

  return (
    <group position={[0, -0.08, 0.08]}>
      <pointLight ref={mintLightRef} position={[-0.16, 0.22, -0.7]} color={MINT} intensity={1.44} distance={4.6} decay={1.5} />
      <pointLight ref={coralLightRef} position={[0.42, -0.12, -0.58]} color={CORAL} intensity={0.82} distance={3.5} decay={1.55} />
      <pointLight ref={goldLightRef} position={[-0.32, -0.48, -0.56]} color={AMBER} intensity={0.76} distance={3.4} decay={1.6} />
      <mesh position={[0, 0.3, 0.34]} scale={[2.26, 1.58, 1]} renderOrder={-4}>
        <circleGeometry args={[1, 112]} />
        <meshBasicMaterial ref={mintGlowRef} color={MINT} transparent opacity={0.098} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.26, 0.06, 0.36]} scale={[1.88, 1.26, 1]} renderOrder={-3}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial ref={pinkGlowRef} color={PINK} transparent opacity={0.052} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-0.24, -0.2, 0.36]} scale={[1.48, 0.9, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial ref={goldGlowRef} color={AMBER} transparent opacity={0.064} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.02, 0.2, 0.37]} scale={[1.24, 0.98, 1]} renderOrder={-1}>
        <ringGeometry args={[0.72, 1, 112]} />
        <meshBasicMaterial color={MINT} transparent opacity={0.085} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.1, 0.14, 0.38]} rotation={[0, 0, -0.1]} scale={[1.42, 1.02, 1]} renderOrder={-1}>
        <ringGeometry args={[0.76, 1, 112]} />
        <meshBasicMaterial color={PINK} transparent opacity={0.044} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.38, 0.34]} scale={[1.42, 1.08, 1]} renderOrder={-1}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#fff5cc" transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.16, 0.36]} scale={[1.72, 1.22, 1]} renderOrder={-2}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color={MINT} transparent opacity={0.022} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function clampDance(value: number) {
  return Math.min(1, Math.max(0, value))
}

function easeDance(value: number) {
  const amount = clampDance(value)
  return amount * amount * (3 - amount * 2)
}

function pulseDance(value: number, center: number, width: number) {
  return easeDance(1 - Math.abs(value - center) / width)
}

function v3(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z)
}

function createBaseDancePose(): DancePose {
  return {
    bodyX: 0,
    bodyY: 0,
    bodyRotateX: 0,
    bodyRotateY: 0,
    bodyRotateZ: 0,
    bodyScaleX: 1,
    bodyScaleY: 1,
    bodyScaleZ: 1,
    leftElbow: v3(-1.02, -0.62, -0.82),
    leftHand: v3(-1.16, -1.05, -0.9),
    rightElbow: v3(1.02, -0.62, -0.82),
    rightHand: v3(1.16, -1.05, -0.9),
    leftKnee: v3(-0.36, -1.36, -0.72),
    leftFoot: v3(-0.54, -2.02, -0.8),
    rightKnee: v3(0.36, -1.36, -0.72),
    rightFoot: v3(0.54, -2.02, -0.8),
    leftHandScale: v3(0.17, 0.15, 0.14),
    rightHandScale: v3(0.17, 0.15, 0.14),
    leftFootScale: v3(0.36, 0.14, 0.22),
    rightFootScale: v3(0.36, 0.14, 0.22),
    leftFootRotateZ: -0.08,
    rightFootRotateZ: 0.08,
    sparkle: 0.2,
  }
}

function getFlossPose(time: number): DancePose {
  const pose = createBaseDancePose()
  const phase = time * 1.36
  const swing = Math.sin(phase * TAU)
  const snap = Math.sin(phase * TAU * 2 + 0.4)
  const side = Math.sign(swing || 1)
  const armSide = swing * 0.68
  const hipCounter = -swing * 0.16

  pose.bodyX = hipCounter * 0.34
  pose.bodyY = Math.abs(snap) * 0.025
  pose.bodyRotateY = swing * 0.18
  pose.bodyRotateZ = -swing * 0.13
  pose.bodyScaleX = 1 + Math.abs(swing) * 0.035
  pose.bodyScaleY = 1 - Math.abs(swing) * 0.02 + Math.max(0, snap) * 0.025
  pose.leftElbow = v3(armSide - 0.24, -0.42 + snap * 0.03, side > 0 ? -1.02 : -0.44)
  pose.leftHand = v3(armSide - 0.6, -0.88 - Math.abs(swing) * 0.08, side > 0 ? -1.1 : -0.38)
  pose.rightElbow = v3(armSide + 0.24, -0.55 - snap * 0.02, side > 0 ? -0.42 : -1.02)
  pose.rightHand = v3(armSide + 0.6, -0.96 + Math.abs(swing) * 0.06, side > 0 ? -0.38 : -1.1)
  pose.leftFoot = v3(-0.55 + swing * 0.08, -2.02, -0.8 + Math.max(0, -swing) * 0.08)
  pose.rightFoot = v3(0.55 + swing * 0.08, -2.02, -0.8 + Math.max(0, swing) * 0.08)
  pose.leftKnee = v3(-0.34 + swing * 0.06, -1.36 + Math.abs(swing) * 0.04, -0.72)
  pose.rightKnee = v3(0.34 + swing * 0.06, -1.36 + Math.abs(swing) * 0.04, -0.72)
  pose.leftFootRotateZ = -0.16 + swing * 0.18
  pose.rightFootRotateZ = 0.16 + swing * 0.18
  pose.sparkle = 0.38 + Math.abs(swing) * 0.22
  return pose
}

function getDiscoPointPose(time: number): DancePose {
  const pose = createBaseDancePose()
  const phase = (time * 0.72) % 1
  const alternate = Math.sin(time * TAU * 0.36) >= 0 ? 1 : -1
  const pulse = pulseDance(phase, 0.16, 0.22) + pulseDance(phase, 0.66, 0.22)
  const reach = 1 + pulse * 0.12

  pose.bodyX = -alternate * 0.06
  pose.bodyY = pulse * 0.045
  pose.bodyRotateY = -alternate * 0.24
  pose.bodyRotateZ = -alternate * 0.18
  pose.bodyScaleY = 1 + pulse * 0.035
  pose.leftElbow = alternate > 0 ? v3(-0.96, -0.58, -0.84) : v3(-0.58, 0.58, -0.86)
  pose.leftHand = alternate > 0 ? v3(-1.22, -1.18, -0.9) : v3(-1.18 * reach, 1.42 * reach, -0.98)
  pose.rightElbow = alternate > 0 ? v3(0.58, 0.58, -0.86) : v3(0.96, -0.58, -0.84)
  pose.rightHand = alternate > 0 ? v3(1.18 * reach, 1.42 * reach, -0.98) : v3(1.22, -1.18, -0.9)
  pose.leftFoot = v3(-0.62, -2.02, -0.82 - (alternate < 0 ? pulse * 0.12 : 0))
  pose.rightFoot = v3(0.62, -2.02, -0.82 - (alternate > 0 ? pulse * 0.12 : 0))
  pose.leftKnee = v3(-0.42, -1.34 + (alternate < 0 ? pulse * 0.07 : 0), -0.72)
  pose.rightKnee = v3(0.42, -1.34 + (alternate > 0 ? pulse * 0.07 : 0), -0.72)
  pose.leftFootRotateZ = -0.22 + alternate * 0.08
  pose.rightFootRotateZ = 0.22 + alternate * 0.08
  pose.sparkle = 0.64 + pulse * 0.22
  return pose
}

function getHandsUpPose(time: number): DancePose {
  const pose = createBaseDancePose()
  const phase = time * 1.12
  const wave = Math.sin(phase * TAU)
  const bounce = Math.max(0, Math.sin(phase * TAU * 2 - 0.4))

  pose.bodyX = wave * 0.035
  pose.bodyY = bounce * 0.09
  pose.bodyRotateZ = wave * 0.08
  pose.bodyScaleX = 1 - bounce * 0.035
  pose.bodyScaleY = 1 + bounce * 0.055
  pose.leftElbow = v3(-0.72 + wave * 0.13, 0.62 + bounce * 0.05, -0.88)
  pose.leftHand = v3(-0.82 + wave * 0.26, 1.28 + bounce * 0.13, -1.02)
  pose.rightElbow = v3(0.72 + wave * 0.13, 0.62 - bounce * 0.02, -0.88)
  pose.rightHand = v3(0.82 + wave * 0.26, 1.28 - bounce * 0.05, -1.02)
  pose.leftFoot = v3(-0.52 + wave * 0.04, -2.02 + bounce * 0.04, -0.82)
  pose.rightFoot = v3(0.52 + wave * 0.04, -2.02, -0.82)
  pose.leftKnee = v3(-0.34 + wave * 0.05, -1.32 + bounce * 0.12, -0.72)
  pose.rightKnee = v3(0.34 + wave * 0.04, -1.34 + bounce * 0.05, -0.72)
  pose.leftFootRotateZ = -0.08 + wave * 0.1
  pose.rightFootRotateZ = 0.08 + wave * 0.1
  pose.sparkle = 0.7 + bounce * 0.2
  return pose
}

function getRunningManPose(time: number): DancePose {
  const pose = createBaseDancePose()
  const step = Math.sin(time * TAU * 1.55)
  const leftLift = Math.max(0, step)
  const rightLift = Math.max(0, -step)
  const pump = Math.abs(step)
  const slide = Math.cos(time * TAU * 1.55)

  pose.bodyY = pump * 0.075
  pose.bodyRotateZ = slide * 0.045
  pose.bodyScaleX = 1 + pump * 0.025
  pose.bodyScaleY = 1 - pump * 0.018
  pose.leftFoot = v3(-0.55, -2.02 + leftLift * 0.22, -0.86 - step * 0.34)
  pose.rightFoot = v3(0.55, -2.02 + rightLift * 0.22, -0.86 + step * 0.34)
  pose.leftKnee = v3(-0.34, -1.27 + leftLift * 0.28, -0.78 - step * 0.18)
  pose.rightKnee = v3(0.34, -1.27 + rightLift * 0.28, -0.78 + step * 0.18)
  pose.leftElbow = v3(-0.92 + step * 0.08, -0.42 + rightLift * 0.16, -0.86)
  pose.leftHand = v3(-1.18 + step * 0.22, -0.94 + rightLift * 0.2, -0.96)
  pose.rightElbow = v3(0.92 + step * 0.08, -0.42 + leftLift * 0.16, -0.86)
  pose.rightHand = v3(1.18 + step * 0.22, -0.94 + leftLift * 0.2, -0.96)
  pose.leftFootRotateZ = -0.08 - leftLift * 0.2 + slide * 0.07
  pose.rightFootRotateZ = 0.08 + rightLift * 0.2 + slide * 0.07
  pose.sparkle = 0.42 + pump * 0.2
  return pose
}

function getGangnamPose(time: number): DancePose {
  const pose = createBaseDancePose()
  const gallop = Math.abs(Math.sin(time * TAU * 1.48))
  const side = Math.sin(time * TAU * 0.74)
  const reins = Math.sin(time * TAU * 2.96)

  pose.bodyX = side * 0.055
  pose.bodyY = gallop * 0.12
  pose.bodyRotateY = side * 0.14
  pose.bodyRotateZ = -side * 0.08
  pose.bodyScaleX = 1 + gallop * 0.045
  pose.bodyScaleY = 1 - gallop * 0.035
  pose.leftElbow = v3(-0.38, -0.28 + reins * 0.035, -1.0)
  pose.leftHand = v3(0.42 + side * 0.08, -0.42 + reins * 0.09, -1.08)
  pose.rightElbow = v3(0.38, -0.18 - reins * 0.035, -1.02)
  pose.rightHand = v3(-0.42 + side * 0.08, -0.58 - reins * 0.09, -1.1)
  pose.leftFoot = v3(-0.62 + side * 0.09, -2.02 + Math.max(0, side) * 0.08, -0.8)
  pose.rightFoot = v3(0.62 + side * 0.09, -2.02 + Math.max(0, -side) * 0.08, -0.8)
  pose.leftKnee = v3(-0.48 + side * 0.08, -1.3 + gallop * 0.18, -0.72)
  pose.rightKnee = v3(0.48 + side * 0.08, -1.3 + gallop * 0.18, -0.72)
  pose.leftHandScale = v3(0.18, 0.13, 0.14)
  pose.rightHandScale = v3(0.18, 0.13, 0.14)
  pose.leftFootRotateZ = -0.2 + side * 0.14
  pose.rightFootRotateZ = 0.2 + side * 0.14
  pose.sparkle = 0.52 + gallop * 0.24
  return pose
}

function getTwistPose(time: number): DancePose {
  const pose = createBaseDancePose()
  const twist = Math.sin(time * TAU * 1.26)
  const shoulder = Math.sin(time * TAU * 2.52 + 0.6)

  pose.bodyX = twist * 0.035
  pose.bodyRotateY = twist * 0.34
  pose.bodyRotateZ = -twist * 0.06
  pose.bodyScaleX = 1 + Math.abs(twist) * 0.025
  pose.leftElbow = v3(-1.05, -0.28 + shoulder * 0.06, -0.9)
  pose.leftHand = v3(-1.42, -0.55 + shoulder * 0.16, -1.0)
  pose.rightElbow = v3(1.05, -0.28 - shoulder * 0.06, -0.9)
  pose.rightHand = v3(1.42, -0.55 - shoulder * 0.16, -1.0)
  pose.leftFoot = v3(-0.56, -2.02, -0.78 + twist * 0.08)
  pose.rightFoot = v3(0.56, -2.02, -0.78 - twist * 0.08)
  pose.leftKnee = v3(-0.38, -1.34, -0.72 + twist * 0.08)
  pose.rightKnee = v3(0.38, -1.34, -0.72 - twist * 0.08)
  pose.leftFootRotateZ = -0.28 * twist - 0.05
  pose.rightFootRotateZ = -0.28 * twist + 0.05
  pose.sparkle = 0.42 + Math.abs(twist) * 0.18
  return pose
}

function getShuffleClapPose(time: number): DancePose {
  const pose = createBaseDancePose()
  const phase = (time * 1.18) % 1
  const clap = pulseDance(phase, 0.48, 0.13)
  const side = Math.sin(time * TAU * 0.59)
  const hop = pulseDance(phase, 0.12, 0.18)

  pose.bodyX = side * 0.09
  pose.bodyY = hop * 0.08 + clap * 0.025
  pose.bodyRotateZ = -side * 0.07
  pose.bodyScaleX = 1 + clap * 0.03
  pose.bodyScaleY = 1 + hop * 0.035 - clap * 0.02
  pose.leftElbow = v3(-0.72 + clap * 0.42, -0.28 + clap * 0.14, -0.92)
  pose.leftHand = v3(-1.05 + clap * 0.82, -0.62 + clap * 0.28, -1.05)
  pose.rightElbow = v3(0.72 - clap * 0.42, -0.28 + clap * 0.14, -0.92)
  pose.rightHand = v3(1.05 - clap * 0.82, -0.62 + clap * 0.28, -1.05)
  pose.leftFoot = v3(-0.58 + side * 0.16, -2.02 + Math.max(0, -side) * 0.08, -0.82)
  pose.rightFoot = v3(0.58 + side * 0.16, -2.02 + Math.max(0, side) * 0.08, -0.82)
  pose.leftKnee = v3(-0.38 + side * 0.1, -1.32 + hop * 0.16, -0.72)
  pose.rightKnee = v3(0.38 + side * 0.1, -1.32 + hop * 0.16, -0.72)
  pose.leftFootRotateZ = -0.12 + side * 0.18
  pose.rightFootRotateZ = 0.12 + side * 0.18
  pose.sparkle = 0.5 + clap * 0.4
  return pose
}

function getMovePose(move: DanceMoveId, time: number): DancePose {
  if (move === 'floss') return getFlossPose(time)
  if (move === 'discoPoint') return getDiscoPointPose(time)
  if (move === 'handsUp') return getHandsUpPose(time)
  if (move === 'runningMan') return getRunningManPose(time)
  if (move === 'gangnamBounce') return getGangnamPose(time)
  if (move === 'twist') return getTwistPose(time)
  return getShuffleClapPose(time)
}

function lerpVector(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return v3(THREE.MathUtils.lerp(a.x, b.x, t), THREE.MathUtils.lerp(a.y, b.y, t), THREE.MathUtils.lerp(a.z, b.z, t))
}

function blendDancePose(a: DancePose, b: DancePose, t: number): DancePose {
  return {
    bodyX: THREE.MathUtils.lerp(a.bodyX, b.bodyX, t),
    bodyY: THREE.MathUtils.lerp(a.bodyY, b.bodyY, t),
    bodyRotateX: THREE.MathUtils.lerp(a.bodyRotateX, b.bodyRotateX, t),
    bodyRotateY: THREE.MathUtils.lerp(a.bodyRotateY, b.bodyRotateY, t),
    bodyRotateZ: THREE.MathUtils.lerp(a.bodyRotateZ, b.bodyRotateZ, t),
    bodyScaleX: THREE.MathUtils.lerp(a.bodyScaleX, b.bodyScaleX, t),
    bodyScaleY: THREE.MathUtils.lerp(a.bodyScaleY, b.bodyScaleY, t),
    bodyScaleZ: THREE.MathUtils.lerp(a.bodyScaleZ, b.bodyScaleZ, t),
    leftElbow: lerpVector(a.leftElbow, b.leftElbow, t),
    leftHand: lerpVector(a.leftHand, b.leftHand, t),
    rightElbow: lerpVector(a.rightElbow, b.rightElbow, t),
    rightHand: lerpVector(a.rightHand, b.rightHand, t),
    leftKnee: lerpVector(a.leftKnee, b.leftKnee, t),
    leftFoot: lerpVector(a.leftFoot, b.leftFoot, t),
    rightKnee: lerpVector(a.rightKnee, b.rightKnee, t),
    rightFoot: lerpVector(a.rightFoot, b.rightFoot, t),
    leftHandScale: lerpVector(a.leftHandScale, b.leftHandScale, t),
    rightHandScale: lerpVector(a.rightHandScale, b.rightHandScale, t),
    leftFootScale: lerpVector(a.leftFootScale, b.leftFootScale, t),
    rightFootScale: lerpVector(a.rightFootScale, b.rightFootScale, t),
    leftFootRotateZ: THREE.MathUtils.lerp(a.leftFootRotateZ, b.leftFootRotateZ, t),
    rightFootRotateZ: THREE.MathUtils.lerp(a.rightFootRotateZ, b.rightFootRotateZ, t),
    sparkle: THREE.MathUtils.lerp(a.sparkle, b.sparkle, t),
  }
}

function getDancePose(time: number): DancePose {
  const loopTime = ((time % DANCE_SEQUENCE_DURATION) + DANCE_SEQUENCE_DURATION) % DANCE_SEQUENCE_DURATION
  let cursor = 0

  for (let index = 0; index < DANCE_SEQUENCE.length; index += 1) {
    const move = DANCE_SEQUENCE[index]
    const nextCursor = cursor + move.duration

    if (loopTime <= nextCursor || index === DANCE_SEQUENCE.length - 1) {
      const localTime = loopTime - cursor
      const pose = getMovePose(move.id, localTime)
      const timeToEnd = move.duration - localTime

      if (timeToEnd < DANCE_TRANSITION_SECONDS) {
        const nextMove = DANCE_SEQUENCE[(index + 1) % DANCE_SEQUENCE.length]
        const transition = easeDance(1 - timeToEnd / DANCE_TRANSITION_SECONDS)
        return blendDancePose(pose, getMovePose(nextMove.id, 0), transition)
      }

      return pose
    }

    cursor = nextCursor
  }

  return createBaseDancePose()
}

function applyDanceBodyPoint(point: THREE.Vector3, pose: DancePose) {
  const transformed = point.clone()
  transformed.x *= pose.bodyScaleX
  transformed.y *= pose.bodyScaleY
  transformed.z *= pose.bodyScaleZ
  transformed.applyEuler(new THREE.Euler(pose.bodyRotateX, pose.bodyRotateY, pose.bodyRotateZ))
  transformed.x += pose.bodyX
  transformed.y += pose.bodyY
  return transformed
}

function useDanceLimbRefs() {
  return {
    upperOutline: useRef<THREE.Mesh>(null),
    upperFill: useRef<THREE.Mesh>(null),
    lowerOutline: useRef<THREE.Mesh>(null),
    lowerFill: useRef<THREE.Mesh>(null),
    jointOutline: useRef<THREE.Mesh>(null),
    jointFill: useRef<THREE.Mesh>(null),
    endOutline: useRef<THREE.Mesh>(null),
    endFill: useRef<THREE.Mesh>(null),
  }
}

type DanceLimbRefs = ReturnType<typeof useDanceLimbRefs>

function placeDanceSegment(mesh: THREE.Mesh | null, start: THREE.Vector3, end: THREE.Vector3, radius: number) {
  if (!mesh) return
  const delta = end.clone().sub(start)
  const length = Math.max(0.001, delta.length())
  const midpoint = start.clone().add(end).multiplyScalar(0.5)

  mesh.position.copy(midpoint)
  mesh.quaternion.setFromUnitVectors(SEGMENT_Y_AXIS, delta.normalize())
  mesh.scale.set(radius, length, radius)
}

function placeDanceBulb(mesh: THREE.Mesh | null, position: THREE.Vector3, scale: THREE.Vector3, rotateZ = 0) {
  if (!mesh) return
  mesh.position.copy(position)
  mesh.rotation.set(0, 0, rotateZ)
  mesh.scale.copy(scale)
}

function placeDanceLimb(refs: DanceLimbRefs, start: THREE.Vector3, joint: THREE.Vector3, end: THREE.Vector3, endScale: THREE.Vector3, endRotateZ = 0, radius = 0.065) {
  placeDanceSegment(refs.upperOutline.current, start, joint, radius * 1.42)
  placeDanceSegment(refs.upperFill.current, start, joint, radius)
  placeDanceSegment(refs.lowerOutline.current, joint, end, radius * 1.36)
  placeDanceSegment(refs.lowerFill.current, joint, end, radius * 0.94)
  placeDanceBulb(refs.jointOutline.current, joint, v3(radius * 2.15, radius * 2.15, radius * 1.7))
  placeDanceBulb(refs.jointFill.current, joint, v3(radius * 1.45, radius * 1.45, radius * 1.18))
  placeDanceBulb(refs.endOutline.current, end, endScale.clone().multiplyScalar(1.18), endRotateZ)
  placeDanceBulb(refs.endFill.current, end, endScale, endRotateZ)
}

function DanceLimb({
  upperOutline,
  upperFill,
  lowerOutline,
  lowerFill,
  jointOutline,
  jointFill,
  endOutline,
  endFill,
  fillColor,
  endColor,
}: DanceLimbRefs & { fillColor: string; endColor: string }) {
  return (
    <group>
      <mesh ref={upperOutline}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh ref={upperFill}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial color={fillColor} emissive={fillColor} emissiveIntensity={0.05} roughness={0.52} />
      </mesh>
      <mesh ref={lowerOutline}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh ref={lowerFill}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial color={fillColor} emissive={fillColor} emissiveIntensity={0.05} roughness={0.52} />
      </mesh>
      <mesh ref={jointOutline}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh ref={jointFill}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color={fillColor} emissive={fillColor} emissiveIntensity={0.045} roughness={0.52} />
      </mesh>
      <mesh ref={endOutline}>
        <sphereGeometry args={[1, 22, 14]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh ref={endFill}>
        <sphereGeometry args={[1, 22, 14]} />
        <meshStandardMaterial color={endColor} emissive={endColor} emissiveIntensity={0.06} roughness={0.46} />
      </mesh>
    </group>
  )
}

function DancingOrb() {
  const danceRoot = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const leftArmRefs = useDanceLimbRefs()
  const rightArmRefs = useDanceLimbRefs()
  const leftLegRefs = useDanceLimbRefs()
  const rightLegRefs = useDanceLimbRefs()
  const leftHandGlowRef = useRef<THREE.Mesh>(null)
  const rightHandGlowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const pose = getDancePose(time)
    const tinyBreath = 1 + Math.sin(time * 1.8) * 0.004
    const rootSway = Math.sin(time * 0.42) * 0.025

    if (danceRoot.current) {
      danceRoot.current.position.x = rootSway
      danceRoot.current.position.y = DANCE_BASE_Y
      danceRoot.current.rotation.y = pose.bodyRotateY * 0.2
      danceRoot.current.rotation.z = pose.bodyRotateZ * 0.12
      danceRoot.current.scale.setScalar(ORB_STAGE_SCALE * tinyBreath)
    }

    if (bodyRef.current) {
      bodyRef.current.position.set(pose.bodyX, pose.bodyY, 0)
      bodyRef.current.rotation.set(pose.bodyRotateX, pose.bodyRotateY, pose.bodyRotateZ)
      bodyRef.current.scale.set(pose.bodyScaleX, pose.bodyScaleY, pose.bodyScaleZ)
    }

    const leftShoulder = applyDanceBodyPoint(LEFT_SHOULDER, pose)
    const rightShoulder = applyDanceBodyPoint(RIGHT_SHOULDER, pose)
    const leftHip = applyDanceBodyPoint(LEFT_HIP, pose)
    const rightHip = applyDanceBodyPoint(RIGHT_HIP, pose)

    placeDanceLimb(leftArmRefs, leftShoulder, pose.leftElbow, pose.leftHand, pose.leftHandScale, pose.bodyRotateZ * 0.2, 0.072)
    placeDanceLimb(rightArmRefs, rightShoulder, pose.rightElbow, pose.rightHand, pose.rightHandScale, pose.bodyRotateZ * 0.2, 0.072)
    placeDanceLimb(leftLegRefs, leftHip, pose.leftKnee, pose.leftFoot, pose.leftFootScale, pose.leftFootRotateZ, 0.086)
    placeDanceLimb(rightLegRefs, rightHip, pose.rightKnee, pose.rightFoot, pose.rightFootScale, pose.rightFootRotateZ, 0.086)

    if (leftHandGlowRef.current) {
      leftHandGlowRef.current.position.copy(pose.leftHand)
      leftHandGlowRef.current.scale.set(0.48 + pose.sparkle * 0.14, 0.18 + pose.sparkle * 0.05, 1)
      ;(leftHandGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + pose.sparkle * 0.05
    }
    if (rightHandGlowRef.current) {
      rightHandGlowRef.current.position.copy(pose.rightHand)
      rightHandGlowRef.current.scale.set(0.48 + pose.sparkle * 0.14, 0.18 + pose.sparkle * 0.05, 1)
      ;(rightHandGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.05 + pose.sparkle * 0.05
    }
  })

  return (
    <group ref={danceRoot} position={[0, DANCE_BASE_Y, 0]} rotation={[0, 0, 0]} scale={ORB_STAGE_SCALE}>
      <DanceLimb {...leftLegRefs} fillColor="#fff36d" endColor="#fff6a4" />
      <DanceLimb {...rightLegRefs} fillColor="#ff8875" endColor="#ff9a86" />
      <group ref={bodyRef}>
        <CharacterHalo />
        <PsychedelicPogoOrbAsset
          mode="face"
          animation="still"
          activity={0.82}
          colorCycleSpeed={0.72}
          expression="delighted"
          glowIntensity={1.12}
          scale={1}
          verticalMotionScale={0}
        />
        <SpotlightCatchLights />
      </group>
      <DanceLimb {...leftArmRefs} fillColor={MINT} endColor="#8ff8dd" />
      <DanceLimb {...rightArmRefs} fillColor={CORAL} endColor="#ff9c82" />
      <mesh ref={leftHandGlowRef} position={[-0.3, 0.08, -1.15]} scale={[0.42, 0.18, 1]} renderOrder={30}>
        <circleGeometry args={[1, 42]} />
        <meshBasicMaterial color={MINT} transparent opacity={0.09} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={rightHandGlowRef} position={[0.3, 0.08, -1.15]} scale={[0.42, 0.18, 1]} renderOrder={30}>
        <circleGeometry args={[1, 42]} />
        <meshBasicMaterial color={PINK} transparent opacity={0.09} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HomeCameraTransition({ transitionChoice }: { transitionChoice: WayfindingChoice | null }) {
  const { camera } = useThree()
  const capturedRef = useRef(false)
  const elapsedRef = useRef(0)
  const startPositionRef = useRef(new THREE.Vector3())
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    if (!transitionChoice) {
      capturedRef.current = false
      elapsedRef.current = 0
      return
    }

    if (!capturedRef.current) {
      capturedRef.current = true
      elapsedRef.current = 0
      startPositionRef.current.copy(camera.position)
    }

    elapsedRef.current = Math.min(2.85, elapsedRef.current + dt)
    const t = Math.min(1, elapsedRef.current / 2.55)
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const sign = transitionChoice === 'burn' ? -1 : 1
    const lateralSwoop = Math.sin(eased * Math.PI) * sign * 0.42

    targetPosition.set(sign * 4.38 + lateralSwoop, -0.18 + eased * -0.2, -3.05 + eased * 0.2)
    camera.position.lerpVectors(startPositionRef.current, targetPosition, eased)

    lookTarget.set(sign * (1.25 + eased * 3.72), -0.16 + eased * 0.18, -0.28 + eased * -0.18)
    camera.lookAt(lookTarget)

    if ('fov' in camera) {
      const perspectiveCamera = camera as THREE.PerspectiveCamera
      perspectiveCamera.fov = THREE.MathUtils.lerp(50, 37, eased)
      perspectiveCamera.updateProjectionMatrix()
    }
  })

  return null
}

function HomeStage({ infoOpen, setInfoOpen, transitionChoice, onDestinationSelect }: HomeStageProps) {
  return (
    <>
      <color attach="background" args={['#d8cbb8']} />
      <ambientLight intensity={0.58} color="#ffe8c2" />
      <hemisphereLight args={['#fff7df', '#6a3a1d', 0.8]} />
      <directionalLight position={[-3.8, 6.4, -2.6]} intensity={0.58} color="#ffdca8" />
      <directionalLight position={[4.8, 3.4, -3.6]} intensity={0.2} color="#d8eeff" />
      <spotLight position={[0, 5.18, -1.04]} angle={0.54} penumbra={0.98} intensity={2.85} color="#fff4d8" />
      <pointLight position={[0, 2.42, 0.16]} intensity={1.04} color="#fff1cf" distance={6.1} decay={1.28} />
      <pointLight position={[-3.52, 0.76, 2.18]} intensity={1.02} color="#ffd39a" distance={5.8} decay={1.5} />
      <pointLight position={[3.52, 0.76, 2.18]} intensity={1} color="#ffe0ad" distance={5.8} decay={1.5} />
      <pointLight position={[0, 1.28, 2.22]} intensity={0.38} color="#ffe5b3" distance={4.8} decay={1.42} />
      <pointLight position={[0, 0.36, 2.32]} intensity={0.94} color="#ffd095" distance={5.4} decay={1.45} />
      <pointLight position={[-3.9, -0.18, 0.38]} intensity={0.23} color="#ff7a2b" distance={4.2} decay={1.58} />
      <pointLight position={[3.9, -0.18, 0.38]} intensity={0.24} color="#fff0a8" distance={4.4} decay={1.5} />
      <pointLight position={[4.28, 0.52, -0.76]} intensity={0.18} color="#cffff0" distance={3.6} decay={1.48} />
      <pointLight position={[0, -1.6, -1.22]} intensity={0.46} color="#ffe1a8" distance={5.4} decay={1.72} />
      <pointLight position={[-2.85, -0.7, -1.65]} intensity={0.08} color="#a7f7e8" distance={4} decay={1.65} />
      <pointLight position={[2.9, -0.72, -1.58]} intensity={0.07} color="#ffb3d7" distance={3.6} decay={1.65} />
      <HomeCameraTransition transitionChoice={transitionChoice} />
      <StageBackdrop infoOpen={infoOpen} setInfoOpen={setInfoOpen} transitionChoice={transitionChoice} onDestinationSelect={onDestinationSelect} />
      <AmbientVibeLayer />
      <TinyRascalCrowd />
      <SpotlightBeam />
      {SHOW_STAGE_CHARACTER ? (
        <>
          <Pedestal />
          <DancingOrb />
        </>
      ) : null}
      <HomeToonCursor />
    </>
  )
}

function HomeInfoButton({ active, disabled, onToggle }: { active: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`homeInfoButton${active ? ' isActive' : ''}`}
      aria-label={active ? 'Close MoBA info' : 'Open MoBA info'}
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
    >
      ?
    </button>
  )
}

function HomeRouteTransitionOverlay({ transitionChoice }: { transitionChoice: WayfindingChoice | null }) {
  if (!transitionChoice) return null

  return <div className={`homeRouteTransitionOverlay ${transitionChoice === 'burn' ? 'isBurn' : 'isCourtyard'}`} aria-hidden="true" />
}

function HomeMuseumInfoPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <section className="homeMuseumInfoPanel" aria-label="Museum of Based Art information">
      <button type="button" className="homeMuseumInfoBackdrop" onClick={onClose} aria-label="Close Museum of Based Art information" />
      <article className="homeMuseumInfoCard">
        <div className="homeMuseumInfoImageFrame">
          <Image src="/home/moba-foyer-map.gif" alt="Pixel art Museum of Based Art foyer map" width={5360} height={3580} unoptimized priority />
        </div>
        <div className="homeMuseumInfoCopy">
          <p className="homeMuseumInfoEyebrow">Museum of Based Art</p>
          <h2>MoBA is becoming a living onchain museum world.</h2>
          <p>
            The first exhibit, <strong>Portraits of an Enjoyer</strong>, brought 599 Joseph Pixler portraits to Base. This foyer is the first playable room of the museum we are building around that spirit: art, rooms, rituals, and weird little moments you can actually step into.
          </p>
          <p className="homeMuseumInfoNote">Start here. Wander the courtyard. Visit the burn room. The museum grows from this doorway outward.</p>
          <div className="homeMuseumInfoLinks" aria-label="MoBA links">
            <a href="https://x.com/MoBAonchain" target="_blank" rel="noreferrer">X</a>
            <a href="https://opensea.io/collection/moba--1/overview" target="_blank" rel="noreferrer">OpenSea</a>
            <a href="https://discord.gg/P8qMTbVSkn" target="_blank" rel="noreferrer">Discord</a>
          </div>
        </div>
        <button type="button" className="homeMuseumInfoClose" onClick={onClose} aria-label="Close Museum of Based Art information">
          X
        </button>
      </article>
    </section>
  )
}

export function HomePage() {
  const router = useRouter()
  const [infoOpen, setInfoOpen] = useState(false)
  const [transitionChoice, setTransitionChoice] = useState<WayfindingChoice | null>(null)
  const handleDestinationSelect = useCallback((choice: WayfindingChoice) => {
    setInfoOpen(false)
    setTransitionChoice((current) => current ?? choice)
  }, [])

  useEffect(() => {
    if (!transitionChoice) return

    const timeout = window.setTimeout(() => {
      router.push(DESTINATION_ROUTES[transitionChoice])
    }, HOME_ROUTE_TRANSITION_MS)

    return () => window.clearTimeout(timeout)
  }, [router, transitionChoice])

  return (
    <main className="homeStage" aria-label="Vacuum Head homepage">
      <HomeInfoButton active={infoOpen} disabled={transitionChoice !== null} onToggle={() => setInfoOpen((current) => !current)} />
      <HomeMuseumInfoPanel open={infoOpen && transitionChoice === null} onClose={() => setInfoOpen(false)} />
      <HomeRouteTransitionOverlay transitionChoice={transitionChoice} />
      <Canvas camera={{ position: [0, 0.3, -9.6], fov: 50, near: 0.1, far: 80 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <HomeStage infoOpen={infoOpen} setInfoOpen={setInfoOpen} transitionChoice={transitionChoice} onDestinationSelect={handleDestinationSelect} />
      </Canvas>
    </main>
  )
}
