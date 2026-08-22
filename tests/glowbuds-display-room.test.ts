import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import rawTokenIndex from '../docs/asset-generation/preview/red-shell/glowbudsTokenIndex.json'
import {
  composeGlowbudDisplayTraits,
  hasGlowbudDisplayMapping,
  type GlowbudSourceAttribute,
} from '../docs/asset-generation/preview/red-shell/glowbudsDisplayMapping'
import {
  GLOWBUD_TRAIT_OPTIONS,
  createNakedGlowbudBaseline,
  readGlowbudCustomTraits,
  writeGlowbudCustomTraits,
} from '../docs/asset-generation/preview/red-shell/glowbudsTraitCatalog'
import {
  parseOpenSeaOwnerFromHtml,
} from '../docs/asset-generation/preview/red-shell/glowbudsOpenSeaOwner'
import {
  deriveGlowbudTokenIdsFromTransferLogs,
  normalizeGlowbudOwnershipAddress,
} from '../docs/asset-generation/preview/red-shell/glowbudsWalletOwnership'

type TokenIndex = {
  source: {
    tokenRange: [number, number]
  }
  tokens: Record<string, [string, string][]>
}

const tokenIndex = rawTokenIndex as unknown as TokenIndex

function attributesFor(tokenId: number): GlowbudSourceAttribute[] {
  return tokenIndex.tokens[String(tokenId)].map(([trait_type, value]) => ({
    trait_type,
    value,
  }))
}

describe('Glowbud display room', () => {
  it('indexes every token in the collection', () => {
    expect(tokenIndex.source.tokenRange).toEqual([1, 3333])
    expect(Object.keys(tokenIndex.tokens)).toHaveLength(3333)
    expect(tokenIndex.tokens['1']).toBeDefined()
    expect(tokenIndex.tokens['3333']).toBeDefined()
  })

  it('has a 3D mapping for every observed source attribute', () => {
    const missing = new Set<string>()
    for (const attributes of Object.values(tokenIndex.tokens)) {
      for (const [trait_type, value] of attributes) {
        if (!hasGlowbudDisplayMapping({ trait_type, value })) {
          missing.add(`${trait_type}::${value}`)
        }
      }
    }
    expect([...missing]).toEqual([])
  })

  it('composes Glowbud 1677 from its exact source traits', () => {
    const composition = composeGlowbudDisplayTraits(attributesFor(1677))
    expect(composition.unmatched).toEqual([])
    expect(composition.traits).toMatchObject({
      background: 'purple',
      shell: 'moss-shell',
      skin: 'pixel-pink',
      eyes: 'mellow',
      mouth: 'huh',
    })
  })

  it('keeps same-named shell and Type traits in their own slots', () => {
    const composition = composeGlowbudDisplayTraits([
      { trait_type: 'Shell', value: 'Robot' },
      { trait_type: 'Type', value: 'Robot' },
    ])
    expect(composition.traits.shell).toBe('robot-shell')
    expect(composition.traits.skin).toBe('stone-gray')
  })

  it('composes Unibrow as an Eyes trait without leaking into other eyes', () => {
    const composition = composeGlowbudDisplayTraits([
      { trait_type: 'Eyes', value: 'Unibrow' },
    ])
    expect(composition.traits.eyes).toBe('unibrow')
    expect(composition.traits.face).toBe('soft')
    expect(composition.matches[0]).toMatchObject({
      studioCategory: 'eyes',
      studioTrait: 'Unibrow',
    })
  })

  it('keeps every wardrobe choice unique inside its trait category', () => {
    for (const [category, options] of Object.entries(GLOWBUD_TRAIT_OPTIONS)) {
      const values = options.map((option) => option.value)
      expect(new Set(values).size, category).toBe(values.length)
    }
  })

  it('includes a reusable naked baseline in the Shell wardrobe', () => {
    expect(GLOWBUD_TRAIT_OPTIONS.shell).toContainEqual({
      value: 'naked',
      label: 'Naked',
      sublabel: 'Soft shell-free Glowbud body',
    })
  })

  it('undresses into one calm neutral player baseline', () => {
    const source = composeGlowbudDisplayTraits(attributesFor(1677)).traits
    expect(createNakedGlowbudBaseline({
      ...source,
      head: 'venus-flytrap',
      held: 'fire',
      companion: 'toad',
      eyes: 'blazeitup420',
      mouth: 'surprised-o',
      nose: 'clown-nose',
      skin: 'ape',
    })).toMatchObject({
      shell: 'naked',
      head: 'none',
      held: 'none',
      companion: 'none',
      face: 'soft',
      eyes: 'open',
      mouth: 'normal-guy',
      nose: 'none',
      skin: 'ape',
    })
  })

  it('round-trips a custom player look through shareable query parameters', () => {
    const source = composeGlowbudDisplayTraits(attributesFor(1677)).traits
    const custom = {
      ...source,
      background: 'yellow' as const,
      shell: 'hoodie-shell' as const,
      head: 'lotus' as const,
      pot: 'terracotta' as const,
      companion: 'canary-birb' as const,
      held: 'fire' as const,
      eyes: 'purp' as const,
      mouth: 'huh' as const,
      nose: 'clown-nose' as const,
      skin: 'alien' as const,
    }
    const params = new URLSearchParams('mode=create')

    writeGlowbudCustomTraits(params, custom)

    expect(readGlowbudCustomTraits(`?${params.toString()}`, source)).toEqual(custom)
  })

  it('ships a dedicated player room with shareable token loading', () => {
    const html = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/display.html', import.meta.url),
      'utf8',
    )
    const source = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/display.tsx', import.meta.url),
      'utf8',
    )
    const entrySource = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/display-entry.tsx', import.meta.url),
      'utf8',
    )
    const wardrobeHtml = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/wardrobe.html', import.meta.url),
      'utf8',
    )
    const nativeRoute = readFileSync(new URL('../app/wardrobe/page.tsx', import.meta.url), 'utf8')
    const museumLobby = readFileSync(new URL('../src/home/HomePage.tsx', import.meta.url), 'utf8')
    expect(html).toContain('Glowbuds 3D Collection Room')
    expect(html).toContain('./display-entry.tsx')
    expect(wardrobeHtml).toContain('Glowbuds 3D Player Wardrobe')
    expect(wardrobeHtml).toContain('./display-entry.tsx')
    expect(entrySource).toContain('createRoot')
    expect(entrySource).toContain('<GlowbudDisplayRoom />')
    expect(source).toContain('export function GlowbudDisplayRoom()')
    expect(nativeRoute).toContain('GlowbudDisplayRoom')
    expect(museumLobby).toContain("wardrobe: '/wardrobe'")
    expect(museumLobby).toContain("'FORWARD - GLOWBUD WARDROBE'")
    expect(source).toContain("params.set('token', String(tokenId))")
    expect(source).toContain("displayMode === 'create' ? 'wardrobe.html' : 'display.html'")
    expect(source).not.toContain('className="studio-link"')
    expect(source).toContain('overhead-dressing-light')
    expect(source).toContain('AnimatedShowroomLights')
    expect(source).toContain('side-gallery-frame')
    expect(source).toContain('podium-front-emblem')
    expect(source).toContain("'wave',\n      'hop',\n      'boogie',\n      'showcase'")
    expect(source).toContain("performanceMode: automaticPerformance ? 'automatic' : 'directed'")
    expect(source).toContain("return !new URLSearchParams(window.location.search).has('animation')")
    expect(source).not.toContain('aria-label="Animation"')
    expect(source).not.toContain('chooseAnimation')
    expect(source).toContain('Original &amp; traits')
    expect(source).toContain('className="details-control"')
    expect(source).not.toContain('className="pixel-control"')
    expect(source).not.toContain('className="look-control"')
    expect(source).toContain('Exit full view')
    expect(source).toContain('navigator.share')
    expect(source).toContain('__GLOWBUD_DISPLAY_STATE__')
    expect(source).toContain('controls.target.add(appliedOffset)')
    expect(source).toContain('camera.position.add(appliedOffset)')
    expect(source).toContain('ArrowUp: { horizontal: 0, vertical: 1 }')
    expect(source).toContain('<OrbitControls')
    expect(source).toContain('enableRotate')
    expect(source).not.toContain('autoRotate=')
    expect(source).not.toContain('spin-control')
    expect(source).not.toContain('reset-control')
    expect(source).toContain('GlowbudWardrobe')
    expect(source).toContain('DramaticShowroomLights')
    expect(source).toContain('TraitChangeCeremony3D')
    expect(source).toContain('CreateWardrobeProjectors')
    expect(source).toContain('AvatarDressingRig')
    expect(source).toContain('WardrobeCameraBeat')
    expect(source).toContain('dressingPoseFor')
    expect(source).toContain('beginDressingCeremony')
    expect(source).toContain('const DIRECTED_ANIMATION_DURATIONS')
    expect(source).toContain('const [dressingPerformanceActive, setDressingPerformanceActive]')
    expect(source).toContain('DIRECTED_ANIMATION_DURATIONS[pose]')
    expect(source).toContain('revealActive || dressingPerformanceActive || reduceMotion')
    expect(source).toContain('useGlowbudDisplayAudio')
    expect(source).toContain('randomGlowbudTraits')
    expect(source).toContain("window.location.pathname.endsWith('/wardrobe.html')")
    expect(source).toContain("event.key === ' '")
    expect(source).toContain('const DISPLAY_AVATAR_SCALE = 1.08')
    expect(source).toContain('function avatarDisplayScale(head: GlowbudHeadTrait)')
    expect(source).toContain('scale={avatarDisplayScale(traits.head) * heroScale}')
    expect(source).toContain('const sceneY = -0.16')
    expect(source).toContain('Owned by')
    expect(source).toContain('/api/glowbuds-owner/${tokenId}')
    expect(source).toContain('GlowbudWalletVault')
    expect(source).toContain('discoverGlowbudWallets')
    expect(source).toContain('/api/glowbuds-wallet/${address}')
    expect(source).toContain('My Glowbuds')
    expect(source).toContain('selectOwnedGlowbud')
    expect(source).not.toContain('function displayScale')
  })

  it('derives current Glowbud ownership from canonical transfer history', () => {
    const wallet = '0x1111111111111111111111111111111111111111'
    const other = '0x2222222222222222222222222222222222222222'
    const zero = '0x0000000000000000000000000000000000000000'
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const topicAddress = (address: string) => `0x${address.slice(2).padStart(64, '0')}`
    const transfer = (tokenId: number, from: string, to: string, block: number, logIndex = 0) => ({
      blockNumber: `0x${block.toString(16)}`,
      transactionIndex: '0x0',
      logIndex: `0x${logIndex.toString(16)}`,
      transactionHash: `0x${block.toString(16).padStart(64, '0')}`,
      topics: [
        transferTopic,
        topicAddress(from),
        topicAddress(to),
        `0x${tokenId.toString(16).padStart(64, '0')}`,
      ],
    })

    const selfTransfer = transfer(21, wallet, wallet, 4)
    expect(deriveGlowbudTokenIdsFromTransferLogs([
      transfer(7, zero, wallet, 1),
      transfer(7, wallet, other, 2),
      transfer(21, other, wallet, 3),
      selfTransfer,
      selfTransfer,
      transfer(4000, zero, wallet, 5),
    ], wallet, [1, 3333])).toEqual([21])
    expect(normalizeGlowbudOwnershipAddress(wallet.toUpperCase())).toBe(wallet)
    expect(normalizeGlowbudOwnershipAddress('not-a-wallet')).toBeNull()
  })

  it('registers the read-only wallet ownership endpoint in the display server', () => {
    const config = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/vite.config.mjs', import.meta.url),
      'utf8',
    )
    const vault = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/GlowbudWalletVault.tsx', import.meta.url),
      'utf8',
    )
    expect(config).toContain('createGlowbudWalletMiddleware')
    expect(config).toContain("rpcUrl: 'https://api.mainnet.abs.xyz'")
    expect(vault).toContain('Read-only connection.')
    expect(vault).toContain('No signing, transactions, spending, or network switching.')
    expect(vault).toContain('onSelectToken(preview.tokenId)')
  })

  it('reads the current item owner from OpenSea page data without confusing the collection owner', () => {
    const contract = '0x40148d9aec2d0aed12ccf556cd7cd79c15197644'
    const payload = {
      rehydrate: {
        query: {
          data: {
            itemByIdentifier: {
              tokenId: '3239',
              contractAddress: contract,
              collection: {
                owner: {
                  address: '0xcollection',
                  displayName: 'Glowbuds creator',
                },
              },
              owner: {
                address: '0x597ee0828c4e34e8ccd006f66f9d10bc49f09c26',
                displayName: 'GardenCollector',
              },
            },
          },
        },
      },
    }
    const html = `<script>(window[Symbol.for("urql_transport")] ??= []).push(${JSON.stringify(payload)})</script>`

    expect(parseOpenSeaOwnerFromHtml(html, 3239, contract)).toEqual({
      address: '0x597ee0828c4e34e8ccd006f66f9d10bc49f09c26',
      username: 'GardenCollector',
      profileUrl: 'https://opensea.io/0x597ee0828c4e34e8ccd006f66f9d10bc49f09c26',
    })
  })

  it('shares the same trait catalog with the developer dressing room', () => {
    const studioSource = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/main.tsx', import.meta.url),
      'utf8',
    )
    const wardrobeSource = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/GlowbudWardrobe.tsx', import.meta.url),
      'utf8',
    )
    const displayStyles = readFileSync(
      new URL('../docs/asset-generation/preview/red-shell/display.css', import.meta.url),
      'utf8',
    )
    expect(studioSource).toContain('GLOWBUD_TRAIT_OPTIONS')
    expect(studioSource).toContain("const sceneY = isRaddishShell ? -0.04 : -0.08")
    expect(wardrobeSource).toContain('GLOWBUD_PLAYER_CATEGORIES')
    expect(wardrobeSource).toContain('Museum wardrobe')
    expect(wardrobeSource).toContain('wardrobe-cabinet-badge')
    expect(wardrobeSource).toContain('container.scrollTo')
    expect(wardrobeSource).toContain('Original')
    expect(wardrobeSource).toContain('Remix')
    expect(wardrobeSource).toContain('Grand Reveal')
    expect(wardrobeSource).toContain('Undress')
    expect(displayStyles).toContain('.showroom.is-dressing .wardrobe-drawer')
    expect(displayStyles).toContain('@keyframes wardrobe-stage-clear')
    expect(displayStyles).toContain('height: 178px')
    expect(displayStyles).toContain('Museum wardrobe: player-facing dressing cabinet')
    expect(displayStyles).toContain('.museumWardrobeRoute .wardrobe-category-number')
  })

  it('grounds Glowbuds directly on room surfaces without a carried grass seat', () => {
    const avatarSource = readFileSync(
      new URL('../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx', import.meta.url),
      'utf8',
    )
    expect(avatarSource).not.toContain('<GrassySeat')
    expect(avatarSource).toContain('isMossShell\n                ? MOSS_SHELL_SOIL')
  })

  it('keeps the three Venus heads rooted and asynchronously animated', () => {
    const avatarSource = readFileSync(
      new URL('../docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx', import.meta.url),
      'utf8',
    )
    expect(avatarSource).toContain('function FlytrapAnimatedBranch')
    expect(avatarSource).toContain('familyAttention')
    expect(avatarSource.match(/motionRole="leader"/g)).toHaveLength(1)
    expect(avatarSource.match(/motionRole="scout"/g)).toHaveLength(1)
    expect(avatarSource.match(/motionRole="shy"/g)).toHaveLength(1)
    expect(avatarSource).toContain('headGroup.current.position.set(position[0], position[1], position[2])')
  })
})
