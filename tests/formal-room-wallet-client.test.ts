import { describe, expect, it } from 'vitest'
import {
  discoverEvmWallets,
  type Eip1193Provider,
  normalizeWalletAccounts,
  normalizeWalletAddress,
  readWalletAccounts,
  requestWalletAccounts,
  subscribeToWalletAccounts,
  type WalletDiscoveryTarget,
} from '../src/museum/wallet/eip1193Wallet'

const MIXED_CASE_ADDRESS = '0xAAbbCCDDeeFF0011223344556677889900aAbBcC'
const NORMALIZED_ADDRESS = MIXED_CASE_ADDRESS.toLowerCase()
const SECOND_ADDRESS = '0x1111111111111111111111111111111111111111'

class FakeProvider implements Eip1193Provider {
  requests: string[] = []
  accountResponse: unknown = []
  private listeners = new Set<(accounts: unknown) => void>()

  async request({ method }: { method: string }) {
    this.requests.push(method)
    return this.accountResponse
  }

  on(event: 'accountsChanged', listener: (accounts: unknown) => void) {
    if (event === 'accountsChanged') this.listeners.add(listener)
  }

  removeListener(event: 'accountsChanged', listener: (accounts: unknown) => void) {
    if (event === 'accountsChanged') this.listeners.delete(listener)
  }

  emitAccounts(accounts: unknown) {
    for (const listener of this.listeners) listener(accounts)
  }

  listenerCount() {
    return this.listeners.size
  }
}

type WalletAnnouncement = {
  info: {
    uuid: string
    name: string
    icon?: string
    rdns?: string
  }
  provider: Eip1193Provider
}

class FakeDiscoveryTarget implements WalletDiscoveryTarget {
  ethereum?: Eip1193Provider
  announcements: WalletAnnouncement[] = []
  private listeners = new Map<string, Set<EventListener>>()

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener)
  }

  dispatchEvent(event: Event) {
    if (event.type === 'eip6963:requestProvider') {
      for (const detail of this.announcements) {
        const announcement = { type: 'eip6963:announceProvider', detail } as unknown as Event
        for (const listener of this.listeners.get('eip6963:announceProvider') ?? []) {
          listener(announcement)
        }
      }
    }
    return true
  }

  listenerCount(type: string) {
    return this.listeners.get(type)?.size ?? 0
  }
}

describe('read-only EVM wallet helpers', () => {
  it('normalizes valid addresses and rejects malformed values', () => {
    expect(normalizeWalletAddress(`  ${MIXED_CASE_ADDRESS}  `)).toBe(NORMALIZED_ADDRESS)
    expect(normalizeWalletAddress('0x1234')).toBeNull()
    expect(normalizeWalletAddress(123)).toBeNull()
    expect(normalizeWalletAddress(`0x${'g'.repeat(40)}`)).toBeNull()
  })

  it('normalizes, filters, and deduplicates provider account arrays', () => {
    expect(normalizeWalletAccounts([
      MIXED_CASE_ADDRESS,
      NORMALIZED_ADDRESS,
      'not-an-address',
      SECOND_ADDRESS,
    ])).toEqual([NORMALIZED_ADDRESS, SECOND_ADDRESS])
    expect(normalizeWalletAccounts('not-an-array')).toEqual([])
  })

  it('uses only the read and connect account methods', async () => {
    const provider = new FakeProvider()
    provider.accountResponse = [MIXED_CASE_ADDRESS]

    await expect(readWalletAccounts(provider)).resolves.toEqual([NORMALIZED_ADDRESS])
    await expect(requestWalletAccounts(provider)).resolves.toEqual([NORMALIZED_ADDRESS])
    expect(provider.requests).toEqual(['eth_accounts', 'eth_requestAccounts'])
  })

  it('normalizes account changes and removes its listener during cleanup', () => {
    const provider = new FakeProvider()
    const changes: string[][] = []
    const unsubscribe = subscribeToWalletAccounts(provider, (accounts) => {
      changes.push(accounts)
    })

    expect(provider.listenerCount()).toBe(1)
    provider.emitAccounts([MIXED_CASE_ADDRESS, 'invalid'])
    expect(changes).toEqual([[NORMALIZED_ADDRESS]])

    unsubscribe()
    unsubscribe()
    expect(provider.listenerCount()).toBe(0)
    provider.emitAccounts([SECOND_ADDRESS])
    expect(changes).toEqual([[NORMALIZED_ADDRESS]])
  })

  it('discovers announced EIP-6963 wallets and deduplicates the injected provider', async () => {
    const announcedProvider = new FakeProvider()
    const secondProvider = new FakeProvider()
    const target = new FakeDiscoveryTarget()
    target.ethereum = announcedProvider
    target.announcements = [
      {
        info: {
          uuid: 'wallet-one',
          name: 'Wallet One',
          icon: 'data:image/svg+xml;base64,PHN2Zy8+',
          rdns: 'com.wallet.one',
        },
        provider: announcedProvider,
      },
      {
        info: { uuid: 'wallet-two', name: 'Wallet Two' },
        provider: secondProvider,
      },
    ]

    const wallets = await discoverEvmWallets({
      target,
      announceWindowMs: 0,
      wait: async () => undefined,
    })

    expect(wallets).toHaveLength(2)
    expect(wallets.map(({ id, name, source }) => ({ id, name, source }))).toEqual([
      { id: 'wallet-one', name: 'Wallet One', source: 'eip6963' },
      { id: 'wallet-two', name: 'Wallet Two', source: 'eip6963' },
    ])
    expect(wallets[0]?.provider).toBe(announcedProvider)
    expect(wallets[0]?.icon).toBe('data:image/svg+xml;base64,PHN2Zy8+')
    expect(target.listenerCount('eip6963:announceProvider')).toBe(0)
  })

  it('falls back to a browser-injected wallet when none announces', async () => {
    const provider = new FakeProvider()
    const target = new FakeDiscoveryTarget()
    target.ethereum = provider

    await expect(discoverEvmWallets({
      target,
      announceWindowMs: 0,
      wait: async () => undefined,
    })).resolves.toEqual([{
      id: 'injected-wallet',
      name: 'Browser wallet',
      icon: null,
      rdns: null,
      provider,
      source: 'injected',
    }])
  })

  it('returns no wallets when discovery runs without a browser target', async () => {
    await expect(discoverEvmWallets({ target: null })).resolves.toEqual([])
  })
})
