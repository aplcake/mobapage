const MAX_ATRIUM_REGISTRY_ERROR_LENGTH = 500

function cleanMessage(value: unknown) {
  if (typeof value !== 'string') return null
  const message = value.trim().replace(/\s+/g, ' ')
  return message ? message.slice(0, MAX_ATRIUM_REGISTRY_ERROR_LENGTH) : null
}

function messageFrom(value: unknown, depth: number): string | null {
  const direct = cleanMessage(value)
  if (direct) return direct
  if (depth >= 3 || !value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  return cleanMessage(record.message) ?? messageFrom(record.error, depth + 1)
}

/**
 * Turns both API error envelopes (`{ error: { message } }`) and verification
 * results (`{ error: string }`) into safe, useful visitor-facing copy.
 */
export function atriumRegistryErrorMessage(payload: unknown, fallback: string) {
  return messageFrom(payload, 0) ?? fallback
}
