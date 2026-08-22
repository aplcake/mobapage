export type WalletAddress = `0x${string}`

export type Eip1193Request = {
  method: string
  params?: readonly unknown[] | Record<string, unknown>
}

export type WalletAccountsEventListener = (accounts: unknown) => void

export type Eip1193Provider = {
  request: (request: Eip1193Request) => Promise<unknown>
  on?: (event: 'accountsChanged', listener: WalletAccountsEventListener) => void
  removeListener?: (event: 'accountsChanged', listener: WalletAccountsEventListener) => void
  off?: (event: 'accountsChanged', listener: WalletAccountsEventListener) => void
}

export type DiscoveredWallet = {
  id: string
  name: string
  icon: string | null
  rdns: string | null
  provider: Eip1193Provider
  source: 'eip6963' | 'injected'
}

export type WalletDiscoveryTarget = {
  ethereum?: Eip1193Provider
  addEventListener: (type: string, listener: EventListener) => void
  removeEventListener: (type: string, listener: EventListener) => void
  dispatchEvent: (event: Event) => boolean
}

export type DiscoverEvmWalletsOptions = {
  target?: WalletDiscoveryTarget | null
  announceWindowMs?: number
  wait?: (milliseconds: number) => Promise<void>
}

type Eip6963ProviderDetail = {
  info?: unknown
  provider?: unknown
}

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
const DEFAULT_ANNOUNCE_WINDOW_MS = 60
const MAX_ANNOUNCE_WINDOW_MS = 1_000

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : null
}

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const text = value.trim()
  return text ? text.slice(0, 160) : fallback
}

function cleanOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, 255) : null
}

function cleanWalletIcon(value: unknown) {
  if (typeof value !== 'string' || value.length > 100_000) return null
  return /^(data:image\/|https:\/\/)/i.test(value) ? value : null
}

function isEip1193Provider(value: unknown): value is Eip1193Provider {
  const provider = asRecord(value)
  return typeof provider?.request === 'function'
}

function browserDiscoveryTarget(): WalletDiscoveryTarget | null {
  if (typeof window === 'undefined') return null
  return window as unknown as WalletDiscoveryTarget
}

function defaultWait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function normalizedAnnounceWindow(value: number | undefined) {
  if (value === undefined) return DEFAULT_ANNOUNCE_WINDOW_MS
  if (!Number.isFinite(value)) return DEFAULT_ANNOUNCE_WINDOW_MS
  return Math.min(MAX_ANNOUNCE_WINDOW_MS, Math.max(0, value))
}

function walletFromAnnouncement(event: Event, fallbackIndex: number): DiscoveredWallet | null {
  const detail = (event as Event & { detail?: Eip6963ProviderDetail }).detail
  if (!detail || !isEip1193Provider(detail.provider)) return null

  const info = asRecord(detail.info)
  return {
    id: cleanText(info?.uuid, `eip6963-${fallbackIndex}`),
    name: cleanText(info?.name, 'Browser wallet'),
    icon: cleanWalletIcon(info?.icon),
    rdns: cleanOptionalText(info?.rdns),
    provider: detail.provider,
    source: 'eip6963',
  }
}

function makeWalletIdsUnique(wallets: DiscoveredWallet[]) {
  const usedIds = new Set<string>()
  return wallets.map((wallet) => {
    const baseId = wallet.id
    let id = baseId
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`
      suffix += 1
    }
    usedIds.add(id)
    return id === wallet.id ? wallet : { ...wallet, id }
  })
}

export function normalizeWalletAddress(value: unknown): WalletAddress | null {
  if (typeof value !== 'string') return null
  const address = value.trim()
  return WALLET_ADDRESS_PATTERN.test(address)
    ? address.toLowerCase() as WalletAddress
    : null
}

export function normalizeWalletAccounts(value: unknown): WalletAddress[] {
  if (!Array.isArray(value)) return []

  const accounts: WalletAddress[] = []
  const seen = new Set<WalletAddress>()
  for (const candidate of value) {
    const address = normalizeWalletAddress(candidate)
    if (!address || seen.has(address)) continue
    seen.add(address)
    accounts.push(address)
  }
  return accounts
}

export async function discoverEvmWallets(
  options: DiscoverEvmWalletsOptions = {},
): Promise<DiscoveredWallet[]> {
  const target = options.target === undefined ? browserDiscoveryTarget() : options.target
  if (!target) return []

  const walletsByProvider = new Map<Eip1193Provider, DiscoveredWallet>()
  const handleAnnouncement: EventListener = (event) => {
    const wallet = walletFromAnnouncement(event, walletsByProvider.size + 1)
    if (wallet) walletsByProvider.set(wallet.provider, wallet)
  }

  target.addEventListener('eip6963:announceProvider', handleAnnouncement)
  try {
    target.dispatchEvent(new Event('eip6963:requestProvider'))
    const wait = options.wait ?? defaultWait
    await wait(normalizedAnnounceWindow(options.announceWindowMs))
  } finally {
    target.removeEventListener('eip6963:announceProvider', handleAnnouncement)
  }

  if (target.ethereum && !walletsByProvider.has(target.ethereum)) {
    walletsByProvider.set(target.ethereum, {
      id: 'injected-wallet',
      name: 'Browser wallet',
      icon: null,
      rdns: null,
      provider: target.ethereum,
      source: 'injected',
    })
  }

  return makeWalletIdsUnique([...walletsByProvider.values()])
}

export async function requestWalletAccounts(provider: Eip1193Provider) {
  return normalizeWalletAccounts(await provider.request({ method: 'eth_requestAccounts' }))
}

export async function readWalletAccounts(provider: Eip1193Provider) {
  return normalizeWalletAccounts(await provider.request({ method: 'eth_accounts' }))
}

export function subscribeToWalletAccounts(
  provider: Eip1193Provider,
  onAccounts: (accounts: WalletAddress[]) => void,
) {
  if (!provider.on) return () => undefined

  const handleAccountsChanged: WalletAccountsEventListener = (accounts) => {
    onAccounts(normalizeWalletAccounts(accounts))
  }
  provider.on('accountsChanged', handleAccountsChanged)

  let subscribed = true
  return () => {
    if (!subscribed) return
    subscribed = false
    if (provider.removeListener) {
      provider.removeListener('accountsChanged', handleAccountsChanged)
    } else {
      provider.off?.('accountsChanged', handleAccountsChanged)
    }
  }
}
