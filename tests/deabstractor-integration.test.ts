import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(file, 'utf8')

describe('De-Abstractor museum integration', () => {
  it('adds an optional room without replacing the museum homepage', () => {
    expect(read('app/page.tsx')).toContain('<FormalMuseumRoom />')
    const room = read('src/museum/formal-room/FormalMuseumRoom.tsx')
    expect(room).toContain('<Link href="/deabstractor" prefetch={false}')
    for (const label of ['Main Museum', 'Courtyard', 'Burn Room', 'How to Move']) {
      expect(room).toContain(`<strong>${label}</strong>`)
    }
    expect(room).not.toContain("from '../deabstractor/")
  })

  it('keeps the wallet provider and font styles out of the shared layout', () => {
    const layout = read('app/layout.tsx')
    expect(layout).not.toContain('AbstractWalletProvider')
    expect(layout).not.toContain('deabstractor')
    expect(read('src/museum/deabstractor/TransferDesk.tsx')).toContain("dynamic(() => import('./AbstractLogin')")
    expect(read('src/museum/deabstractor/typography.css')).not.toMatch(/(?:body|:root|html)\s*\{/)
  })

  it('preserves the explicit no-wallet demo and the return to museum', () => {
    expect(read('app/deabstractor/page.tsx')).toContain("demo === '1'")
    expect(read('src/museum/deabstractor/DeabstractorExperience.tsx')).toContain('aria-label="Return to museum"')
    expect(read('src/museum/deabstractor/DeabstractorExperience.tsx')).toContain('<Link href="/"')
  })
})
