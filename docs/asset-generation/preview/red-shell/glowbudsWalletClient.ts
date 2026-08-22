export type GlowbudWalletProvider = {
  request: (request: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

export type GlowbudWalletOption = {
  id: string
  name: string
  icon: string | null
  provider: GlowbudWalletProvider
}

type Eip6963ProviderDetail = {
  info?: {
    uuid?: unknown
    name?: unknown
    icon?: unknown
  }
  provider?: GlowbudWalletProvider
}

declare global {
  interface Window {
    ethereum?: GlowbudWalletProvider
  }
}

const WALLET_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/i

export function normalizeGlowbudWalletAddress(value: unknown) {
  if (typeof value !== 'string') return null
  const address = value.trim()
  return WALLET_ADDRESS_PATTERN.test(address) ? address.toLowerCase() : null
}

function cleanProviderName(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Browser wallet'
}

function cleanProviderIcon(value: unknown) {
  return typeof value === 'string' && /^(data:|https?:)/.test(value) ? value : null
}

export function discoverGlowbudWallets(
  onChange: (providers: GlowbudWalletOption[]) => void,
) {
  const providers = new Map<string, GlowbudWalletOption>()

  const publish = () => {
    const unique = [...providers.values()].filter((candidate, index, collection) => (
      collection.findIndex((entry) => entry.provider === candidate.provider) === index
    ))
    onChange(unique)
  }

  const addProvider = (provider: GlowbudWalletOption) => {
    for (const [id, current] of providers.entries()) {
      if (current.provider === provider.provider) providers.delete(id)
    }
    providers.set(provider.id, provider)
    publish()
  }

  const handleAnnouncement = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail
    if (!detail?.provider) return
    const uuid = typeof detail.info?.uuid === 'string' && detail.info.uuid.trim()
      ? detail.info.uuid.trim()
      : `announced-${providers.size + 1}`
    addProvider({
      id: uuid,
      name: cleanProviderName(detail.info?.name),
      icon: cleanProviderIcon(detail.info?.icon),
      provider: detail.provider,
    })
  }

  window.addEventListener('eip6963:announceProvider', handleAnnouncement as EventListener)
  window.dispatchEvent(new Event('eip6963:requestProvider'))

  if (window.ethereum) {
    addProvider({
      id: 'injected-wallet',
      name: 'Browser wallet',
      icon: null,
      provider: window.ethereum,
    })
  } else {
    publish()
  }

  return () => {
    window.removeEventListener('eip6963:announceProvider', handleAnnouncement as EventListener)
  }
}

function firstWalletAddress(value: unknown) {
  if (!Array.isArray(value)) return null
  return value.map(normalizeGlowbudWalletAddress).find(Boolean) ?? null
}

export async function connectGlowbudWallet(provider: GlowbudWalletProvider) {
  return firstWalletAddress(await provider.request({ method: 'eth_requestAccounts' }))
}

export async function readConnectedGlowbudWallet(provider: GlowbudWalletProvider) {
  return firstWalletAddress(await provider.request({ method: 'eth_accounts' }))
}

export function subscribeToGlowbudWallet(
  provider: GlowbudWalletProvider,
  onAccountsChanged: (address: string | null) => void,
) {
  if (!provider.on) return () => undefined

  const handleAccountsChanged = (...args: unknown[]) => {
    onAccountsChanged(firstWalletAddress(args[0]))
  }
  provider.on('accountsChanged', handleAccountsChanged)

  return () => provider.removeListener?.('accountsChanged', handleAccountsChanged)
}
