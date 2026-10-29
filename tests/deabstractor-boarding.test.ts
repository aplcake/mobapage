import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PassengerLineup } from '../src/museum/deabstractor/PassengerLineup'

function markup(options: { tokens?: number[]; focusedToken?: number; disabled?: boolean; editable?: boolean } = {}) {
  return renderToStaticMarkup(createElement(PassengerLineup, {
    tokens: options.tokens ?? [968, 1677], focusedToken: options.focusedToken ?? 1677,
    disabled: options.disabled ?? false, onPreview: vi.fn(), onRemove: options.editable ? vi.fn() : undefined,
  }))
}

describe('Boarding passenger controls', () => {
  it('keeps original pixel portraits and exact token identities', () => {
    const html = markup()
    expect(html).toContain('/deabstractor/glowbud-968.png')
    expect(html).toContain('/deabstractor/glowbud-1677.png')
    expect(html).toContain('Preview Glowbud 968 on machine')
    expect(html).toContain('Preview Glowbud 1677 on machine')
    expect(html).toContain('2/50')
  })
  it('marks only the current machine portrait as focused', () => {
    const html = markup()
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-label="Preview Glowbud 1677 on machine" aria-pressed="true"/)
    expect(html).not.toContain('SAFE')
  })
  it('separates removal from preview, and does not expose removal on review', () => {
    expect(markup({ editable: true })).toContain('Remove Glowbud 968 from passengers')
    expect(markup()).not.toContain('from passengers')
  })
  it('locks every passenger action during a wallet operation', () => {
    const html = markup({ disabled: true, editable: true })
    expect(html.match(/<button/g)).toHaveLength(4)
    expect(html.match(/disabled=""/g)).toHaveLength(4)
  })
  it('uses an honest empty state without a fake boarded passenger', () => {
    const html = markup({ tokens: [] })
    expect(html).toContain('No passengers selected')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('On screen')
  })
})
