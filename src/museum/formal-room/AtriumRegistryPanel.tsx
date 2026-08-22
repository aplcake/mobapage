'use client'

/* eslint-disable @next/next/no-img-element -- remote NFT media uses the museum's validated proxy. */

import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  MAX_ATRIUM_ARTWORKS,
  MAX_ATRIUM_GLOWBUDS,
  museumAssetKey,
  type AppliedAtriumInstallation,
  type MuseumAssetSummary,
  type MuseumOwnedAssetsResponse,
  type MuseumVerificationResult,
} from '../collection-registry/museumAssetTypes'
import {
  discoverEvmWallets,
  normalizeWalletAddress,
  requestWalletAccounts,
  subscribeToWalletAccounts,
  type DiscoveredWallet,
  type WalletAddress,
} from '../wallet/eip1193Wallet'
import { glowbudLookLine } from '../glowbuds/glowbudDisplayTraits'
import { atriumRegistryErrorMessage } from './atriumRegistryErrors'
import { ownedNftMediaProxyUrl } from './ownedNfts'
import styles from './AtriumRegistryPanel.module.css'

type PanelView = 'quick' | 'customize'
type CustomizeTarget = 'garden' | 'walls'
type AddressSource = 'wallet' | 'public-address'

type InstallSelectionOptions = {
  address: WalletAddress
  addressSource: AddressSource
  assets: readonly MuseumAssetSummary[]
  glowbudKeys: readonly string[]
  artworkKeys: readonly string[]
  remember: boolean
  automatic?: boolean
  requestVersion?: number
}

type AtriumRegistryPanelProps = {
  open: boolean
  onClose: () => void
  onInstall: (installation: AppliedAtriumInstallation, assets: readonly MuseumAssetSummary[]) => void
  onAddressChange: (address: WalletAddress | null) => void
}

const SESSION_PREFIX = 'moba-atrium-installation-v1:'
const REMEMBER_PREFIX = 'moba-atrium-installation-v1-remember:'
const CARD_PAGE_SIZE = 12

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function selectionStorageKey(prefix: string, address: string) {
  return `${prefix}${address.toLowerCase()}`
}

function readStoredInstallation(address: WalletAddress) {
  for (const prefix of [SESSION_PREFIX, REMEMBER_PREFIX]) {
    try {
      const raw = prefix === SESSION_PREFIX
        ? window.sessionStorage.getItem(selectionStorageKey(prefix, address))
        : window.localStorage.getItem(selectionStorageKey(prefix, address))
      if (!raw) continue
      const parsed = JSON.parse(raw) as AppliedAtriumInstallation
      if (parsed?.version === 1 && parsed.address === address && parsed.layoutVersion === 1) return parsed
    } catch {
      // A stale local preference is never a reason to block the museum.
    }
  }
  return null
}

function persistInstallation(installation: AppliedAtriumInstallation, remember: boolean) {
  const serialized = JSON.stringify(installation)
  window.sessionStorage.setItem(selectionStorageKey(SESSION_PREFIX, installation.address), serialized)
  const localKey = selectionStorageKey(REMEMBER_PREFIX, installation.address)
  if (remember) window.localStorage.setItem(localKey, serialized)
  else window.localStorage.removeItem(localKey)
}

function AtriumDiorama({ residents, artworks, loading = false, onMediaError }: {
  residents: readonly MuseumAssetSummary[]
  artworks: readonly MuseumAssetSummary[]
  loading?: boolean
  onMediaError?: (assetKey: string) => void
}) {
  const wallWorks = artworks.slice(0, 6)
  const gardenResidents = residents.slice(0, 7)
  return (
    <div className={`${styles.diorama} ${loading ? styles.dioramaLoading : ''}`} aria-label={loading ? 'Preparing atrium preview' : 'Preview of your personal atrium'}>
      <span className={styles.sunbeam} aria-hidden="true" />
      <span className={styles.dioramaRoof} aria-hidden="true" />
      <span className={`${styles.dioramaWall} ${styles.wallLeft}`} aria-hidden="true">
        {wallWorks.filter((_, index) => index % 2 === 0).map((asset) => (
          <i key={asset.key}>{asset.imageUrl ? <img src={ownedNftMediaProxyUrl(asset.imageUrl, 'thumb')} alt="" onError={() => onMediaError?.(asset.key)} /> : null}</i>
        ))}
      </span>
      <span className={`${styles.dioramaWall} ${styles.wallRight}`} aria-hidden="true">
        {wallWorks.filter((_, index) => index % 2 === 1).map((asset) => (
          <i key={asset.key}>{asset.imageUrl ? <img src={ownedNftMediaProxyUrl(asset.imageUrl, 'thumb')} alt="" onError={() => onMediaError?.(asset.key)} /> : null}</i>
        ))}
      </span>
      <span className={styles.dioramaFloor} aria-hidden="true" />
      <span className={styles.dioramaPath} aria-hidden="true" />
      <span className={styles.gardenBed} aria-hidden="true" />
      <span className={styles.residentStage} aria-hidden="true">
        {gardenResidents.map((asset, index) => (
          <i key={asset.key} style={{ '--resident-index': index } as CSSProperties}>
            {asset.imageUrl ? <img src={ownedNftMediaProxyUrl(asset.imageUrl, 'thumb')} alt="" onError={() => onMediaError?.(asset.key)} /> : <b>✦</b>}
          </i>
        ))}
      </span>
      {!loading && !gardenResidents.length && !wallWorks.length ? <strong className={styles.defaultGarden}>Museum garden</strong> : null}
      <span className={styles.dioramaPlaque} aria-hidden="true">YOUR ATRIUM</span>
    </div>
  )
}

export function AtriumRegistryPanel({ open, onClose, onInstall, onAddressChange }: AtriumRegistryPanelProps) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [activeWallet, setActiveWallet] = useState<DiscoveredWallet | null>(null)
  const [address, setAddress] = useState<WalletAddress | null>(null)
  const [addressSource, setAddressSource] = useState<AddressSource | null>(null)
  const [addressEntry, setAddressEntry] = useState('')
  const [view, setView] = useState<PanelView>('quick')
  const [customizeTarget, setCustomizeTarget] = useState<CustomizeTarget>('garden')
  const [assets, setAssets] = useState<readonly MuseumAssetSummary[]>([])
  const [collectionErrors, setCollectionErrors] = useState<readonly string[]>([])
  const [failedMediaKeys, setFailedMediaKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [loadState, setLoadState] = useState<'idle' | 'connecting' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [visibleCardCount, setVisibleCardCount] = useState(CARD_PAGE_SIZE)
  const [selectedGlowbudKeys, setSelectedGlowbudKeys] = useState<readonly string[]>([])
  const [selectedArtworkKeys, setSelectedArtworkKeys] = useState<readonly string[]>([])
  const [remember, setRemember] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installedAddress, setInstalledAddress] = useState<WalletAddress | null>(null)
  const [liveMessage, setLiveMessage] = useState('')
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const requestRef = useRef(0)

  const changeAddress = useCallback((nextAddress: WalletAddress | null, source: AddressSource | null) => {
    requestRef.current += 1
    setAddress(nextAddress)
    setAddressSource(source)
    onAddressChange(nextAddress)
    setAssets([])
    setCollectionErrors([])
    setFailedMediaKeys(new Set())
    setSelectedGlowbudKeys([])
    setSelectedArtworkKeys([])
    setQuery('')
    setCollectionFilter('all')
    setVisibleCardCount(CARD_PAGE_SIZE)
    setError(null)
    setInstalling(false)
    setInstalledAddress(null)
    setView('quick')
    setCustomizeTarget('garden')
    setLoadState(nextAddress ? 'loading' : 'idle')
    setLiveMessage(nextAddress ? 'Reading the museum collection.' : 'Wallet cleared.')
  }, [onAddressChange])

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    let cancelled = false
    void discoverEvmWallets().then((found) => { if (!cancelled) setWallets(found) })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [href]',
      ) ?? [])
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelled = true
      window.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => previousFocusRef.current?.focus())
    }
  }, [onClose, open])

  useEffect(() => {
    if (!activeWallet) return
    return subscribeToWalletAccounts(activeWallet.provider, (accounts) => {
      const nextAddress = accounts[0] ?? null
      changeAddress(nextAddress, nextAddress ? 'wallet' : null)
      if (!nextAddress) setActiveWallet(null)
    })
  }, [activeWallet, changeAddress])

  const availableAssets = useMemo(() => assets.filter((asset) => !failedMediaKeys.has(asset.key)), [assets, failedMediaKeys])
  const residents = useMemo(() => availableAssets.filter((asset) => asset.category === 'resident'), [availableAssets])
  const artworks = useMemo(() => availableAssets.filter((asset) => asset.category === 'artwork' || asset.category === 'photography'), [availableAssets])
  const selectedResidents = selectedGlowbudKeys.flatMap((key) => availableAssets.find((asset) => asset.key === key) ?? [])
  const selectedWallArtworks = selectedArtworkKeys.flatMap((key) => availableAssets.find((asset) => asset.key === key) ?? [])
  const filters = useMemo(() => [...new Map(assets.map((asset) => [asset.collectionId, asset.collection])).entries()], [assets])
  const filteredAssets = useMemo(() => {
    const source = customizeTarget === 'garden' ? residents : artworks
    const normalizedQuery = query.trim().toLowerCase()
    return source.filter((asset) => {
      if (collectionFilter !== 'all' && asset.collectionId !== collectionFilter) return false
      return !normalizedQuery || `${asset.title} ${asset.collection} ${asset.tokenId}`.toLowerCase().includes(normalizedQuery)
    })
  }, [artworks, collectionFilter, customizeTarget, query, residents])

  const markMediaUnavailable = useCallback((assetKey: string) => {
    setFailedMediaKeys((current) => {
      if (current.has(assetKey)) return current
      return new Set([...current, assetKey])
    })
    setSelectedGlowbudKeys((current) => current.filter((key) => key !== assetKey))
    setSelectedArtworkKeys((current) => current.filter((key) => key !== assetKey))
    setLiveMessage('One unavailable preview was removed from the installation.')
  }, [])

  const connectWallet = async (wallet: DiscoveredWallet) => {
    setLoadState('connecting')
    setError(null)
    try {
      const nextAddress = (await requestWalletAccounts(wallet.provider))[0] ?? null
      if (!nextAddress) throw new Error('The wallet did not provide an address.')
      setActiveWallet(wallet)
      changeAddress(nextAddress, 'wallet')
    } catch (reason) {
      setLoadState('idle')
      setError(reason instanceof Error && /reject|denied|cancel/i.test(reason.message)
        ? 'Connection cancelled. Nothing was signed.'
        : reason instanceof Error ? reason.message : 'The wallet did not connect.')
    }
  }

  const viewPublicCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextAddress = normalizeWalletAddress(addressEntry)
    if (!nextAddress) {
      setError('Enter a complete 0x wallet address.')
      return
    }
    setActiveWallet(null)
    changeAddress(nextAddress, 'public-address')
  }

  const toggle = (asset: MuseumAssetSummary) => {
    const garden = customizeTarget === 'garden'
    const keys = garden ? selectedGlowbudKeys : selectedArtworkKeys
    const limit = garden ? MAX_ATRIUM_GLOWBUDS : MAX_ATRIUM_ARTWORKS
    const update = garden ? setSelectedGlowbudKeys : setSelectedArtworkKeys
    if (keys.includes(asset.key)) {
      update(keys.filter((key) => key !== asset.key))
      return
    }
    if (keys.length >= limit) {
      setLiveMessage(`${garden ? 'Garden' : 'Walls'} full. Remove one to make a swap.`)
      return
    }
    update([...keys, asset.key])
  }

  const installSelection = useCallback(async ({
    address: installAddress,
    addressSource: installAddressSource,
    assets: installAssets,
    glowbudKeys,
    artworkKeys,
    remember: rememberInstallation,
    automatic = false,
    requestVersion = requestRef.current,
  }: InstallSelectionOptions) => {
    const byKey = new Map(installAssets.map((asset) => [asset.key, asset]))
    const glowbuds = glowbudKeys.flatMap((key) => byKey.get(key) ?? []).map((asset) => ({
      collectionId: asset.collectionId, chainId: asset.chainId, contract: asset.contract, tokenId: asset.tokenId,
    }))
    const wallArt = artworkKeys.flatMap((key) => byKey.get(key) ?? []).map((asset) => ({
      collectionId: asset.collectionId, chainId: asset.chainId, contract: asset.contract, tokenId: asset.tokenId,
    }))
    setInstalling(true)
    setError(null)
    setLiveMessage(automatic ? 'Building your personal atrium.' : 'Updating your personal atrium.')
    try {
      const response = await fetch('/api/museum-assets/verify-selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ version: 1, address: installAddress, addressSource: installAddressSource, glowbuds, artworks: wallArt }),
        cache: 'no-store',
      })
      const payload = await response.json() as unknown
      if (requestVersion !== requestRef.current) return
      const result = payload as MuseumVerificationResult
      if (!response.ok || !result.verified || !result.installation) {
        throw new Error(atriumRegistryErrorMessage(payload, 'The atrium could not be installed.'))
      }
      const safeIdentities = [...result.installation.glowbuds, ...result.installation.artworks]
      const installedAssets = safeIdentities.flatMap((identity) => byKey.get(museumAssetKey(identity)) ?? [])
      setSelectedGlowbudKeys(result.installation.glowbuds.map(museumAssetKey))
      setSelectedArtworkKeys(result.installation.artworks.map(museumAssetKey))
      persistInstallation(result.installation, rememberInstallation)
      onInstall(result.installation, installedAssets)
      setInstalledAddress(installAddress)
      setLiveMessage(result.missing.length || result.unavailable.length
        ? 'Atrium installed. Unavailable items were safely skipped.'
        : 'Your atrium is installed.')
      onClose()
    } catch (reason) {
      if (requestVersion === requestRef.current) {
        setError(reason instanceof Error ? reason.message : 'The atrium could not be installed.')
      }
    } finally {
      if (requestVersion === requestRef.current) setInstalling(false)
    }
  }, [onClose, onInstall])

  const install = useCallback(() => {
    if (!address || !addressSource || installing) return
    return installSelection({
      address,
      addressSource,
      assets,
      glowbudKeys: selectedGlowbudKeys,
      artworkKeys: selectedArtworkKeys,
      remember,
    })
  }, [address, addressSource, assets, installSelection, installing, remember, selectedArtworkKeys, selectedGlowbudKeys])

  useEffect(() => {
    if (!open || !address || !addressSource || installedAddress === address) return
    const controller = new AbortController()
    const requestVersion = requestRef.current
    let cancelled = false

    const installDefaults = (
      displayable: readonly MuseumAssetSummary[],
      defaultGlowbudKeys: readonly string[],
      defaultArtworkKeys: readonly string[],
    ) => {
      if (cancelled || requestVersion !== requestRef.current) return
      if (!defaultGlowbudKeys.length && !defaultArtworkKeys.length) {
        setLiveMessage('Wallet connected. No compatible atrium pieces were found.')
        return
      }
      void installSelection({
        address,
        addressSource,
        assets: displayable,
        glowbudKeys: defaultGlowbudKeys,
        artworkKeys: defaultArtworkKeys,
        remember: false,
        automatic: true,
        requestVersion,
      })
    }

    void fetch(`/api/museum-assets/owned?address=${encodeURIComponent(address)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }).then(async (response) => {
      const payload = await response.json() as unknown
      if (!response.ok) throw new Error(atriumRegistryErrorMessage(payload, 'The collection could not be read.'))
      return payload as MuseumOwnedAssetsResponse
    }).then((body) => {
      if (controller.signal.aborted || cancelled || requestVersion !== requestRef.current) return
      const displayable = body.assets.filter((asset) => Boolean(asset.imageUrl))
      const residents = displayable.filter((asset) => asset.category === 'resident')
      const artworks = displayable.filter((asset) => asset.category === 'artwork' || asset.category === 'photography')
      const defaultGlowbudKeys = residents.slice(0, MAX_ATRIUM_GLOWBUDS).map((asset) => asset.key)
      const defaultArtworkKeys = artworks.slice(0, MAX_ATRIUM_ARTWORKS).map((asset) => asset.key)
      setAssets(displayable)
      setFailedMediaKeys(new Set())
      setCollectionErrors(body.collectionErrors.map((issue) => issue.message))
      setSelectedGlowbudKeys(defaultGlowbudKeys)
      setSelectedArtworkKeys(defaultArtworkKeys)
      setLoadState('ready')
      setLiveMessage('Your compatible museum pieces have been found.')

      const stored = readStoredInstallation(address)
      if (!stored) {
        installDefaults(displayable, defaultGlowbudKeys, defaultArtworkKeys)
        return
      }

      setLiveMessage('Restoring your saved atrium.')
      void verifyStoredInstallation(stored).then((result) => {
        if (cancelled || requestVersion !== requestRef.current) return
        if (!result.verified || !result.installation) {
          installDefaults(displayable, defaultGlowbudKeys, defaultArtworkKeys)
          return
        }
        const byKey = new Map(displayable.map((asset) => [asset.key, asset]))
        const selected = [...result.installation.glowbuds, ...result.installation.artworks]
          .flatMap((identity) => byKey.get(museumAssetKey(identity)) ?? [])
        onInstall(result.installation, selected)
        setSelectedGlowbudKeys(result.installation.glowbuds.map(museumAssetKey).filter((key) => byKey.has(key)))
        setSelectedArtworkKeys(result.installation.artworks.map(museumAssetKey).filter((key) => byKey.has(key)))
        setInstalledAddress(address)
        setLiveMessage('Your saved atrium is ready.')
        onClose()
      }).catch(() => installDefaults(displayable, defaultGlowbudKeys, defaultArtworkKeys))
    }).catch((reason: unknown) => {
      if (controller.signal.aborted || cancelled || requestVersion !== requestRef.current) return
      setLoadState('error')
      setError(reason instanceof Error ? reason.message : 'The collection could not be read.')
      setLiveMessage('The collection could not be loaded. The museum atrium is unchanged.')
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [address, addressSource, installSelection, installedAddress, onClose, onInstall, open])

  if (!open) return null

  const selectedKeys = customizeTarget === 'garden' ? selectedGlowbudKeys : selectedArtworkKeys
  const capacity = customizeTarget === 'garden' ? MAX_ATRIUM_GLOWBUDS : MAX_ATRIUM_ARTWORKS
  const renderedCards = filteredAssets.slice(0, visibleCardCount)
  const readyCount = selectedGlowbudKeys.length + selectedArtworkKeys.length
  const preparingAtrium = loadState === 'loading' || installing
  const atriumIsLive = installedAddress === address

  return (
    <div className={styles.backdrop} onPointerDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="atrium-registry-title" aria-busy={preparingAtrium}>
        <span className={styles.live} aria-live="polite">{liveMessage}</span>
        <header className={styles.header}>
          <div className={styles.crest} aria-hidden="true"><span>✦</span></div>
          <div className={styles.titleBlock}>
            <span className={styles.kicker}>Central Atrium</span>
            <h2 id="atrium-registry-title">{address ? 'My Atrium' : 'Connect Wallet'}</h2>
          </div>
          <span className={styles.safety}>Read only</span>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close wallet and atrium">×</button>
        </header>

        {!address ? (
          <div className={styles.connect}>
            <AtriumDiorama residents={[]} artworks={[]} />
            <div className={styles.connectAction}>
              <span className={styles.connectEyebrow}>Personal museum garden</span>
              <h3>Connect once. We build the atrium.</h3>
              <p>Your Glowbuds arrive in the garden and your museum art finds the walls.</p>
              <div className={styles.walletButtons}>
                {wallets.length ? wallets.map((wallet, index) => (
                  <button key={wallet.id} type="button" className={index === 0 ? styles.primaryChoice : styles.secondaryWallet} onClick={() => void connectWallet(wallet)} disabled={loadState === 'connecting'}>
                    {loadState === 'connecting' ? 'Opening wallet…' : `Connect ${wallet.name}`} <span aria-hidden="true">→</span>
                  </button>
                )) : <p className={styles.muted}>No browser wallet found.</p>}
              </div>
              <span className={styles.safeLine}><b aria-hidden="true">✓</b> No signature · no transaction</span>
              <details className={styles.publicAccess}>
                <summary>Use a public address</summary>
                <form onSubmit={viewPublicCollection}>
                  <label htmlFor="atrium-public-address" className={styles.srOnly}>Public wallet address</label>
                  <input id="atrium-public-address" value={addressEntry} onChange={(event) => setAddressEntry(event.target.value)} placeholder="0x…" autoComplete="off" spellCheck={false} />
                  <button type="submit">View</button>
                </form>
              </details>
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.connected}>
              <span className={styles.statusDot} aria-hidden="true" />
              <strong>{addressSource === 'wallet' ? 'Connected' : 'Public view'}</strong>
              <small>{shortenAddress(address)}</small>
              <button type="button" onClick={() => { setActiveWallet(null); changeAddress(null, null) }}>Change</button>
            </div>

            {preparingAtrium ? (
              <div className={styles.quickView}>
                <AtriumDiorama residents={[]} artworks={[]} loading />
                <div className={styles.loading} role="status"><span className={styles.loadingSeed} aria-hidden="true">✦</span><strong>Building your atrium…</strong><small>Finding Glowbuds and museum art</small></div>
              </div>
            ) : null}
            {loadState === 'error' ? <div className={styles.error} role="alert"><strong>Couldn’t read this wallet</strong><p>{error}</p><button type="button" onClick={() => changeAddress(address, addressSource)}>Try again</button></div> : null}

            {loadState === 'ready' && !preparingAtrium && view === 'quick' ? (
              <div className={styles.quickView}>
                <div className={styles.previewShell}>
                  <AtriumDiorama residents={selectedResidents} artworks={selectedWallArtworks} onMediaError={markMediaUnavailable} />
                  <div className={styles.previewBadge}><span>Ready</span><strong>{readyCount || 'Museum'} pieces</strong></div>
                </div>
                <div className={styles.quickControls}>
                  <div className={styles.readyTitle}>
                    <span>{atriumIsLive ? 'Now in the museum' : readyCount ? 'Ready for another try' : 'Wallet connected'}</span>
                    <h3>{atriumIsLive ? 'Your atrium is alive.' : readyCount ? 'Your collection is ready.' : 'No compatible pieces found.'}</h3>
                    <div className={styles.counts}><b>{selectedGlowbudKeys.length}<small> Glowbuds</small></b><b>{selectedArtworkKeys.length}<small> artworks</small></b></div>
                  </div>
                  {collectionErrors.length ? <span className={styles.partial}><b aria-hidden="true">✓</b> Available collections included</span> : null}
                  {error ? <p className={styles.error} role="alert">{error}</p> : null}
                  <button type="button" className={styles.install} onClick={atriumIsLive || !readyCount ? onClose : () => void install()} disabled={installing}>
                    {atriumIsLive || !readyCount ? 'Done' : 'Try again'} <span aria-hidden="true">{atriumIsLive ? '✓' : '✦'}</span>
                  </button>
                  {readyCount ? <button type="button" className={styles.customizeButton} onClick={() => setView('customize')}>Customize collection</button> : null}
                </div>
              </div>
            ) : null}

            {loadState === 'ready' && view === 'customize' ? (
              <div className={styles.customizeView}>
                <div className={styles.customizeHead}>
                  <button type="button" className={styles.backButton} onClick={() => setView('quick')}>← Done</button>
                  <div><span>Advanced</span><h3>Customize</h3></div>
                  <button type="button" className={styles.installSmall} onClick={() => void install()} disabled={installing}>{installing ? 'Installing…' : 'Install'}</button>
                </div>
                <div className={styles.segmented} role="group" aria-label="Customize atrium area">
                  <button type="button" className={customizeTarget === 'garden' ? styles.segmentActive : ''} onClick={() => { setCustomizeTarget('garden'); setCollectionFilter('all'); setVisibleCardCount(CARD_PAGE_SIZE) }} aria-pressed={customizeTarget === 'garden'}>Garden <small>{selectedGlowbudKeys.length}/{MAX_ATRIUM_GLOWBUDS}</small></button>
                  <button type="button" className={customizeTarget === 'walls' ? styles.segmentActive : ''} onClick={() => { setCustomizeTarget('walls'); setCollectionFilter('all'); setVisibleCardCount(CARD_PAGE_SIZE) }} aria-pressed={customizeTarget === 'walls'}>Walls <small>{selectedArtworkKeys.length}/{MAX_ATRIUM_ARTWORKS}</small></button>
                </div>
                <div className={styles.toolbar}>
                  <label className={styles.search}><span className={styles.srOnly}>Search</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCardCount(CARD_PAGE_SIZE) }} type="search" placeholder="Search collection…" /></label>
                  <label><span className={styles.srOnly}>Collection</span><select value={collectionFilter} onChange={(event) => { setCollectionFilter(event.target.value); setVisibleCardCount(CARD_PAGE_SIZE) }}><option value="all">All collections</option>{filters.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
                  <button type="button" className={styles.resetButton} onClick={() => customizeTarget === 'garden'
                    ? setSelectedGlowbudKeys(residents.slice(0, MAX_ATRIUM_GLOWBUDS).map((asset) => asset.key))
                    : setSelectedArtworkKeys(artworks.slice(0, MAX_ATRIUM_ARTWORKS).map((asset) => asset.key))}>Auto</button>
                </div>
                {selectedKeys.length >= capacity ? <p className={styles.fullNotice}>Full — remove one to swap.</p> : null}
                <div className={styles.cards} aria-label={`${customizeTarget} assets`}>
                  {renderedCards.map((asset) => {
                    const selected = selectedKeys.includes(asset.key)
                    const disabled = !selected && selectedKeys.length >= capacity
                    return (
                      <button key={asset.key} type="button" className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={() => toggle(asset)} aria-pressed={selected} disabled={disabled}>
                        <span className={styles.thumbnail}>{asset.imageUrl ? <img src={ownedNftMediaProxyUrl(asset.imageUrl, 'thumb')} alt="" loading="lazy" onError={() => markMediaUnavailable(asset.key)} /> : null}</span>
                        <span className={styles.selectionSeal}>{selected ? '✓' : '+'}</span>
                        <strong>{asset.title}</strong>
                        <small>{asset.category === 'resident' ? glowbudLookLine(asset.attributes) : asset.collection}</small>
                      </button>
                    )
                  })}
                  {!filteredAssets.length ? <div className={styles.empty}><span aria-hidden="true">✦</span><strong>No available items</strong></div> : null}
                </div>
                {filteredAssets.length > renderedCards.length ? <button type="button" className={styles.showMore} onClick={() => setVisibleCardCount((count) => count + CARD_PAGE_SIZE)}>Show more</button> : null}
                <label className={styles.remember}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Remember on this device</span></label>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

async function verifyStoredInstallation(installation: AppliedAtriumInstallation) {
  const response = await fetch('/api/museum-assets/verify-selection', {
    method: 'POST', headers: { 'content-type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(installation), cache: 'no-store',
  })
  const payload = await response.json() as unknown
  if (!response.ok) {
    return {
      verified: false,
      installation: null,
      missing: [],
      unavailable: [],
      error: atriumRegistryErrorMessage(payload, 'Your saved atrium could not be rechecked.'),
    } satisfies MuseumVerificationResult
  }
  return payload as MuseumVerificationResult
}
