'use client'

import { RoundedBox } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OutlineMesh } from '../../render/OutlineMesh'
import { getToonRampTexture } from '../../shaders/toonRamp'
import {
  createMuseumArtworkProvenance,
  MUSEUM_ARTWORK_USER_DATA_KEY,
} from './artworkProvenance'
import {
  MONKEYDHASHY_CREATEBOX_SPEC,
  monkeydhashyCreateboxMotionAtTime,
} from './monkeydhashyCreatebox'

const INK = '#17131d'
const TOON_RAMP = getToonRampTexture()

const HOLO_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vLocalPosition = position;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -viewPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`

const HOLO_FRAGMENT_SHADER = /* glsl */`
  precision highp float;

  uniform sampler2D uArtwork;
  uniform float uTime;
  uniform float uShimmer;
  uniform float uActive;
  varying vec2 vUv;
  varying vec3 vLocalPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  vec3 spectrum(float phase) {
    return 0.56 + 0.44 * cos(6.2831853 * (phase + vec3(0.0, 0.333, 0.667)));
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewPosition);
    float fresnel = pow(1.0 - clamp(abs(dot(normal, viewDirection)), 0.0, 1.0), 2.15);
    float diagonal = vLocalPosition.x * 0.32 + vLocalPosition.y * 0.24 - vLocalPosition.z * 0.27;
    float foilPhase = fract(diagonal + uTime * 0.035 + fresnel * 0.58);
    vec3 rainbow = spectrum(foilPhase);
    vec3 source = texture2D(uArtwork, vUv).rgb;
    float ribbon = 0.5 + 0.5 * sin(diagonal * 34.0 + uTime * 1.55);
    float crossGlint = smoothstep(0.86, 1.0, 0.5 + 0.5 * sin(
      (vLocalPosition.x + vLocalPosition.z) * 24.0 - uTime * 1.8
    ));
    float sourceWeight = 0.42 - fresnel * 0.16;
    vec3 color = mix(rainbow, source, sourceWeight);
    color = mix(color, spectrum(foilPhase + 0.18), ribbon * 0.19);
    color += rainbow * fresnel * (0.34 + uActive * 0.16);
    color += vec3(1.0, 0.94, 0.72) * crossGlint * (0.11 + uShimmer * 0.12);
    color = floor(color * 7.0 + 0.5) / 7.0;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

type Vec3 = readonly [number, number, number]

function InstallationBox({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  outlineWidth = 0.024,
}: {
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  color: string
  emissive?: string
  emissiveIntensity?: number
  outlineWidth?: number
}) {
  return (
    <OutlineMesh
      position={[...position]}
      rotation={[...rotation]}
      scale={[...scale]}
      outlineWidth={outlineWidth}
      geometry={<boxGeometry args={[1, 1, 1]} />}
      material={(
        <meshToonMaterial
          color={color}
          gradientMap={TOON_RAMP}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      )}
    />
  )
}

function createCollectionPlaqueTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#f5ead2'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#9edee3'
  context.lineWidth = 14
  context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48)
  context.strokeStyle = '#c6975a'
  context.lineWidth = 5
  context.strokeRect(45, 45, canvas.width - 90, canvas.height - 90)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#31565b'
  context.font = '700 44px Arial, sans-serif'
  context.fillText('SOLE SURVIVING !CREATEBOX', canvas.width / 2, 124)
  context.fillStyle = '#211827'
  context.font = '900 92px Arial, sans-serif'
  context.fillText('MONKEYDHASHY', canvas.width / 2, 258)
  context.fillStyle = '#7b4b62'
  context.font = '700 36px Arial, sans-serif'
  context.fillText('1 / 1  ·  49 OF 50 BURNED', canvas.width / 2, 382)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function CreateboxBackdropPlaceholder() {
  const [width, height] = MONKEYDHASHY_CREATEBOX_SPEC.backdrop.artSize
  return (
    <mesh position={[0, 0, 0.145]} scale={[width, height, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#34263c" toneMapped={false} />
    </mesh>
  )
}

function useCreateboxMedia(reducedMotion: boolean) {
  const loadedPoster = useLoader(THREE.TextureLoader, MONKEYDHASHY_CREATEBOX_SPEC.media.poster)
  const loadedSheet = useLoader(THREE.TextureLoader, MONKEYDHASHY_CREATEBOX_SPEC.media.motionSheet)
  const poster = useMemo(() => loadedPoster.clone(), [loadedPoster])
  const motion = useMemo(() => loadedSheet.clone(), [loadedSheet])
  const lastFrameRef = useRef(-1)

  useEffect(() => {
    poster.colorSpace = THREE.SRGBColorSpace
    poster.generateMipmaps = false
    poster.minFilter = THREE.LinearFilter
    poster.magFilter = THREE.NearestFilter
    poster.needsUpdate = true

    motion.colorSpace = THREE.SRGBColorSpace
    motion.wrapS = THREE.RepeatWrapping
    motion.wrapT = THREE.RepeatWrapping
    motion.repeat.set(
      1 / MONKEYDHASHY_CREATEBOX_SPEC.media.columns,
      1 / MONKEYDHASHY_CREATEBOX_SPEC.media.rows,
    )
    motion.generateMipmaps = false
    motion.minFilter = THREE.LinearFilter
    motion.magFilter = THREE.NearestFilter
    motion.needsUpdate = true
    return () => {
      poster.dispose()
      motion.dispose()
    }
  }, [motion, poster])

  useFrame(({ clock }) => {
    const frameIndex = reducedMotion
      ? 0
      : Math.floor((clock.elapsedTime * 1000) / MONKEYDHASHY_CREATEBOX_SPEC.media.frameDurationMs)
        % MONKEYDHASHY_CREATEBOX_SPEC.media.frameCount
    if (frameIndex === lastFrameRef.current) return
    lastFrameRef.current = frameIndex
    const column = frameIndex % MONKEYDHASHY_CREATEBOX_SPEC.media.columns
    const row = Math.floor(frameIndex / MONKEYDHASHY_CREATEBOX_SPEC.media.columns)
    motion.offset.set(
      column / MONKEYDHASHY_CREATEBOX_SPEC.media.columns,
      1 - (row + 1) / MONKEYDHASHY_CREATEBOX_SPEC.media.rows,
    )
  })

  return { motion, poster }
}

function AnimatedCreateboxMedia({
  reducedMotion,
  active,
}: {
  reducedMotion: boolean
  active: boolean
}) {
  const { motion, poster } = useCreateboxMedia(reducedMotion)
  const boxRef = useRef<THREE.Group>(null)
  const orbitRef = useRef<THREE.Group>(null)
  const foilMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uArtwork: { value: motion },
      uTime: { value: 0 },
      uShimmer: { value: 0.58 },
      uActive: { value: 0.25 },
    },
    vertexShader: HOLO_VERTEX_SHADER,
    fragmentShader: HOLO_FRAGMENT_SHADER,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  }), [motion])

  useEffect(() => () => foilMaterial.dispose(), [foilMaterial])

  useFrame(({ clock }) => {
    const motionState = monkeydhashyCreateboxMotionAtTime(clock.elapsedTime, reducedMotion)
    const box = boxRef.current
    const orbit = orbitRef.current
    if (box) {
      box.position.y = motionState.floatY
      box.rotation.set(
        motionState.rotationX,
        motionState.rotationY,
        motionState.rotationZ,
      )
      const lid = box.getObjectByName('createbox-lid')
      if (lid) lid.position.y = 0.48 + motionState.lidLift
    }
    if (orbit) orbit.rotation.y = motionState.orbitRotation
    foilMaterial.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
    foilMaterial.uniforms.uShimmer.value = motionState.shimmer
    foilMaterial.uniforms.uActive.value = active ? 1 : 0.25
  })

  const [artWidth, artHeight] = MONKEYDHASHY_CREATEBOX_SPEC.backdrop.artSize
  const [bodyWidth, bodyHeight, bodyDepth] = MONKEYDHASHY_CREATEBOX_SPEC.box.bodySize
  const [lidWidth, lidHeight, lidDepth] = MONKEYDHASHY_CREATEBOX_SPEC.box.lidSize

  return (
    <>
      <mesh position={[0, 0, 0.146]} scale={[artWidth, artHeight, 1]} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={poster} toneMapped={false} />
      </mesh>
      {!reducedMotion ? (
        <mesh position={[0, 0, 0.154]} scale={[artWidth, artHeight, 1]} renderOrder={5}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={motion} toneMapped={false} />
        </mesh>
      ) : null}

      <group position={[...MONKEYDHASHY_CREATEBOX_SPEC.box.offset]}>
        <group ref={orbitRef}>
          <mesh rotation={[Math.PI / 2, 0.18, 0]}>
            <torusGeometry args={[0.91, 0.016, 8, 48]} />
            <meshBasicMaterial color="#85f4ff" transparent opacity={active ? 0.72 : 0.38} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[0.58, 0.24, 0.82]}>
            <torusGeometry args={[0.8, 0.012, 8, 48]} />
            <meshBasicMaterial color="#ff8bd4" transparent opacity={active ? 0.62 : 0.3} depthWrite={false} toneMapped={false} />
          </mesh>
          {Array.from({ length: 10 }, (_, index) => {
            const angle = (index / 10) * Math.PI * 2
            const radius = index % 2 ? 0.86 : 1.02
            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * radius,
                  Math.sin(angle * 2 + 0.45) * 0.38,
                  Math.sin(angle) * radius * 0.64,
                ]}
                rotation={[angle * 0.3, angle, Math.PI / 4]}
                scale={index % 3 === 0 ? 0.075 : 0.045}
              >
                <octahedronGeometry args={[1, 0]} />
                <meshBasicMaterial
                  color={index % 2 ? '#ffd876' : '#c4fbff'}
                  transparent
                  opacity={active ? 0.8 : 0.42}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            )
          })}
        </group>

        <group ref={boxRef}>
          <RoundedBox args={[bodyWidth + 0.07, bodyHeight + 0.07, bodyDepth + 0.07]} radius={0.09} smoothness={4}>
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </RoundedBox>
          <RoundedBox args={[bodyWidth, bodyHeight, bodyDepth]} radius={0.075} smoothness={4}>
            <primitive object={foilMaterial} attach="material" />
          </RoundedBox>
          <RoundedBox args={[bodyWidth + 0.025, bodyHeight + 0.025, bodyDepth + 0.025]} radius={0.08} smoothness={4}>
            <meshPhysicalMaterial
              color="#d8ffff"
              roughness={0.08}
              metalness={0.28}
              clearcoat={1}
              clearcoatRoughness={0.04}
              iridescence={1}
              iridescenceIOR={1.7}
              iridescenceThicknessRange={[180, 760]}
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </RoundedBox>

          <group name="createbox-lid" position={[0, 0.48, 0]}>
            <RoundedBox args={[lidWidth + 0.07, lidHeight + 0.07, lidDepth + 0.07]} radius={0.09} smoothness={4}>
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </RoundedBox>
            <RoundedBox args={[lidWidth, lidHeight, lidDepth]} radius={0.075} smoothness={4}>
              <primitive object={foilMaterial} attach="material" />
            </RoundedBox>
          </group>
          <RoundedBox args={[1.27, 0.07, 1.27]} radius={0.03} smoothness={3} position={[0, 0.395, 0]}>
            <meshToonMaterial color="#1a1825" gradientMap={TOON_RAMP} emissive="#4a153b" emissiveIntensity={0.16} />
          </RoundedBox>

          {[0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].map((rotationY, index) => (
            <mesh key={rotationY} position={[0, 0.625, 0]} rotation={[0, rotationY, 0]}>
              <boxGeometry args={[index < 2 ? 0.78 : 0.64, 0.018, 0.045]} />
              <meshBasicMaterial
                color={index % 2 ? '#fff08b' : '#b9ffff'}
                transparent
                opacity={0.88}
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.642, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.075, 24]} />
            <meshBasicMaterial color="#fffbd1" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </>
  )
}

function CreateboxPedestal({ active }: { active: boolean }) {
  const plaqueTexture = useMemo(() => createCollectionPlaqueTexture(), [])
  useEffect(() => () => plaqueTexture.dispose(), [plaqueTexture])
  const base = MONKEYDHASHY_CREATEBOX_SPEC.pedestal.baseSize
  const stem = MONKEYDHASHY_CREATEBOX_SPEC.pedestal.stemSize
  const cap = MONKEYDHASHY_CREATEBOX_SPEC.pedestal.capSize
  return (
    <group position={[...MONKEYDHASHY_CREATEBOX_SPEC.pedestal.offset]} userData={{ furniture: 'createbox-holographic-plinth' }}>
      <InstallationBox position={[0, 0.09, 0]} scale={[base[2], base[1], base[0]]} color="#33464b" outlineWidth={0.022} />
      <InstallationBox position={[0, 0.21, 0]} scale={[1.1, 0.07, 1.24]} color="#b69a65" outlineWidth={0.01} />
      <InstallationBox position={[0, 0.56, 0]} scale={[stem[2], stem[1], stem[0]]} color="#e7e2d6" outlineWidth={0.018} emissive="#8edbe2" emissiveIntensity={active ? 0.055 : 0.015} />
      <InstallationBox position={[0, 0.96, 0]} scale={[cap[2], cap[1], cap[0]]} color="#b49b72" outlineWidth={0.012} />
      <InstallationBox position={[0, 1.025, 0]} scale={[1.02, 0.055, 1.13]} color="#f2eee4" outlineWidth={0.008} />

      <InstallationBox position={[0, 0.52, 0.472]} scale={[0.86, 0.42, 0.045]} color="#b69a65" outlineWidth={0.009} />
      <mesh position={[0, 0.52, 0.5]} scale={[0.78, 0.34, 1]} renderOrder={6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={plaqueTexture} toneMapped={false} />
      </mesh>
    </group>
  )
}

function CreateboxBackdropFrame({
  active,
  reducedMotion,
}: {
  active: boolean
  reducedMotion: boolean
}) {
  const [outerWidth, outerHeight] = MONKEYDHASHY_CREATEBOX_SPEC.backdrop.outerSize
  return (
    <group userData={{ installationPart: 'animated-original-artwork' }}>
      <InstallationBox
        position={[0, 0, 0]}
        scale={[outerWidth + 0.12, outerHeight + 0.12, 0.14]}
        color="#273137"
        outlineWidth={0.022}
      />
      <InstallationBox
        position={[0, 0, 0.08]}
        scale={[outerWidth + 0.035, outerHeight + 0.035, 0.065]}
        color="#c3cbc6"
        outlineWidth={0.007}
        emissive="#91d9dc"
        emissiveIntensity={active ? 0.035 : 0.008}
      />
      <Suspense fallback={<CreateboxBackdropPlaceholder />}>
        <AnimatedCreateboxMedia reducedMotion={reducedMotion} active={active} />
      </Suspense>
    </group>
  )
}

export function MonkeydhashyCreateboxInstallation({
  reducedMotion,
  active,
}: {
  reducedMotion: boolean
  active: boolean
}) {
  const provenance = useMemo(() => createMuseumArtworkProvenance({
    id: MONKEYDHASHY_CREATEBOX_SPEC.id,
    title: MONKEYDHASHY_CREATEBOX_SPEC.title,
    collection: MONKEYDHASHY_CREATEBOX_SPEC.collection,
    sourceUrl: MONKEYDHASHY_CREATEBOX_SPEC.sourceUrl,
    ownerHint: MONKEYDHASHY_CREATEBOX_SPEC.owner,
  }), [])
  const backdrop = MONKEYDHASHY_CREATEBOX_SPEC.backdrop

  return (
    <group
      position={[...backdrop.position]}
      rotation={[0, backdrop.rotationY, 0]}
      userData={{
        landmark: MONKEYDHASHY_CREATEBOX_SPEC.landmark,
        installation: MONKEYDHASHY_CREATEBOX_SPEC.id,
        owner: MONKEYDHASHY_CREATEBOX_SPEC.owner.label,
        [MUSEUM_ARTWORK_USER_DATA_KEY]: provenance,
      }}
    >
      <CreateboxBackdropFrame active={active} reducedMotion={reducedMotion} />
      <CreateboxPedestal active={active} />
    </group>
  )
}
