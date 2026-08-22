import rawTokenIndex from '../../../docs/asset-generation/preview/red-shell/glowbudsTokenIndex.json'
import {
  composeGlowbudDisplayTraits as composeCanonicalGlowbudDisplayTraits,
  type GlowbudDisplayComposition,
  type GlowbudSourceAttribute,
} from '../../../docs/asset-generation/preview/red-shell/glowbudsDisplayMapping'
import type { MuseumAssetAttribute } from '../collection-registry/museumAssetTypes'

type GlowbudTokenIndex = {
  source: { imageBase: string | null }
  tokens: Record<string, readonly (readonly [string, string])[]>
}

const tokenIndex = rawTokenIndex as unknown as GlowbudTokenIndex

export function glowbudAttributesForToken(tokenId: string): MuseumAssetAttribute[] {
  return (tokenIndex.tokens[tokenId] ?? []).map(([trait_type, value]) => ({ trait_type, value }))
}

export function composeGlowbudDisplayTraits(
  attributes: readonly MuseumAssetAttribute[],
): GlowbudDisplayComposition {
  return composeCanonicalGlowbudDisplayTraits(attributes as GlowbudSourceAttribute[])
}

export function glowbudImageUrl(tokenId: string) {
  const base = tokenIndex.source.imageBase?.replace('ipfs://', '').replace(/\/$/, '')
  return base ? `https://ipfs.io/ipfs/${base}/${tokenId}` : null
}

export function glowbudLookLine(attributes: readonly MuseumAssetAttribute[]) {
  const categories = ['Plant', 'Shell', 'Item', 'Companion', 'Type']
  const values = categories.flatMap((category) => attributes
    .filter((attribute) => attribute.trait_type === category)
    .map((attribute) => attribute.value))
  return [...new Set(values)].slice(0, 3).join(' · ')
}
