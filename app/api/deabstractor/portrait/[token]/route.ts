import { tokenNumber } from '../../../../../src/museum/deabstractor/transfer'
export const runtime = 'nodejs'
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const token = tokenNumber((await context.params).token)
    // Fixed original-art CID; neither wallet input nor mutable metadata can choose an upstream URL.
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/QmaqEJNBEJWdwwSGBHtcqGCdJfnXazNVj6tcvr21E6abAU/${token}`, { signal: AbortSignal.timeout(12000), next: { revalidate: 86400 } })
    if (!response.ok) throw new Error('Portrait unavailable')
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > 4 * 1024 * 1024) throw new Error('Portrait too large')
    const signature = new Uint8Array(bytes)
    const png = signature[0] === 137 && signature[1] === 80 && signature[2] === 78 && signature[3] === 71
    if (!png) throw new Error('Unexpected image format')
    return new Response(bytes, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return new Response('Portrait unavailable', { status: 503 }) }
}
