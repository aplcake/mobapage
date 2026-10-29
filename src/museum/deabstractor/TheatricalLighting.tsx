import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Ball, Box, Cylinder } from './ApparatusParts'
import type { SceneClock } from './ApparatusScene'
import { GALLERY } from './MuseumGallery'
import { galleryLightingPose } from './lightingScore'

const WARM = new THREE.Color('#fff2d3')
const RED = new THREE.Color('#ff402c')
const AMBER = new THREE.Color('#ffce70')
const HOT = new THREE.Color('#fff3b2')
const CLEAR = new THREE.Color('#acffba')
const COOL = new THREE.Color('#a5deff')
const UNLIT = new THREE.Color('#6a3930')
const ROOM_RED = new THREE.Color('#ff261b')
const ROOM_COOL = new THREE.Color('#c3d4e5')

type Clock = RefObject<SceneClock>

function WarningBeacon({ side, clock }: { side: -1 | 1; clock: Clock }) {
  const reflector = useRef<THREE.Group>(null)
  const bulb = useRef<THREE.MeshBasicMaterial>(null)
  const spot = useRef<THREE.SpotLight>(null)
  const beam = useRef<THREE.Mesh>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const beamResources = useMemo(() => ({
    geometry: new THREE.CylinderGeometry(0.03, 1, 1, 32, 8, true).translate(0, -0.5, 0),
    direction: new THREE.Vector3(), axis: new THREE.Vector3(0, -1, 0),
    material: new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      uniforms: { tint: { value: new THREE.Color('#ff7652') }, opacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
        void main() {
          vUv = uv; vNormal = normalize(normalMatrix * normal);
          vec4 p = modelViewMatrix * vec4(position, 1.0); vView = -p.xyz;
          gl_Position = projectionMatrix * p;
        }`,
      fragmentShader: `uniform vec3 tint; uniform float opacity;
        varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
        void main() {
          float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 0.75);
          float ends = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.93, 1.0, vUv.y));
          gl_FragColor = vec4(tint, opacity * edge * ends * (0.4 + 0.6 * vUv.y));
          #include <colorspace_fragment>
        }`,
    }),
  }), [])
  useEffect(() => () => { beamResources.geometry.dispose(); beamResources.material.dispose() }, [beamResources])
  const x = side * 4.15
  useFrame(() => {
    const { elapsed, procedure, reducedMotion } = clock.current
    const p = galleryLightingPose(elapsed, procedure, reducedMotion, clock.current.holdTime)
    const amount = p.warning * (side < 0 ? p.left : p.right)
    if (reflector.current) reflector.current.rotation.y = side * p.phase
    if (bulb.current) bulb.current.color.copy(UNLIT).lerp(RED, amount).lerp(AMBER, p.focus * 0.8).lerp(CLEAR, p.clearance).lerp(AMBER, p.celebration)
    if (spot.current) {
      spot.current.intensity = amount * (210 + p.pressure * 100) + p.clearance * 42 + p.celebration * 160
      spot.current.color.copy(RED).lerp(CLEAR, p.clearance).lerp(AMBER, p.celebration)
    }
    target.position.set(side * (1.7 + p.sweep + p.celebration * 4.2), 0.28, 1.1 - p.celebration * 1.8)
    target.updateMatrixWorld()
    if (beam.current) {
      const direction = beamResources.direction.copy(target.position).sub(beam.current.position)
      const length = direction.length()
      beam.current.quaternion.setFromUnitVectors(beamResources.axis, direction.normalize())
      beam.current.scale.set(length * 0.43, length, length * 0.43)
      beam.current.visible = !reducedMotion && (p.warning > 0 || p.clearance > 0)
      beamResources.material.uniforms.opacity.value = amount * 0.5 + p.clearance * 0.035 + p.celebration * 0.16
      beamResources.material.uniforms.tint.value.copy(RED).lerp(CLEAR, p.clearance).lerp(AMBER, p.celebration)
    }
  })
  return <group name={`gallery-warning-beacon-${side}`}>
    <group position={[x, 7.15, -5.32]}>
      <Box size={[0.72, 1.03, 0.18]} color={GALLERY.darkTeak} position={[0, 0, -0.2]} radius={0.12} />
      <Box size={[0.11, 0.24, 0.64]} color={GALLERY.brass} position={[0, -0.36, 0.07]} radius={0.025} />
      <Cylinder radius={0.35} height={0.14} color={GALLERY.brass} position={[0, -0.18, 0.3]} outline={0.01} />
      <mesh position={[0, 0.12, 0.3]}>
        <capsuleGeometry args={[0.21, 0.24, 5, 16]} />
        <meshBasicMaterial ref={bulb} color={UNLIT} toneMapped={false} />
      </mesh>
      <group ref={reflector} position={[0, 0.12, 0.3]}>
        <Ball radius={0.24} color={GALLERY.brass} position={[0, 0, -0.12]} scale={[1, 1.35, 0.35]} outline={0.015} />
      </group>
      <Cylinder radius={0.29} height={0.075} color={GALLERY.brass} position={[0, 0.46, 0.3]} outline={0.01} />
      {[-1, 1].map(sign => <Cylinder key={sign} radius={0.02} height={0.59} color={GALLERY.darkTeak} position={[sign * 0.265, 0.14, 0.3]} outline={0} />)}
    </group>
    <primitive object={target} />
    <mesh ref={beam} position={[x, 7.3, -4.9]} geometry={beamResources.geometry} material={beamResources.material} raycast={() => null} dispose={null} />
    <spotLight ref={spot} position={[x, 7.3, -4.9]} target={target} color={RED} intensity={0} angle={0.72} penumbra={0.8} distance={24} decay={2} />
  </group>
}

function StageFootlights({ clock }: { clock: Clock }) {
  const lamps = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  useFrame(() => {
    const { elapsed, procedure, reducedMotion } = clock.current
    const p = galleryLightingPose(elapsed, procedure, reducedMotion, clock.current.holdTime)
    lamps.current.forEach((lamp, i) => {
      if (!lamp) return
      const chase = reducedMotion ? 0.7 : 0.72 + Math.sin(p.phase - i * Math.PI / 6) * 0.28
      lamp.color.copy(UNLIT).lerp(RED, p.warning)
        .lerp(HOT, p.warning * chase ** 2 * 0.65)
        .lerp(AMBER, p.focus * 0.9).lerp(CLEAR, p.clearance).lerp(HOT, p.celebration * chase)
    })
  })
  return <group name="exhibit-footlights">
    {Array.from({ length: 24 }, (_, i) => <group key={i} rotation={[0, (i + 0.5) / 24 * Math.PI * 2, 0]}>
      <Box size={[0.45, 0.045, 0.19]} position={[0, 0.285, 4.35]} color={GALLERY.darkTeak} radius={0.012} outline={0} />
      <mesh position={[0, 0.311, 4.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.36, 0.12]} />
        <meshBasicMaterial ref={value => { lamps.current[i] = value }} color={UNLIT} toneMapped={false} />
      </mesh>
    </group>)}
  </group>
}

function ExhibitMarquee({ clock }: { clock: Clock }) {
  const sockets = useRef<THREE.InstancedMesh>(null)
  const bulbs = useRef<THREE.InstancedMesh>(null)
  const layout = useMemo(() => [
    ...[-1, 1].flatMap(side => Array.from({ length: 12 }, (_, i) => ({ x: side * 4.95, y: 2.9 + i * 0.5, phase: i * 0.35 }))),
    ...Array.from({ length: 19 }, (_, i) => ({ x: (i - 9) * 0.55, y: 8.9, phase: 4.2 + (9 - Math.abs(i - 9)) * 0.35 })),
  ], [])
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), color: new THREE.Color() }), [])
  useEffect(() => {
    layout.forEach(({ x, y }, i) => {
      scratch.object.position.set(x, y, -5.19)
      scratch.object.rotation.set(Math.PI / 2, 0, 0)
      scratch.object.scale.set(1, 1, 1)
      scratch.object.updateMatrix()
      sockets.current?.setMatrixAt(i, scratch.object.matrix)
      scratch.object.position.z = -5.14
      scratch.object.rotation.set(0, 0, 0)
      scratch.object.scale.set(1, 1, 0.6)
      scratch.object.updateMatrix()
      bulbs.current?.setMatrixAt(i, scratch.object.matrix)
      bulbs.current?.setColorAt(i, UNLIT)
    })
    if (sockets.current) sockets.current.instanceMatrix.needsUpdate = true
    if (bulbs.current) {
      bulbs.current.instanceMatrix.needsUpdate = true
      if (bulbs.current.instanceColor) bulbs.current.instanceColor.needsUpdate = true
    }
  }, [layout, scratch])
  useFrame(() => {
    if (!bulbs.current) return
    const { elapsed, procedure, reducedMotion } = clock.current
    const p = galleryLightingPose(elapsed, procedure, reducedMotion, clock.current.holdTime)
    layout.forEach(({ phase }, i) => {
      const chase = reducedMotion ? 0.65 : 0.67 + Math.sin(p.phase * 1.25 - phase) * 0.33
      scratch.color.copy(UNLIT).lerp(RED, p.warning * 0.85)
        .lerp(HOT, p.warning * chase ** 2 * 0.85)
        .lerp(AMBER, p.focus * 0.5)
        .lerp(CLEAR, p.clearance * 0.75).lerp(HOT, p.celebration)
      bulbs.current!.setColorAt(i, scratch.color)
    })
    if (bulbs.current.instanceColor) bulbs.current.instanceColor.needsUpdate = true
  })
  return <group name="exhibit-marquee">
    {[-1, 1].map(side => <Box key={side} size={[0.24, 6.2, 0.1]} position={[side * 4.95, 5.8, -5.28]} color={GALLERY.darkTeak} radius={0.035} outline={0} />)}
    <Box size={[10.14, 0.24, 0.1]} position={[0, 8.9, -5.28]} color={GALLERY.darkTeak} radius={0.035} outline={0} />
    <instancedMesh ref={sockets} args={[undefined, undefined, layout.length]} frustumCulled={false}>
      <cylinderGeometry args={[0.145, 0.145, 0.09, 12]} /><meshToonMaterial color={GALLERY.brass} />
    </instancedMesh>
    <instancedMesh ref={bulbs} args={[undefined, undefined, layout.length]} frustumCulled={false}>
      <sphereGeometry args={[0.105, 12, 8]} /><meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  </group>
}

export function TheatricalLighting({ clock }: { clock: Clock }) {
  const ambient = useRef<THREE.AmbientLight>(null)
  const fill = useRef<THREE.HemisphereLight>(null)
  const key = useRef<THREE.SpotLight>(null)
  const rim = useRef<THREE.SpotLight>(null)
  const room = useRef<THREE.DirectionalLight>(null)
  const targets = useMemo(() => {
    const key = new THREE.Object3D(), rim = new THREE.Object3D(), room = new THREE.Object3D()
    key.position.set(0, 2.6, 0)
    rim.position.set(-0.25, 3.3, 0.6)
    room.position.set(0, 4, -5.7)
    return { key, rim, room }
  }, [])
  useFrame(() => {
    const { elapsed, procedure, reducedMotion } = clock.current
    const p = galleryLightingPose(elapsed, procedure, reducedMotion, clock.current.holdTime)
    // The room carries the alarm; the exhibit keeps its readable warm/cool lighting.
    if (ambient.current) {
      ambient.current.intensity = 0.3 + p.warning * 0.12
      ambient.current.color.set('#ffffff').lerp(ROOM_RED, p.warning * 0.65)
    }
    if (fill.current) {
      fill.current.intensity = 0.7 + p.warning * 0.15 - p.focus * 0.06
      fill.current.color.copy(ROOM_COOL).lerp(RED, p.warning * 0.85).lerp(AMBER, p.celebration * 0.5)
    }
    if (room.current) {
      room.current.color.copy(ROOM_RED).lerp(AMBER, p.celebration)
      room.current.intensity = p.warning * (1.9 + p.pressure * 1.3) + p.celebration * 1.7
    }
    if (key.current) {
      key.current.color.copy(WARM).lerp(AMBER, p.warning * 0.12)
      key.current.intensity = 260 + p.focus * 24 + p.celebration * 28
    }
    if (rim.current) {
      rim.current.color.copy(COOL).lerp(RED, p.warning * 0.35).lerp(CLEAR, p.clearance * 0.4)
      rim.current.intensity = 105 + p.warning * 25 + p.clearance * 10
    }
  })
  return <>
    <ambientLight ref={ambient} intensity={0.3} />
    <hemisphereLight ref={fill} args={['#c3d4e5', '#48546a', 0.7]} />
    <primitive object={targets.key} /><primitive object={targets.rim} /><primitive object={targets.room} />
    <directionalLight ref={room} position={[0, 7, 8]} target={targets.room} intensity={0} color={ROOM_RED} />
    <spotLight ref={key} position={[-3.8, 8.8, 6]} target={targets.key} intensity={260} color={WARM}
      angle={0.48} penumbra={0.65} distance={22} decay={2}
      castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={22}
      shadow-normalBias={0.035} shadow-bias={-0.0001} />
    <spotLight ref={rim} position={[4.5, 6.8, -2.3]} target={targets.rim} intensity={105} color={COOL}
      angle={0.67} penumbra={0.7} distance={14} decay={2} />
    <WarningBeacon side={-1} clock={clock} /><WarningBeacon side={1} clock={clock} />
    <StageFootlights clock={clock} /><ExhibitMarquee clock={clock} />
  </>
}
