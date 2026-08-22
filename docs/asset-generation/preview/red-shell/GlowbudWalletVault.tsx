/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react'
import type { GlowbudWalletOption } from './glowbudsWalletClient'
import type { GlowbudWalletOwnershipSource } from './glowbudsWalletOwnership'

export type GlowbudWalletVaultStatus = 'idle' | 'connecting' | 'loading' | 'ready' | 'error'

export type OwnedGlowbudPreview = {
  tokenId: number
  imageUrls: string[]
  lookLine: string
  traitCount: number
}

type GlowbudWalletVaultProps = {
  address: string | null
  connectionLabel: string | null
  error: string
  open: boolean
  ownershipSource: GlowbudWalletOwnershipSource | null
  ownedGlowbuds: OwnedGlowbudPreview[]
  providers: GlowbudWalletOption[]
  selectedTokenId: number
  status: GlowbudWalletVaultStatus
  onClose: () => void
  onConnect: (provider: GlowbudWalletOption) => void
  onDisconnect: () => void
  onRefresh: () => void
  onSelectToken: (tokenId: number) => void
  onViewAddress: (address: string) => void
}

function compactWallet(address: string) {
  return `${address.slice(0, 7)}...${address.slice(-5)}`
}

function WalletGlowbudImage({ preview }: { preview: OwnedGlowbudPreview }) {
  const [gatewayIndex, setGatewayIndex] = useState(0)

  const imageUrl = preview.imageUrls[gatewayIndex]
  return imageUrl ? (
    <img
      src={imageUrl}
      alt={`Pixel artwork for Glowbud #${preview.tokenId}`}
      loading="lazy"
      onError={() => setGatewayIndex((current) => Math.min(current + 1, preview.imageUrls.length))}
    />
  ) : (
    <span aria-hidden="true">#{preview.tokenId}</span>
  )
}

export function GlowbudWalletVault({
  address,
  connectionLabel,
  error,
  open,
  ownershipSource,
  ownedGlowbuds,
  providers,
  selectedTokenId,
  status,
  onClose,
  onConnect,
  onDisconnect,
  onRefresh,
  onSelectToken,
  onViewAddress,
}: GlowbudWalletVaultProps) {
  const [addressDraft, setAddressDraft] = useState('')
  const [filter, setFilter] = useState('')

  const visibleGlowbuds = useMemo(() => {
    const query = filter.trim().replace(/^#/, '')
    if (!query) return ownedGlowbuds
    return ownedGlowbuds.filter(({ tokenId }) => String(tokenId).includes(query))
  }, [filter, ownedGlowbuds])

  if (!open) return null

  const isBusy = status === 'connecting' || status === 'loading'
  const isConnected = Boolean(address)

  return (
    <aside className={`wallet-vault is-${status}`} aria-label="My Glowbuds wallet collection">
      <header className="wallet-vault-heading">
        <div>
          <span>{isConnected ? 'Your onchain garden' : 'Connect and collect'}</span>
          <strong>My Glowbuds</strong>
        </div>
        <button
          type="button"
          className="panel-close"
          aria-label="Close My Glowbuds"
          title="Close"
          onClick={onClose}
        >
          X
        </button>
      </header>

      {!isConnected ? (
        <div className="wallet-connect-view">
          <div className="wallet-connect-hero">
            <span className="wallet-orbit-mark" aria-hidden="true">
              <i />
              <b>3D</b>
            </span>
            <div>
              <strong>Bring your bunch into the room</strong>
              <p>Connect once, then pick any Glowbud you own to meet its 3D version.</p>
            </div>
          </div>

          <div className="wallet-safety-note">
            <span aria-hidden="true">✓</span>
            <p><strong>Read-only connection.</strong> No signing, transactions, spending, or network switching.</p>
          </div>

          <div className="wallet-provider-list" aria-label="Detected wallets">
            <span>Choose a wallet</span>
            {providers.length > 0 ? providers.map((provider) => (
              <button
                type="button"
                key={provider.id}
                disabled={isBusy}
                onClick={() => onConnect(provider)}
              >
                <span className="wallet-provider-icon" aria-hidden="true">
                  {provider.icon ? <img src={provider.icon} alt="" /> : provider.name.slice(0, 1)}
                </span>
                <span>
                  <strong>{provider.name}</strong>
                  <small>Connect to view your Glowbuds</small>
                </span>
                <b aria-hidden="true">→</b>
              </button>
            )) : (
              <div className="wallet-no-provider">
                <strong>No wallet extension found</strong>
                <span>You can still preview any public wallet below.</span>
              </div>
            )}
          </div>

          <form className="wallet-address-form" onSubmit={(event) => {
            event.preventDefault()
            onViewAddress(addressDraft)
          }}>
            <label htmlFor="wallet-address">Or view a public wallet</label>
            <span>
              <input
                id="wallet-address"
                value={addressDraft}
                onChange={(event) => setAddressDraft(event.target.value.slice(0, 42))}
                placeholder="0x..."
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" disabled={isBusy}>View</button>
            </span>
          </form>

          {status === 'connecting' ? (
            <div className="wallet-inline-status" role="status">
              <span className="wallet-loader" aria-hidden="true" />
              Open your wallet to connect
            </div>
          ) : null}
          {error ? <div className="wallet-error" role="alert">{error}</div> : null}
        </div>
      ) : (
        <div className="wallet-collection-view">
          <div className="wallet-account-strip">
            <span className="wallet-account-avatar" aria-hidden="true">G</span>
            <div>
              <small>{connectionLabel ?? 'Public wallet'}</small>
              <strong>{compactWallet(address!)}</strong>
            </div>
            <button type="button" onClick={onDisconnect}>Disconnect</button>
          </div>

          {status === 'loading' ? (
            <div className="wallet-loading-stage" role="status">
              <div className="wallet-scan-portal" aria-hidden="true">
                <i />
                <i />
                <i />
                <b>G</b>
              </div>
              <strong>Finding your Glowbuds</strong>
              <span>Reading ownership on Abstract...</span>
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="wallet-empty-state is-error">
              <span aria-hidden="true">!</span>
              <strong>The garden gate got stuck</strong>
              <p>{error || 'Ownership could not be checked right now.'}</p>
              <button type="button" onClick={onRefresh}>Try again</button>
            </div>
          ) : null}

          {status === 'ready' ? (
            <>
              <div className="wallet-collection-summary">
                <div>
                  <span>{ownedGlowbuds.length}</span>
                  <strong>{ownedGlowbuds.length === 1 ? 'Glowbud' : 'Glowbuds'}</strong>
                </div>
                <p>
                  {ownershipSource === 'abstract-rpc' ? 'Verified on Abstract' : 'Verified through OpenSea'}
                  <button type="button" onClick={onRefresh} aria-label="Refresh wallet collection" title="Refresh">↻</button>
                </p>
              </div>

              {ownedGlowbuds.length > 0 ? (
                <>
                  <label className="wallet-token-filter">
                    <span>Find one</span>
                    <input
                      value={filter}
                      onChange={(event) => setFilter(event.target.value.replace(/[^0-9#]/g, '').slice(0, 5))}
                      placeholder="Token #"
                      inputMode="numeric"
                    />
                  </label>
                  <div className="wallet-glowbud-grid">
                    {visibleGlowbuds.map((preview) => (
                      <button
                        type="button"
                        className="wallet-glowbud-card"
                        key={preview.tokenId}
                        aria-pressed={selectedTokenId === preview.tokenId}
                        onClick={() => onSelectToken(preview.tokenId)}
                      >
                        <span className="wallet-glowbud-image">
                          <WalletGlowbudImage preview={preview} />
                        </span>
                        <span className="wallet-glowbud-copy">
                          <small>{selectedTokenId === preview.tokenId ? 'Now in 3D' : 'Glowbud'}</small>
                          <strong>#{preview.tokenId}</strong>
                          <span>{preview.lookLine || `${preview.traitCount} traits`}</span>
                        </span>
                        <b aria-hidden="true">{selectedTokenId === preview.tokenId ? '✓' : '→'}</b>
                      </button>
                    ))}
                  </div>
                  {visibleGlowbuds.length === 0 ? (
                    <div className="wallet-filter-empty">No Glowbud matches that number.</div>
                  ) : null}
                </>
              ) : (
                <div className="wallet-empty-state">
                  <span aria-hidden="true">0</span>
                  <strong>No Glowbuds found here yet</strong>
                  <p>This wallet is connected correctly, but it does not currently hold a Glowbud.</p>
                  <a href="https://opensea.io/collection/glowbuds" target="_blank" rel="noreferrer">Visit the collection</a>
                </div>
              )}
            </>
          ) : null}

          <footer className="wallet-vault-footer">
            <span>Ownership only. Your wallet stays in charge.</span>
            <a href={`https://opensea.io/${address}`} target="_blank" rel="noreferrer">OpenSea profile</a>
          </footer>
        </div>
      )}
    </aside>
  )
}
