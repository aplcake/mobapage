'use client'

import Image, { type ImageLoaderProps } from 'next/image'
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  discoverEvmWallets,
  normalizeWalletAddress,
  readWalletAccounts,
  requestWalletAccounts,
  subscribeToWalletAccounts,
  type DiscoveredWallet,
} from '../wallet/eip1193Wallet'
import {
  isEthereumAddress,
  ownedNftMediaProxyUrl,
  type OwnedNft,
  type OwnedNftsPage,
} from './ownedNfts'
import styles from './CollectionDesk.module.css'

const EMPTY_SLOTS: readonly [null, null, null] = [null, null, null]

type CollectionDeskProps = {
  open: boolean
  onClose: () => void
  onPreview: (
    artworks: readonly [OwnedNft, OwnedNft, OwnedNft],
    address: string,
    source: CollectionAddressSource,
  ) => void
  onAddressChange: (address: string | null) => void
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'
export type CollectionAddressSource = 'wallet' | 'address'
type AddressSource = CollectionAddressSource | null

function passthroughImageLoader({ src }: ImageLoaderProps) {
  return src
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const error = 'error' in payload ? payload.error : null
  if (!error || typeof error !== 'object') return fallback
  const message = 'message' in error ? error.message : null
  return typeof message === 'string' && message.trim() ? message : fallback
}

async function fetchOwnedNftsPage(address: string, cursor: string | null, signal?: AbortSignal) {
  const query = new URLSearchParams({ address })
  if (cursor) query.set('cursor', cursor)
  const response = await fetch(`/api/opensea/owned-nfts?${query.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })
  const payload = await response.json().catch(() => null) as OwnedNftsPage | unknown
  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, 'The collection desk could not load this wallet.'))
  }
  if (!payload || typeof payload !== 'object' || !('nfts' in payload) || !Array.isArray(payload.nfts)) {
    throw new Error('The collection desk received artwork data it could not read.')
  }
  return payload as OwnedNftsPage
}

export async function verifyOwnedSelection(
  address: string,
  selections: readonly OwnedNft[],
  signal?: AbortSignal,
) {
  const response = await fetch('/api/opensea/verify-ownership', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address,
      selections: selections.map(({ tokenKey, contract, identifier }) => ({ tokenKey, contract, identifier })),
    }),
    cache: 'no-store',
    signal,
  })
  const payload = await response.json().catch(() => null) as unknown
  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, 'Ownership could not be checked right now.'))
  }
  if (!payload || typeof payload !== 'object' || !('verified' in payload)) {
    throw new Error('The ownership check returned a response we could not read.')
  }
  const result = payload as { verified: unknown; missingTokenKeys?: unknown }
  return {
    verified: result.verified === true,
    missingTokenKeys: Array.isArray(result.missingTokenKeys)
      ? result.missingTokenKeys.filter((key): key is string => typeof key === 'string')
      : [],
  }
}

function mergeUniqueNfts(current: OwnedNft[], incoming: OwnedNft[]) {
  const byTokenKey = new Map(current.map((nft) => [nft.tokenKey, nft]))
  for (const nft of incoming) byTokenKey.set(nft.tokenKey, nft)
  return [...byTokenKey.values()]
}

function hasOwnedNftMotion(nft: OwnedNft) {
  return Boolean(nft.animationUrl)
}

export function isOwnedNftDisplayable(nft: OwnedNft, brokenMediaKeys: ReadonlySet<string>) {
  return hasOwnedNftMotion(nft) || (Boolean(nft.imageUrl) && !brokenMediaKeys.has(nft.tokenKey))
}

export function calculateSlotTrayScrollLeft({
  currentScrollLeft,
  trayLeft,
  trayRight,
  slotLeft,
  slotRight,
  edgePadding,
}: {
  currentScrollLeft: number
  trayLeft: number
  trayRight: number
  slotLeft: number
  slotRight: number
  edgePadding: number
}) {
  const visibleLeft = trayLeft + edgePadding
  const visibleRight = trayRight - edgePadding
  if (slotLeft < visibleLeft) {
    return Math.max(0, currentScrollLeft + slotLeft - visibleLeft)
  }
  if (slotRight > visibleRight) {
    return Math.max(0, currentScrollLeft + slotRight - visibleRight)
  }
  return currentScrollLeft
}

function NftThumbnail({
  nft,
  eager,
  onBroken,
}: {
  nft: OwnedNft
  eager: boolean
  onBroken: (tokenKey: string) => void
}) {
  const [broken, setBroken] = useState(false)
  const thumbnailUrl = nft.thumbnailUrl ?? nft.imageUrl

  if (!thumbnailUrl || broken) {
    if (hasOwnedNftMotion(nft)) {
      return (
        <span className={styles.motionArtworkPlaceholder} aria-label="Animated artwork preview">
          <span aria-hidden="true">▶</span>
          <strong>Animated artwork</strong>
          <small>Moves in the room</small>
        </span>
      )
    }
    return (
      <span className={styles.missingArtwork} aria-label="Artwork preview unavailable">
        <span aria-hidden="true">◇</span>
        Preview unavailable
      </span>
    )
  }

  return (
    <Image
      loader={passthroughImageLoader}
      unoptimized
      src={ownedNftMediaProxyUrl(thumbnailUrl, 'thumb')}
      alt=""
      fill
      sizes="(max-width: 700px) 42vw, 170px"
      className={styles.nftImage}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => {
        setBroken(true)
        onBroken(nft.tokenKey)
      }}
    />
  )
}

function SlotCard({
  active,
  index,
  nft,
  slotRef,
  onActivate,
  onRemove,
}: {
  active: boolean
  index: number
  nft: OwnedNft | null
  slotRef: (node: HTMLDivElement | null) => void
  onActivate: () => void
  onRemove: () => void
}) {
  const labels = ['Left', 'Feature', 'Right']
  const slotLabel = labels[index]
  return (
    <div
      ref={slotRef}
      className={`${styles.slotCard} ${active ? styles.slotCardActive : ''}`}
      data-filled={nft ? 'true' : 'false'}
      data-animated={nft?.animationUrl ? 'true' : 'false'}
    >
      <button
        type="button"
        className={styles.slotSelect}
        onClick={onActivate}
        aria-pressed={active}
        aria-label={`${slotLabel} slot: ${nft?.title ?? 'empty'}${nft?.animationUrl ? ', animated artwork' : ''}`}
      >
        <span className={styles.slotTopline}>
          <span className={styles.slotNumber}>0{index + 1}</span>
          <small>{slotLabel}</small>
        </span>
        <strong className={styles.slotTitle} title={nft?.title}>{nft?.title ?? 'Choose artwork'}</strong>
        {nft?.animationUrl ? <span className={styles.slotMotionBadge} aria-hidden="true">▶ Animated</span> : null}
      </button>
      {nft ? (
        <button type="button" className={styles.slotRemove} onClick={onRemove} aria-label={`Remove ${nft.title} from slot ${index + 1}`}>×</button>
      ) : null}
    </div>
  )
}

export function CollectionDesk({ open, onClose, onPreview, onAddressChange }: CollectionDeskProps) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [activeWallet, setActiveWallet] = useState<DiscoveredWallet | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [addressSource, setAddressSource] = useState<AddressSource>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [addressEntry, setAddressEntry] = useState('')
  const [addressEntryError, setAddressEntryError] = useState<string | null>(null)
  const [nfts, setNfts] = useState<OwnedNft[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const [brokenMediaKeys, setBrokenMediaKeys] = useState<Set<string>>(() => new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [draftSlots, setDraftSlots] = useState<Array<OwnedNft | null>>([...EMPTY_SLOTS])
  const [activeSlot, setActiveSlot] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const deskRef = useRef<HTMLElement>(null)
  const slotTrayRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<Array<HTMLDivElement | null>>([])
  const slotScrollFrameRef = useRef<number | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const addressRef = useRef<string | null>(null)
  const requestGenerationRef = useRef(0)
  const loadMoreAbortRef = useRef<AbortController | null>(null)
  const previewAbortRef = useRef<AbortController | null>(null)
  const restoreAttemptedRef = useRef(false)
  const suppressRestoreRef = useRef(false)
  const selectionRevisionRef = useRef(0)

  const revealSlot = useCallback((index: number) => {
    if (slotScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(slotScrollFrameRef.current)
    }
    slotScrollFrameRef.current = window.requestAnimationFrame(() => {
      slotScrollFrameRef.current = null
      const tray = slotTrayRef.current
      const slot = slotRefs.current[index]
      if (!tray || !slot || tray.scrollWidth <= tray.clientWidth) return
      const trayRect = tray.getBoundingClientRect()
      const slotRect = slot.getBoundingClientRect()
      const edgePadding = 10
      const left = calculateSlotTrayScrollLeft({
        currentScrollLeft: tray.scrollLeft,
        trayLeft: trayRect.left,
        trayRight: trayRect.right,
        slotLeft: slotRect.left,
        slotRight: slotRect.right,
        edgePadding,
      })
      if (Math.abs(left - tray.scrollLeft) < 1) return
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      tray.scrollTo({ left, behavior: reducedMotion ? 'auto' : 'smooth' })
    })
  }, [])

  const updateAddress = useCallback((nextAddress: string | null, source: AddressSource) => {
    setAddressSource(source)
    if (addressRef.current === nextAddress) return
    requestGenerationRef.current += 1
    selectionRevisionRef.current += 1
    loadMoreAbortRef.current?.abort()
    previewAbortRef.current?.abort()
    addressRef.current = nextAddress
    setAddress(nextAddress)
    onAddressChange(nextAddress)
    setNfts([])
    setNextCursor(null)
    setLoadError(null)
    setLoadMoreError(null)
    setPreviewError(null)
    setPreviewing(false)
    setLoadingMore(false)
    setBrokenMediaKeys(new Set())
    setDraftSlots([...EMPTY_SLOTS])
    setActiveSlot(0)
    setQuery('')
    setCollectionFilter('all')
    setShowAll(false)
    setLoadState(nextAddress ? 'loading' : 'idle')
    setLiveMessage(nextAddress ? 'Wallet selected. Loading its owned artwork.' : 'Wallet cleared.')
  }, [onAddressChange])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void discoverEvmWallets().then((foundWallets) => {
      if (!cancelled) setWallets(foundWallets)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !wallets.length || address || restoreAttemptedRef.current || suppressRestoreRef.current) return
    restoreAttemptedRef.current = true
    let cancelled = false
    void (async () => {
      for (const wallet of wallets) {
        const accounts = await readWalletAccounts(wallet.provider).catch(() => [])
        const restored = normalizeWalletAddress(accounts[0])
        if (cancelled || !restored) continue
        setActiveWallet(wallet)
        updateAddress(restored, 'wallet')
        return
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address, open, updateAddress, wallets])

  useEffect(() => {
    if (!activeWallet) return
    return subscribeToWalletAccounts(activeWallet.provider, (accounts) => {
      const nextAddress = normalizeWalletAddress(accounts[0])
      updateAddress(nextAddress, nextAddress ? 'wallet' : null)
      if (!nextAddress) setActiveWallet(null)
    })
  }, [activeWallet, updateAddress])

  useEffect(() => {
    if (!open || !address) return
    const controller = new AbortController()
    const generation = requestGenerationRef.current
    void fetchOwnedNftsPage(address, null, controller.signal)
      .then((page) => {
        if (controller.signal.aborted || generation !== requestGenerationRef.current || addressRef.current !== address) return
        setNfts(page.nfts)
        setNextCursor(page.nextCursor)
        setLoadState('ready')
        setLiveMessage(`${page.nfts.length} artworks loaded${page.nextCursor ? '. More are available.' : '.'}`)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(error instanceof Error ? error.message : 'The collection could not be loaded.')
        setLoadState('error')
      })
    return () => controller.abort()
  }, [address, open, refreshKey])

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(deskRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => !element.hasAttribute('hidden'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => previousFocusRef.current?.focus())
    }
  }, [onClose, open])

  useEffect(() => {
    if (!open || !address) return
    revealSlot(activeSlot)
  }, [activeSlot, address, draftSlots, open, revealSlot])

  useEffect(() => () => {
    loadMoreAbortRef.current?.abort()
    previewAbortRef.current?.abort()
    if (slotScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(slotScrollFrameRef.current)
    }
  }, [])

  const connectWallet = useCallback(async (wallet: DiscoveredWallet) => {
    setConnecting(true)
    setConnectionError(null)
    try {
      const accounts = await requestWalletAccounts(wallet.provider)
      const nextAddress = normalizeWalletAddress(accounts[0])
      if (!nextAddress) throw new Error('The wallet did not provide an Ethereum address.')
      suppressRestoreRef.current = false
      restoreAttemptedRef.current = true
      setActiveWallet(wallet)
      updateAddress(nextAddress, 'wallet')
    } catch (error) {
      const message = error instanceof Error && /reject|cancel|denied/i.test(error.message)
        ? 'Connection cancelled. Nothing was signed.'
        : error instanceof Error ? error.message : 'The wallet could not connect.'
      setConnectionError(message)
    } finally {
      setConnecting(false)
    }
  }, [updateAddress])

  const submitAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = addressEntry.trim().toLowerCase()
    if (!isEthereumAddress(normalized)) {
      setAddressEntryError('Enter a complete 0x Ethereum address.')
      return
    }
    setAddressEntryError(null)
    setConnectionError(null)
    suppressRestoreRef.current = true
    setActiveWallet(null)
    updateAddress(normalized, 'address')
  }

  const disconnect = () => {
    suppressRestoreRef.current = true
    updateAddress(null, null)
    setActiveWallet(null)
    setAddressEntry('')
    setConnectionError(null)
  }

  const refreshCollection = () => {
    setLoadState('loading')
    setLoadError(null)
    setRefreshKey((value) => value + 1)
  }

  const collections = useMemo(() => (
    [...new Set(nfts.map((nft) => nft.collection))].sort((a, b) => a.localeCompare(b))
  ), [nfts])

  const displayableCount = useMemo(
    () => nfts.filter((nft) => isOwnedNftDisplayable(nft, brokenMediaKeys)).length,
    [brokenMediaKeys, nfts],
  )
  const visibleNfts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return nfts.filter((nft) => {
      if (!showAll && !isOwnedNftDisplayable(nft, brokenMediaKeys)) return false
      if (collectionFilter !== 'all' && nft.collection !== collectionFilter) return false
      if (!normalizedQuery) return true
      return `${nft.title} ${nft.collection} ${nft.identifier}`.toLowerCase().includes(normalizedQuery)
    })
  }, [brokenMediaKeys, collectionFilter, nfts, query, showAll])

  const assignNft = (nft: OwnedNft) => {
    if (!isOwnedNftDisplayable(nft, brokenMediaKeys)) return
    const existingSlot = draftSlots.findIndex((slot) => slot?.tokenKey === nft.tokenKey)
    if (existingSlot >= 0) {
      setActiveSlot(existingSlot)
      return
    }
    const nextSlots = [...draftSlots]
    nextSlots[activeSlot] = nft
    selectionRevisionRef.current += 1
    setDraftSlots(nextSlots)
    setPreviewError(null)
    setLiveMessage(`${nft.title} assigned to ${['Left', 'Feature', 'Right'][activeSlot]}.`)
    const nextEmpty = nextSlots.findIndex((slot, index) => index > activeSlot && slot === null)
    const anyEmpty = nextEmpty >= 0 ? nextEmpty : nextSlots.findIndex((slot) => slot === null)
    if (anyEmpty >= 0) setActiveSlot(anyEmpty)
  }

  const removeSlot = (index: number) => {
    const nextSlots = [...draftSlots]
    nextSlots[index] = null
    selectionRevisionRef.current += 1
    setDraftSlots(nextSlots)
    setActiveSlot(index)
    setPreviewError(null)
    setLiveMessage(`Artwork removed from ${['Left', 'Feature', 'Right'][index]}.`)
  }

  const selectedCount = draftSlots.filter(Boolean).length
  const remainingCount = 3 - selectedCount

  const previewExhibition = async () => {
    if (!address || !addressSource || selectedCount !== 3 || previewing) return
    const currentOwnedKeys = new Set(nfts.map((nft) => nft.tokenKey))
    if (draftSlots.some((nft) => !nft || !isOwnedNftDisplayable(nft, brokenMediaKeys) || !currentOwnedKeys.has(nft.tokenKey))) {
      setPreviewError('One selected work is no longer displayable for this wallet. Please choose again.')
      return
    }

    const selected = draftSlots as [OwnedNft, OwnedNft, OwnedNft]
    const selectionRevision = selectionRevisionRef.current
    const controller = new AbortController()
    previewAbortRef.current?.abort()
    previewAbortRef.current = controller
    setPreviewing(true)
    setPreviewError(null)
    setLiveMessage('Rechecking ownership before room preview.')
    try {
      const result = await verifyOwnedSelection(address, selected, controller.signal)
      if (
        controller.signal.aborted
        || addressRef.current !== address
        || selectionRevisionRef.current !== selectionRevision
      ) return
      if (!result.verified) {
        setPreviewError('One selected work is no longer owned by this wallet. Refresh and choose again.')
        setLiveMessage('Ownership changed. The room was not updated.')
        return
      }
      setLiveMessage('Ownership confirmed. Opening the room preview.')
      onPreview(selected, address, addressSource)
    } catch (error) {
      if (controller.signal.aborted) return
      setPreviewError(error instanceof Error ? error.message : 'Ownership could not be checked right now.')
      setLiveMessage('Ownership could not be checked. The room was not updated.')
    } finally {
      if (previewAbortRef.current === controller) {
        previewAbortRef.current = null
        setPreviewing(false)
      }
    }
  }

  const loadMore = async () => {
    if (!address || !nextCursor || loadingMore) return
    const requestedAddress = address
    const requestedCursor = nextCursor
    const generation = requestGenerationRef.current
    const controller = new AbortController()
    loadMoreAbortRef.current?.abort()
    loadMoreAbortRef.current = controller
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await fetchOwnedNftsPage(requestedAddress, requestedCursor, controller.signal)
      if (controller.signal.aborted || generation !== requestGenerationRef.current || addressRef.current !== requestedAddress) return
      setNfts((current) => mergeUniqueNfts(current, page.nfts))
      setNextCursor(page.nextCursor)
      setLiveMessage(`${page.nfts.length} more artworks loaded.`)
    } catch (error) {
      if (controller.signal.aborted) return
      setLoadMoreError(error instanceof Error ? error.message : 'More artwork could not be loaded.')
    } finally {
      if (loadMoreAbortRef.current === controller) {
        loadMoreAbortRef.current = null
        setLoadingMore(false)
      }
    }
  }

  const markMediaBroken = useCallback((tokenKey: string) => {
    const motionStillAvailable = nfts.some((nft) => nft.tokenKey === tokenKey && hasOwnedNftMotion(nft))
    setBrokenMediaKeys((current) => {
      if (current.has(tokenKey)) return current
      const next = new Set(current)
      next.add(tokenKey)
      return next
    })
    if (motionStillAvailable) {
      setLiveMessage('That artwork poster could not load, but its animation is still ready for the room.')
      return
    }
    selectionRevisionRef.current += 1
    setDraftSlots((current) => current.map((nft) => nft?.tokenKey === tokenKey ? null : nft))
    setLiveMessage('That artwork preview could not load, so it was removed from the room slots.')
  }, [nfts])

  if (!open) return null

  return (
    <div className={styles.backdrop} onPointerDown={(event) => {
      if (event.currentTarget === event.target) onClose()
    }}>
      <section
        ref={deskRef}
        className={styles.desk}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-desk-title"
        aria-busy={loadState === 'loading' || previewing}
      >
        <span className={styles.srStatus} aria-live="polite">{liveMessage}</span>
        <header className={styles.deskHeader}>
          <div>
            <span>Part 2 · Owned Artwork</span>
            <h2 id="collection-desk-title">Collection Desk</h2>
            <p>{address ? `${shortenAddress(address)} · Ethereum` : 'Choose three works for the Opening Salon'}</p>
          </div>
          <button ref={closeButtonRef} type="button" className={styles.closeButton} onClick={onClose} aria-label="Close collection desk">×</button>
        </header>

        {!address ? (
          <div className={styles.connectState}>
            <div className={styles.connectSeal} aria-hidden="true">✦</div>
            <div className={styles.connectIntro}>
              <span>Read-only connection</span>
              <h3>Open your art collection</h3>
              <p>We ask for your public wallet address, then OpenSea shows only NFTs currently owned by that address. No signature. No transaction. No funny business.</p>
            </div>

            {wallets.length ? (
              <div className={styles.walletChoices}>
                {wallets.map((wallet) => (
                  <button key={wallet.id} type="button" onClick={() => void connectWallet(wallet)} disabled={connecting}>
                    <span className={styles.walletIcon} aria-hidden="true">◆</span>
                    <span>
                      <strong>{connecting ? 'Opening wallet…' : `Connect ${wallet.name}`}</strong>
                      <small>Address permission only</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.noWalletNote}>
                <strong>No browser wallet found</strong>
                <span>You can still view an Ethereum address below.</span>
              </div>
            )}

            {connectionError ? <p className={styles.inlineError} role="alert">{connectionError}</p> : null}

            <form className={styles.addressForm} onSubmit={submitAddress}>
              <label htmlFor="collection-wallet-address">Or view a wallet address</label>
              <div>
                <input
                  id="collection-wallet-address"
                  value={addressEntry}
                  onChange={(event) => setAddressEntry(event.target.value)}
                  placeholder="0x…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit">View art</button>
              </div>
              {addressEntryError ? <p className={styles.inlineError} role="alert">{addressEntryError}</p> : null}
              <small>Viewing an address does not prove it belongs to you. Saving a public gallery comes in Part 3.</small>
            </form>
          </div>
        ) : (
          <>
            <div className={styles.connectedBar}>
              <span className={styles.connectedDot} aria-hidden="true" />
              <span>
                <strong>{addressSource === 'wallet' ? activeWallet?.name ?? 'Wallet connected' : 'Viewing wallet'}</strong>
                <small>{shortenAddress(address)}</small>
              </span>
              <button type="button" onClick={disconnect}>Change</button>
            </div>

            <div ref={slotTrayRef} className={styles.slotTray} aria-label="Formal Room artwork slots">
              {draftSlots.map((nft, index) => (
                <SlotCard
                  key={index}
                  index={index}
                  nft={nft}
                  active={activeSlot === index}
                  slotRef={(node) => {
                    slotRefs.current[index] = node
                  }}
                  onActivate={() => setActiveSlot(index)}
                  onRemove={() => removeSlot(index)}
                />
              ))}
            </div>

            {loadState === 'loading' ? (
              <div className={styles.loadingState} role="status" aria-live="polite" aria-label="Loading owned artwork">
                <div className={styles.loadingCopy}>
                  <strong>Checking the vault</strong>
                  <span>Asking OpenSea what this wallet owns…</span>
                </div>
                <div className={styles.skeletonGrid} aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
                </div>
              </div>
            ) : null}

            {loadState === 'error' ? (
              <div className={styles.emptyState} role="alert">
                <span aria-hidden="true">!</span>
                <h3>The vault door stuck</h3>
                <p>{loadError}</p>
                <div>
                  <button type="button" onClick={refreshCollection}>Try again</button>
                  <button type="button" onClick={disconnect}>Change wallet</button>
                </div>
              </div>
            ) : null}

            {loadState === 'ready' ? (
              <div className={styles.library}>
                <div className={styles.libraryHeading}>
                  <span>
                    <strong>{nextCursor ? `${nfts.length} loaded` : `${nfts.length} owned`}</strong>
                    <small>{displayableCount} ready to display{nextCursor ? ' · more available' : ''}</small>
                  </span>
                  <label className={styles.allToggle}>
                    <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
                    Show unavailable
                  </label>
                </div>

                <div className={styles.filters}>
                  <label>
                    <span>Search loaded artwork</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search art…" type="search" />
                  </label>
                  <label>
                    <span>Collection</span>
                    <select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)}>
                      <option value="all">All collections</option>
                      {collections.map((collection) => <option key={collection} value={collection}>{collection}</option>)}
                    </select>
                  </label>
                </div>

                {visibleNfts.length ? (
                  <div className={styles.nftGrid}>
                    {visibleNfts.map((nft, visibleIndex) => {
                      const selectedIndex = draftSlots.findIndex((slot) => slot?.tokenKey === nft.tokenKey)
                      const thumbnailUrl = nft.thumbnailUrl ?? nft.imageUrl
                      const animated = hasOwnedNftMotion(nft)
                      const unavailable = !isOwnedNftDisplayable(nft, brokenMediaKeys)
                      return (
                        <button
                          key={nft.tokenKey}
                          type="button"
                          className={`${styles.nftCard} ${selectedIndex >= 0 ? styles.nftCardSelected : ''}`}
                          onClick={() => assignNft(nft)}
                          disabled={unavailable}
                          aria-pressed={selectedIndex >= 0}
                          aria-label={`${nft.title} by ${nft.collection}${animated ? ', animated artwork' : ''}${selectedIndex >= 0 ? `, selected in slot ${selectedIndex + 1}` : ''}`}
                        >
                          <span className={styles.thumbnail}>
                            <NftThumbnail
                              key={thumbnailUrl ?? 'missing'}
                              nft={nft}
                              eager={visibleIndex < 3}
                              onBroken={markMediaBroken}
                            />
                            {animated ? <span className={styles.motionBadge} aria-hidden="true">▶ Animated</span> : null}
                            {selectedIndex >= 0 ? <span className={styles.selectionSeal}>0{selectedIndex + 1}</span> : null}
                          </span>
                          <span className={styles.nftCopy}>
                            <strong>{nft.title}</strong>
                            <small>{nft.collection}</small>
                            <em>{unavailable ? 'Preview unavailable' : selectedIndex >= 0 ? `In slot 0${selectedIndex + 1}` : animated ? 'Moves in the room' : `Token #${nft.identifier}`}</em>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.noResults}>
                    <strong>{nfts.length ? 'No artwork matches those filters.' : 'No displayable artwork found.'}</strong>
                    <span>{nfts.length
                      ? nextCursor
                        ? 'No match in the loaded artwork yet. Load more to continue searching.'
                        : 'Try a broader search or another collection.'
                      : 'OpenSea may not have indexed displayable image or motion NFTs for this wallet.'}</span>
                  </div>
                )}

                {loadMoreError ? <p className={styles.inlineError} role="alert">{loadMoreError}</p> : null}
                {nextCursor ? (
                  <button type="button" className={styles.loadMoreButton} onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? 'Opening the next drawer…' : 'Load more artwork'}
                  </button>
                ) : null}
              </div>
            ) : null}

            <footer className={styles.deskFooter}>
              <span>
                <strong>{selectedCount}/3 selected</strong>
                <small>{previewError ?? 'Preview only · nothing saved'}</small>
              </span>
              <button
                type="button"
                onClick={() => void previewExhibition()}
                disabled={selectedCount !== 3 || loadState !== 'ready' || previewing}
              >
                {previewing ? 'Checking ownership…' : remainingCount > 0 ? `Choose ${remainingCount} more` : 'Preview in room'}
              </button>
            </footer>
          </>
        )}

        <a className={styles.attribution} href="https://opensea.io" target="_blank" rel="noreferrer">Collection data by OpenSea ↗</a>
      </section>
    </div>
  )
}
