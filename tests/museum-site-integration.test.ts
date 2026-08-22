import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rootPage = readFileSync('app/page.tsx', 'utf8')
const legacyFormalRoom = readFileSync('app/formal-room/page.tsx', 'utf8')
const burnRoom = readFileSync('app/burn-room/page.tsx', 'utf8')
const courtyard = readFileSync('app/courtyard/page.tsx', 'utf8')
const mobileNav = readFileSync('src/ui/MuseumMobileNav.tsx', 'utf8')
const formalMuseum = readFileSync('src/museum/formal-room/FormalMuseumRoom.tsx', 'utf8')

describe('public museum site integration', () => {
  it('uses the playable Formal Museum as the public homepage', () => {
    expect(rootPage).toContain("import('../src/museum/formal-room/FormalMuseumRoom')")
    expect(rootPage).toContain('<FormalMuseumRoom />')
    expect(rootPage).not.toContain('HomePage')
    expect(rootPage).not.toContain("redirect('/formal-room')")
  })

  it('keeps old Formal Room links working through the canonical homepage', () => {
    expect(legacyFormalRoom).toContain("redirect('/')")
  })

  it('sends Burn Room traffic to Aplcake’s existing functional burn app', () => {
    expect(burnRoom).toContain("https://burn.museumofbased.art/")
    expect(burnRoom).toContain('redirect(BURN_ROOM_URL)')
  })

  it('keeps the courtyard and museum routes looped together', () => {
    expect(courtyard).toContain('<MuseumMobileNav roomName="Sunny Courtyard" />')
    expect(mobileNav).toContain('href="/"')
    expect(formalMuseum).toContain("router.push('/courtyard')")
    expect(formalMuseum).toContain("router.push('/burn-room')")
  })
})
