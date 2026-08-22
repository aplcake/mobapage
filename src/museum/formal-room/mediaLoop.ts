const GIF_LOOP_EXTENSION = Uint8Array.from([
  0x21, 0xff, 0x0b,
  0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
  0x03, 0x01, 0x00, 0x00, 0x00,
])

function isGif(bytes: Uint8Array) {
  if (bytes.byteLength < 13) return false
  const header = String.fromCharCode(...bytes.subarray(0, 6))
  return header === 'GIF87a' || header === 'GIF89a'
}

function forceGifContinuousLoop(bytes: Uint8Array) {
  if (!isGif(bytes)) return bytes

  for (let offset = 13; offset <= bytes.byteLength - 19; offset += 1) {
    const isNetscapeExtension = bytes[offset] === 0x21
      && bytes[offset + 1] === 0xff
      && bytes[offset + 2] === 0x0b
      && String.fromCharCode(...bytes.subarray(offset + 3, offset + 14)) === 'NETSCAPE2.0'
      && bytes[offset + 14] === 0x03
      && bytes[offset + 15] === 0x01
    if (!isNetscapeExtension) continue
    const looping = bytes.slice()
    looping[offset + 16] = 0
    looping[offset + 17] = 0
    return looping
  }

  const packed = bytes[10]
  const globalColorTableBytes = packed & 0x80
    ? 3 * (2 ** ((packed & 0x07) + 1))
    : 0
  const insertionOffset = Math.min(bytes.byteLength, 13 + globalColorTableBytes)
  const looping = new Uint8Array(bytes.byteLength + GIF_LOOP_EXTENSION.byteLength)
  looping.set(bytes.subarray(0, insertionOffset), 0)
  looping.set(GIF_LOOP_EXTENSION, insertionOffset)
  looping.set(bytes.subarray(insertionOffset), insertionOffset + GIF_LOOP_EXTENSION.byteLength)
  return looping
}

function forceWebpContinuousLoop(bytes: Uint8Array) {
  if (
    bytes.byteLength < 12
    || String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF'
    || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP'
  ) return bytes

  for (let offset = 12; offset + 8 <= bytes.byteLength;) {
    const chunkName = String.fromCharCode(...bytes.subarray(offset, offset + 4))
    const chunkSize = bytes[offset + 4]
      | (bytes[offset + 5] << 8)
      | (bytes[offset + 6] << 16)
      | (bytes[offset + 7] << 24)
    if (chunkSize < 0 || offset + 8 + chunkSize > bytes.byteLength) return bytes
    if (chunkName === 'ANIM' && chunkSize >= 6) {
      const looping = bytes.slice()
      looping[offset + 12] = 0
      looping[offset + 13] = 0
      return looping
    }
    offset += 8 + chunkSize + (chunkSize & 1)
  }
  return bytes
}

export function forceMotionImageContinuousLoop(bytes: Uint8Array, mediaType: string) {
  if (mediaType === 'image/gif') return forceGifContinuousLoop(bytes)
  if (mediaType === 'image/webp') return forceWebpContinuousLoop(bytes)
  return bytes
}
