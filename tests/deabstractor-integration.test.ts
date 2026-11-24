import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EMPTY_JOURNEY, type JourneyPhase } from '../src/museum/deabstractor/liveJourney'
import { shouldConfirmRoomExit } from '../src/museum/deabstractor/roomNavigation'

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
    expect(read('src/museum/deabstractor/DeabstractorExperience.tsx')).toContain('<MuseumRoomNav')
    const navigation = read('src/museum/deabstractor/MuseumRoomNav.tsx')
    expect(navigation).toContain('aria-label="Return to museum"')
    expect(navigation).toContain('<Link href="/"')
    expect(navigation).toContain('receiptOpen')
    expect(navigation).toContain("event.defaultPrevented")
    for (const route of ['/', '/courtyard', '/burn-room']) expect(navigation).toContain(`href="${route}"`)
  })

  it('gives the room a physical museum entrance without loading the machine twice', () => {
    const entrance = read('src/museum/formal-room/DeabstractorEntrance.tsx')
    expect(entrance).toContain("href: '/deabstractor'")
    expect(entrance).toContain('if (enabled) onEnter()')
    expect(entrance).not.toContain('DeabstractorExperience')
    expect(read('src/museum/formal-room/FormalMuseumRoom.tsx')).toContain('<DeabstractorEntrance')
  })

  it('provides room-specific metadata and recoverable route errors', () => {
    expect(read('app/deabstractor/page.tsx')).toContain('https://www.museumofbased.art/deabstractor')
    expect(read('app/deabstractor/error.tsx')).toContain('Do not send it again.')
    expect(read('app/deabstractor/error.tsx')).toContain('onClick={reset}')
  })

  it.each<JourneyPhase>(['preparing', 'approval', 'pending'])('warns before leaving an active %s departure', phase => {
    expect(shouldConfirmRoomExit({ ...EMPTY_JOURNEY, id: 'trip', phase })).toBe(true)
  })

  it.each<JourneyPhase>(['connect', 'connecting', 'boarding', 'review', 'confirmed', 'cancelled', 'partial'])('does not block ordinary room navigation in %s', phase => {
    expect(shouldConfirmRoomExit({ ...EMPTY_JOURNEY, id: 'trip', phase })).toBe(false)
  })

  it('allows demo and idle-room exits without a wallet prompt', () => {
    expect(shouldConfirmRoomExit()).toBe(false)
    expect(shouldConfirmRoomExit(EMPTY_JOURNEY)).toBe(false)
  })
})
