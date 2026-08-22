import { describe, expect, it } from 'vitest'
import { atriumRegistryErrorMessage } from '../src/museum/formal-room/atriumRegistryErrors'

describe('Atrium Registry error messages', () => {
  const fallback = 'The atrium could not be installed.'

  it('reads the structured error envelope returned by museum APIs', () => {
    expect(atriumRegistryErrorMessage({
      error: { message: 'Ownership checks are busy. Please try again shortly.' },
    }, fallback)).toBe('Ownership checks are busy. Please try again shortly.')
  })

  it('reads verification errors and direct message objects', () => {
    expect(atriumRegistryErrorMessage({ error: 'Ownership changed. Nothing was installed.' }, fallback))
      .toBe('Ownership changed. Nothing was installed.')
    expect(atriumRegistryErrorMessage({ message: 'The collection could not be reached.' }, fallback))
      .toBe('The collection could not be reached.')
  })

  it('never renders an arbitrary object as [object Object]', () => {
    expect(atriumRegistryErrorMessage({ error: { code: 'mystery' } }, fallback)).toBe(fallback)
    expect(atriumRegistryErrorMessage(null, fallback)).toBe(fallback)
    expect(atriumRegistryErrorMessage({}, fallback)).not.toBe('[object Object]')
  })

  it('normalizes server whitespace and caps unexpectedly long messages', () => {
    expect(atriumRegistryErrorMessage({ error: { message: '  Please\n try   again.  ' } }, fallback))
      .toBe('Please try again.')
    expect(atriumRegistryErrorMessage({ error: { message: 'x'.repeat(900) } }, fallback)).toHaveLength(500)
  })
})
