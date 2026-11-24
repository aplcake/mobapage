import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const base = process.env.SLURPER_BASE_URL || 'http://localhost:3017'
const out = process.env.DEABSTRACTOR_AUDIT_DIR || 'docs/validation/deabstractor-security'
const proof = { checkedAt: new Date().toISOString(), base, checks: [], serverTrace: [], scope: 'Known dependency advisories and the listed HTTP checks; not an independent security certification.' }
const request = (route, options) => fetch(new URL(route, base), { ...options, signal: AbortSignal.timeout(15000) })
let auditText
try { auditText = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' }) }
catch (error) { if (!error.stdout) throw error; auditText = error.stdout }
const audit = JSON.parse(auditText)
assert(audit.metadata?.vulnerabilities, 'Dependency audit did not complete')
proof.dependencies = audit.metadata.vulnerabilities
proof.advisories = Object.values(audit.vulnerabilities).flatMap(value => value.via.filter(item => typeof item === 'object'))
const riskyPackage = /node_modules\/(?:decode-uri-component|elliptic|uuid|zod|hono)\//
for (const route of ['check', 'inventory', 'portrait/[token]']) {
  const file = `.next/server/app/api/deabstractor/${route}/route.js.nft.json`
  const trace = JSON.parse(readFileSync(file, 'utf8'))
  const sources = new Set()
  let maps = 0
  const visit = map => {
    for (const source of map.sources || []) sources.add(source)
    for (const section of map.sections || []) visit(section.map)
  }
  for (const entry of trace.files) {
    const map = path.resolve(path.dirname(file), entry) + '.map'
    if (existsSync(map)) { maps++; visit(JSON.parse(readFileSync(map, 'utf8'))) }
  }
  assert(maps > 0, 'Build source maps missing; cannot assess API bundle membership')
  proof.serverTrace.push({ route, maps, sourceCount: sources.size, bundledMatches: [...sources].filter(source => riskyPackage.test(source)), externalMatches: trace.files.filter(source => riskyPackage.test(source)) })
}
proof.traceLimit = 'API build membership only. Does not certify browser wallet bundles, SDK services, or exploitability.'

const page = await request('/deabstractor')
assert.equal(page.status, 200)
assert.equal(page.headers.get('x-frame-options'), 'SAMEORIGIN')
assert.equal(page.headers.get('x-content-type-options'), 'nosniff')
assert.equal(page.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
assert.match(page.headers.get('content-security-policy') || '', /frame-ancestors 'self'/)
proof.checks.push('Wallet screen rejects cross-origin framing; MIME and referrer headers present')
for (const [label, body, headers] of [
  ['cross-origin', '{"action":"recipient"}', { Origin: 'https://unrelated.invalid' }],
  ['cross-site', '{"action":"recipient"}', { 'Sec-Fetch-Site': 'cross-site' }],
  ['oversized body', 'x'.repeat(2049), {}],
  ['unsupported action', '{"action":"sendTransaction"}', {}],
  ['invalid address', '{"action":"recipient","to":"0x0"}', {}],
  ['oversized batch', JSON.stringify({ action: 'preflight-departure', from: '0x1111111111111111111111111111111111111111', to: '0x2222222222222222222222222222222222222222', tokens: Array.from({ length: 51 }, (_, i) => i + 1) }), {}],
]) {
  const response = await request('/api/deabstractor/check', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body })
  assert.equal(response.status, 400, label)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const data = await response.json()
  assert.equal(typeof data.error, 'string')
  assert.doesNotMatch(data.error, /https?:|api.?key|token=|\n/i)
  proof.checks.push(`${label} rejected without a transaction or cached wallet response`)
}
const invalidInventory = await request('/api/deabstractor/inventory?address=not-a-wallet')
assert.equal(invalidInventory.status, 503)
assert.match((await invalidInventory.json()).error, /valid wallet address/)
proof.checks.push('Invalid inventory address rejected before RPC reads')
const root = await request('/')
assert.equal(root.status, 200)
assert.equal(root.headers.get('x-frame-options'), null)
proof.checks.push('Room-only framing policy leaves the museum homepage unchanged')
proof.knownDependencyFindings = proof.dependencies.total
mkdirSync(out, { recursive: true })
writeFileSync(path.join(out, 'security-proof.json'), JSON.stringify(proof, null, 2) + '\n')
console.log(JSON.stringify(proof, null, 2))
// An audit artifact must not turn an unresolved release gate into a green check.
process.exitCode = proof.dependencies.total ? 1 : 0
