'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { MuseumAssetSummary } from '../collection-registry/museumAssetTypes'
import { GlowbudMuseumAvatar } from '../glowbuds/GlowbudMuseumAvatar'
import {
  glowbudAttributesForToken,
  glowbudImageUrl,
  glowbudLookLine,
} from '../glowbuds/glowbudDisplayTraits'
import { useMuseumOwnerDisplay } from './ArtworkProvenanceHud'
import {
  createMuseumArtworkProvenance,
  museumArtworkIdentityFromAsset,
  openSeaItemUrl,
  shortenMuseumAddress,
} from './artworkProvenance'
import { ownedNftMediaProxyUrl } from './ownedNfts'
import styles from './GlowbudComparisonPanel.module.css'

function GlowbudPresentation({
  resident,
  reducedMotion,
}: {
  resident: MuseumAssetSummary
  reducedMotion: boolean
}) {
  const turntable = useRef<THREE.Group>(null)
  const attributes = resident.attributes.length
    ? resident.attributes
    : glowbudAttributesForToken(resident.tokenId)

  useFrame(({ clock }, delta) => {
    if (!turntable.current || reducedMotion) return
    const target = Math.sin(clock.elapsedTime * 0.38) * 0.18
    turntable.current.rotation.y = THREE.MathUtils.damp(turntable.current.rotation.y, target, 3.5, delta)
  })

  return (
    <>
      <ambientLight intensity={1.75} />
      <directionalLight position={[3.2, 5.4, 4]} intensity={3.4} color="#fff0c8" />
      <directionalLight position={[-3.4, 2.3, 2.6]} intensity={1.7} color="#8ee0d8" />
      <pointLight position={[0, 0.3, 2.8]} intensity={1.25} distance={7} color="#f6b3d0" />
      <group ref={turntable} position={[0, -0.92, 0]} scale={1.24}>
        <GlowbudMuseumAvatar
          tokenId={resident.tokenId}
          attributes={attributes}
          phase={0.45}
          reducedMotion={reducedMotion}
        />
      </group>
      <mesh position={[0, -0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.08, 48]} />
        <meshBasicMaterial color="#254d49" transparent opacity={0.17} depthWrite={false} />
      </mesh>
    </>
  )
}

export function GlowbudComparisonPanel({
  resident,
  ownerAddress,
  reducedMotion,
  onClose,
}: {
  resident: MuseumAssetSummary | null
  ownerAddress: string | null
  reducedMotion: boolean
  onClose: () => void
}) {
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null)
  const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null)
  const attributes = useMemo(() => resident
    ? resident.attributes.length
      ? resident.attributes
      : glowbudAttributesForToken(resident.tokenId)
    : [], [resident])
  const provenance = useMemo(() => {
    if (!resident) return null
    const validOwnerAddress = ownerAddress && /^0x[a-fA-F0-9]{40}$/.test(ownerAddress)
      ? ownerAddress.toLowerCase() as `0x${string}`
      : null
    return createMuseumArtworkProvenance({
      id: `glowbud-study-${resident.tokenId}`,
      title: resident.title || `Glowbud #${resident.tokenId}`,
      collection: resident.collection || 'Glowbuds',
      identity: museumArtworkIdentityFromAsset(resident),
      ownerHint: resident.ownerHint ?? (validOwnerAddress
        ? { address: validOwnerAddress, label: shortenMuseumAddress(validOwnerAddress) }
        : null),
    })
  }, [ownerAddress, resident])

  useEffect(() => {
    if (!resident) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, resident])

  if (!resident || !provenance) return null
  const originalUrl = resident.imageUrl ?? glowbudImageUrl(resident.tokenId)
  const originalSrc = originalUrl ? ownedNftMediaProxyUrl(originalUrl, 'room') : null
  const imageUnavailable = failedImageKey === resident.key
  const imageReady = loadedImageKey === resident.key
  const lookLine = glowbudLookLine(attributes)

  return (
    <div className={styles.scrim} onPointerDown={onClose} data-testid="glowbud-comparison-scrim">
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="glowbud-comparison-title"
        aria-describedby="glowbud-comparison-description"
        onPointerDown={(event) => event.stopPropagation()}
        data-testid="glowbud-comparison-panel"
      >
        <ComparisonHeader provenance={provenance} onClose={onClose} />

        <div className={styles.study}>
          <figure className={`${styles.studyPane} ${styles.pixelPane}`}>
            <figcaption><span>01</span><strong>Original pixel</strong></figcaption>
            <div className={styles.pixelMount}>
              {originalSrc && !imageReady && !imageUnavailable ? (
                <div className={styles.imageLoading} role="status" aria-live="polite">
                  <span aria-hidden="true"><i /><i /><i /></span>
                  <small>Retrieving original</small>
                </div>
              ) : null}
              {originalSrc && !imageUnavailable ? (
                // Keep the source image unprocessed: nearest-neighbour pixels are part of the work.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={imageReady ? styles.pixelImageReady : styles.pixelImageLoading}
                  src={originalSrc}
                  alt={`Original pixel artwork for ${provenance.title}`}
                  onLoad={() => setLoadedImageKey(resident.key)}
                  onError={() => setFailedImageKey(resident.key)}
                />
              ) : (
                <div className={styles.imageFallback} role="status">
                  <span aria-hidden="true">◇</span>
                  <small>Original artwork unavailable</small>
                </div>
              )}
            </div>
          </figure>

          <div className={styles.transformation} aria-label="Transformed into 3D">
            <span aria-hidden="true">→</span>
          </div>

          <figure className={`${styles.studyPane} ${styles.threePane}`}>
            <figcaption><span>02</span><strong>Museum 3D</strong></figcaption>
            <div className={styles.stage} aria-label={`Animated 3D interpretation of ${provenance.title}`}>
              <Canvas
                camera={{ position: [0, 0.12, 4.15], fov: 34, near: 0.1, far: 20 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
              >
                <GlowbudPresentation resident={resident} reducedMotion={reducedMotion} />
              </Canvas>
            </div>
          </figure>
        </div>

        <footer className={styles.footer}>
          <p id="glowbud-comparison-description">
            <span>Trait translation</span>
            <strong>{lookLine || 'Pixel character · Living sculpture'}</strong>
          </p>
          {provenance.identity ? (
            <a href={openSeaItemUrl(provenance.identity)} target="_blank" rel="noreferrer">
              View token <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </footer>
      </section>
    </div>
  )
}

function ComparisonHeader({
  provenance,
  onClose,
}: {
  provenance: ReturnType<typeof createMuseumArtworkProvenance>
  onClose: () => void
}) {
  const owner = useMuseumOwnerDisplay(provenance)
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <span className={styles.eyebrow}>MoBA · Glowbud Study</span>
        <h2 id="glowbud-comparison-title">{provenance.title}</h2>
      </div>
      <div className={styles.owner} aria-live="polite">
        <span className={styles.ownerSeal} aria-hidden="true">◇</span>
        <span>
          <small>{owner.label}</small>
          <strong>{owner.primary}</strong>
          {owner.secondary ? <code>{owner.secondary}</code> : null}
        </span>
      </div>
      <button type="button" className={styles.close} onClick={onClose} autoFocus aria-label="Close Glowbud study">
        <span aria-hidden="true">×</span>
      </button>
    </header>
  )
}
