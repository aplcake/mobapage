export const PERSONAL_GALLERY_DOOR_SPEC = {
  id: 'personal-galleries-coming-soon',
  label: 'Personal Galleries',
  status: 'Coming Soon',
  position: [0, 0, 35.34] as const,
  centralBayWidth: 4.8,
  casing: {
    width: 4.42,
    height: 4.58,
    archRise: 0.96,
  },
  leaf: {
    width: 3.72,
    height: 4.04,
    archRise: 0.8,
  },
  collider: {
    id: 'personal-galleries-locked-door',
    minX: -2.26,
    maxX: 2.26,
    minZ: 34.92,
    maxZ: 35.5,
  },
  reviewPose: {
    x: 0,
    z: 27,
    yaw: Math.PI,
  },
  reviewPoseLeft: {
    x: -1.65,
    z: 31.8,
    yaw: -2.705,
  },
  reviewPoseRight: {
    x: 1.65,
    z: 31.8,
    yaw: 2.705,
  },
} as const
