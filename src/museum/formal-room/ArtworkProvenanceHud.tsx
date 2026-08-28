'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './FormalMuseumRoom.module.css'
import {
  museumArtworkOwnerRequestUrl,
  museumOwnerDisplayName,
  openSeaItemUrl,
  shortenMuseumAddress,
  type MuseumArtworkOwnerResponse,
  type MuseumArtworkProvenance,
} from './artworkProvenance'

type OwnerRecordState =
  | { status: 'idle' | 'loading' | 'unavailable' }
  | { status: 'ready'; value: MuseumArtworkOwnerResponse }

const ownerRecordCache = new Map<string, OwnerRecordState>()
const ownerRecordRequests = new Map<string, Promise<OwnerRecordState>>()

function ownerCacheKey(artwork: MuseumArtworkProvenance) {
  const identity = artwork.identity
  return identity
    ? `${identity.chainSlug}:${identity.contract}:${identity.tokenId}`
    : artwork.id
}

function readOwnerResponse(value: unknown): MuseumArtworkOwnerResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const owner = record.owner
  if (!owner || typeof owner !== 'object' || Array.isArray(owner)) return null
  const ownerRecord = owner as Record<string, unknown>
  const address = typeof ownerRecord.address === 'string' ? ownerRecord.address.toLowerCase() : ''
  if (!/^0x[a-f0-9]{40}$/.test(address)) return null
  const ownerCount = typeof record.ownerCount === 'number' && Number.isSafeInteger(record.ownerCount)
    ? Math.max(1, record.ownerCount)
    : 1
  return {
    owner: {
      address: address as `0x${string}`,
      username: typeof ownerRecord.username === 'string' && ownerRecord.username.trim()
        ? ownerRecord.username.trim()
        : null,
      ensName: typeof ownerRecord.ensName === 'string' && ownerRecord.ensName.trim()
        ? ownerRecord.ensName.trim()
        : null,
    },
    ownerCount,
    hasMoreOwners: record.hasMoreOwners === true,
  }
}

function requestMuseumArtworkOwner(artwork: MuseumArtworkProvenance, key: string) {
  const existing = ownerRecordRequests.get(key)
  if (existing) return existing
  if (!artwork.identity) return Promise.resolve({ status: 'idle' } as const)

  const request = fetch(museumArtworkOwnerRequestUrl(artwork.identity), {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => response.ok ? readOwnerResponse(await response.json()) : null)
      .then((value): OwnerRecordState => value
          ? { status: 'ready', value }
          : { status: 'unavailable' })
      .catch((): OwnerRecordState => ({ status: 'unavailable' }))
      .then((nextState) => {
        ownerRecordCache.set(key, nextState)
        return nextState
      })
      .finally(() => {
        ownerRecordRequests.delete(key)
      })
  ownerRecordCache.set(key, { status: 'loading' })
  ownerRecordRequests.set(key, request)
  return request
}

function useMuseumArtworkOwner(artwork: MuseumArtworkProvenance) {
  const key = ownerCacheKey(artwork)
  const [state, setState] = useState<OwnerRecordState>(() => (
    artwork.identity
      ? ownerRecordCache.get(key) ?? { status: 'loading' }
      : { status: 'idle' }
  ))

  useEffect(() => {
    if (!artwork.identity) return
    let active = true
    void requestMuseumArtworkOwner(artwork, key).then((nextState) => {
      if (active) setState(nextState)
    })
    return () => {
      active = false
    }
  }, [artwork, key])

  return state
}

export type MuseumOwnerDisplay = {
  label: string
  primary: string
  secondary: string | null
}

export function useMuseumOwnerDisplay(artwork: MuseumArtworkProvenance): MuseumOwnerDisplay {
  const ownerState = useMuseumArtworkOwner(artwork)
  return useMemo(() => {
    if (!artwork.identity) {
      return {
        label: 'Museum collection',
        primary: artwork.collection,
        secondary: null,
      }
    }
    if (ownerState.status === 'ready') {
      const { owner, ownerCount, hasMoreOwners } = ownerState.value
      const displayName = museumOwnerDisplayName(owner, artwork.ownerHint)
      const additionalOwners = ownerCount > 1
        ? ` + ${ownerCount - 1}${hasMoreOwners ? '+' : ''}`
        : hasMoreOwners
          ? ' + more'
          : ''
      return {
        label: ownerCount > 1 || hasMoreOwners ? 'Collectors' : 'Current owner',
        primary: `${displayName}${additionalOwners}`,
        secondary: displayName === shortenMuseumAddress(owner.address)
          ? null
          : shortenMuseumAddress(owner.address),
      }
    }
    if (ownerState.status === 'unavailable') {
      if (artwork.ownerHint) {
        return {
          label: 'Collection credit',
          primary: artwork.ownerHint.label,
          secondary: shortenMuseumAddress(artwork.ownerHint.address),
        }
      }
      return {
        label: 'Current owner',
        primary: 'Record temporarily unavailable',
        secondary: null,
      }
    }
    if (artwork.ownerHint) {
      return {
        label: 'Collection credit',
        primary: artwork.ownerHint.label,
        secondary: null,
      }
    }
    return {
      label: 'Current owner',
      primary: 'Consulting the register…',
      secondary: null,
    }
  }, [artwork, ownerState])
}

function ArtworkProvenanceCard({
  artwork,
  hidden,
}: {
  artwork: MuseumArtworkProvenance
  hidden: boolean
}) {
  const visible = !hidden
  const ownerCopy = useMuseumOwnerDisplay(artwork)

  const sourceUrl = artwork.sourceUrl
    ?? (artwork.identity ? openSeaItemUrl(artwork.identity) : null)

  return (
    <aside
      className={`${styles.artworkProvenanceHud} ${visible ? styles.artworkProvenanceHudVisible : ''}`}
      aria-live="polite"
      aria-hidden={!visible}
      data-testid="artwork-provenance-hud"
    >
      <div className={styles.artworkProvenanceTopline} aria-hidden="true">
        <span />
        <i>MoBA</i>
        <span />
      </div>
      <div className={styles.artworkProvenanceEyebrow}>Now viewing</div>
      <strong className={styles.artworkProvenanceTitle}>{artwork.title}</strong>
      {artwork.artist ? (
        <div className={styles.artworkProvenanceArtist}>
          <span>Artist</span>
          <b>{artwork.artist}</b>
        </div>
      ) : null}
      <div className={styles.artworkProvenanceOwner}>
        <span className={styles.artworkProvenanceSeal} aria-hidden="true">◇</span>
        <span className={styles.artworkProvenanceOwnerCopy}>
          <small>{ownerCopy.label}</small>
          <b>{ownerCopy.primary}</b>
          {ownerCopy.secondary ? <code>{ownerCopy.secondary}</code> : null}
        </span>
      </div>
      <div className={styles.artworkProvenanceFooter}>
        <span>{artwork.collection}</span>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            tabIndex={visible ? 0 : -1}
            aria-label={`View ${artwork.title} on the marketplace`}
          >
            View work <i aria-hidden="true">↗</i>
          </a>
        ) : null}
      </div>
    </aside>
  )
}

export function ArtworkProvenanceHud({
  artwork,
  hidden,
}: {
  artwork: MuseumArtworkProvenance | null
  hidden: boolean
}) {
  return artwork
    ? <ArtworkProvenanceCard key={artwork.id} artwork={artwork} hidden={hidden} />
    : null
}
