export const GLOWBUD_LOD_TOKEN_IDS: readonly string[]
export const GLOWBUD_IMAGE_CID: string
export const GLOWBUD_SOURCE_SHA256: Readonly<Record<string, string>>

export function glowbudLodAssetUrl(tokenId: string): string
export function glowbudSourceUrls(tokenId: string): string[]

export type GlowbudLodGenerationResult = {
  tokenId: string
  url: string
  bytes: number
  sha256: string
}

export function generateGlowbudLodAssets(options?: {
  sourceDir?: string
  outputDir?: string
  fetchImpl?: typeof fetch
}): Promise<GlowbudLodGenerationResult[]>
