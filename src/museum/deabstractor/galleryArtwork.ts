// Original Glowbi posts, locally packaged so X is not a runtime dependency.
export const GLOWBI_GALLERY_ARTWORKS = [
  {
    id: 'same-journey', caption: 'Same journey',
    src: '/deabstractor/gallery/glowbi-same-journey.webp',
    source: 'https://x.com/GlowbiAbstract/status/2020845141821366716',
    width: 1152, height: 768, displayWidth: 3.6,
  },
  {
    id: 'quiet-friends', caption: 'Quiet places',
    src: '/deabstractor/gallery/glowbi-quiet-friends.webp',
    source: 'https://x.com/GlowbiAbstract/status/2020845135496683843',
    width: 768, height: 1152, displayWidth: 2.24,
  },
] as const

export type GlowbiGalleryArtwork = typeof GLOWBI_GALLERY_ARTWORKS[number]
