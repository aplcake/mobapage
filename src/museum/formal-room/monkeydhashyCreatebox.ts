export const MONKEYDHASHY_CREATEBOX_SPEC = {
  id: 'moba-two-monkeydhashy-holo-box',
  galleryId: 'moba-two',
  landmark: 'createbox-holographic-installation',
  title: '!Createbox',
  artist: 'Joseph Pixler',
  collection: 'MoBA Gallery',
  sourceUrl: 'https://opensea.io/item/base/0x04619852f38ebec22bb94ef36b99351db9900194/6',
  contract: '0x04619852f38ebec22bb94ef36b99351db9900194',
  tokenId: '6',
  owner: {
    address: '0xfbf8ae69b25542ac6833e2de631e7b082ffab1f5',
    label: 'MonkeyDHashy',
  },
  edition: {
    originalSupply: 50,
    burned: 49,
    surviving: 1,
    label: '1/1',
  },
  media: {
    original: '/museum/formal-room/installations/createbox-6/createbox-6-original.gif',
    poster: '/museum/formal-room/installations/createbox-6/createbox-6-poster.webp',
    motionSheet: '/museum/formal-room/installations/createbox-6/createbox-6-sheet.webp',
    sourceSha256: 'bc5041c70ced33175d719e4a52a9ef6ab5920b2fdd295b1bf29224ae41ffc191',
    frameCount: 20,
    columns: 5,
    rows: 4,
    frameDurationMs: 100,
  },
  backdrop: {
    position: [-5.65, 0.72, 26.18] as const,
    rotationY: Math.PI / 2,
    outerSize: [1.36, 1.36] as const,
    artSize: [1.14, 1.14] as const,
  },
  pedestal: {
    position: [-3.8, -1.93, 26.74] as const,
    offset: [-0.56, -2.65, 1.85] as const,
    baseSize: [1.45, 0.18, 1.35] as const,
    stemSize: [0.88, 0.72, 0.82] as const,
    capSize: [1.22, 0.1, 1.1] as const,
  },
  box: {
    offset: [-0.56, -0.87, 1.85] as const,
    pivotY: -0.15,
    bodySize: [1.22, 1.08, 1.22] as const,
    lidSize: [1.36, 0.24, 1.36] as const,
    baselineRotation: [0.18, -0.62, -0.08] as const,
    spinRadiansPerSecond: 0.32,
    floatHeight: 0.055,
  },
  lights: [
    {
      id: 'createbox-cyan-key',
      position: [-1.3, 2.55, 25.9] as const,
      target: [-3.8, -0.15, 26.74] as const,
      color: '#9ef7ff',
      intensity: 3.8,
      distance: 5.2,
      angle: 0.46,
      penumbra: 0.9,
    },
    {
      id: 'createbox-pearl-art-wash',
      position: [-3.1, 2.7, 25.8] as const,
      target: [-5.55, 0.72, 26.18] as const,
      color: '#ffd0eb',
      intensity: 1.7,
      distance: 4.6,
      angle: 0.5,
      penumbra: 0.92,
    },
  ],
  collider: {
    id: 'moba-two-monkeydhashy-holo-box',
    minX: -16.86,
    maxX: -15.14,
    minZ: 22.4,
    maxZ: 23.98,
  },
  reviewPose: {
    x: -12.65,
    z: 23.2,
    yaw: Math.PI / 2,
  },
} as const

export type MonkeydhashyCreateboxMotion = {
  floatY: number
  rotationX: number
  rotationY: number
  rotationZ: number
  lidLift: number
  shimmer: number
  orbitRotation: number
}

export function monkeydhashyCreateboxMotionAtTime(
  elapsedSeconds: number,
  reducedMotion = false,
): MonkeydhashyCreateboxMotion {
  const time = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0
  const [baselineX, baselineY, baselineZ] = MONKEYDHASHY_CREATEBOX_SPEC.box.baselineRotation
  if (reducedMotion) {
    return {
      floatY: 0,
      rotationX: baselineX,
      rotationY: baselineY,
      rotationZ: baselineZ,
      lidLift: 0.012,
      shimmer: 0.58,
      orbitRotation: 0.38,
    }
  }

  const slowBreath = Math.sin(time * 0.92)
  return {
    floatY: slowBreath * MONKEYDHASHY_CREATEBOX_SPEC.box.floatHeight,
    rotationX: baselineX + Math.sin(time * 0.74) * 0.045,
    rotationY: baselineY + (time * MONKEYDHASHY_CREATEBOX_SPEC.box.spinRadiansPerSecond) % (Math.PI * 2),
    rotationZ: baselineZ + Math.sin(time * 0.58 + 0.9) * 0.035,
    lidLift: 0.012 + (0.5 + slowBreath * 0.5) * 0.018,
    shimmer: 0.5 + Math.sin(time * 1.38 + 0.4) * 0.5,
    orbitRotation: (time * 0.22) % (Math.PI * 2),
  }
}
