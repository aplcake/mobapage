import type { MuseumGalleryId } from './museumPlan'

export type MuseumLoreId =
  | 'pixler-origin'
  | 'moba-one'
  | 'holiday-potluck'
  | 'moba-two'
  | 'one-final-album'
  | 'glowbud-world'

export type MuseumLoreSection = {
  heading: string
  paragraphs: readonly string[]
}

export type MuseumLoreChapter = {
  id: MuseumLoreId
  room: string
  galleryId: MuseumGalleryId
  trailLabel: string
  date: string
  title: string
  shortTitle: string
  deck: string
  plaqueCopy: string
  accent: string
  stats: readonly {
    value: string
    label: string
  }[]
  sections: readonly MuseumLoreSection[]
  closing: string
}

export const MUSEUM_LORE_CHAPTERS: readonly MuseumLoreChapter[] = [
  {
    id: 'pixler-origin',
    room: 'Opening Salon',
    galleryId: 'lobby',
    trailLabel: 'Prologue',
    date: 'Before the museum',
    title: 'The Artist Who Arrived After an Ending',
    shortTitle: 'From the Museum to the Garden',
    deck: 'Pixler began when a decade-long photography career stopped—and a new identity opened.',
    plaqueCopy: 'A photography career ends. A new name enters Web3. The museum begins.',
    accent: '#78d7c8',
    stats: [
      { value: '10+ years', label: 'professional photography' },
      { value: '1 final album', label: 'waiting in the archive' },
      { value: 'A new name', label: 'Pixler enters Web3' },
    ],
    sections: [
      {
        heading: 'An ending first',
        paragraphs: [
          'Before Pixler, there was more than a decade behind a camera. Photography was the work, the practice, and the way of moving through the world.',
          'Then the pandemic interrupted that path. The professional photography chapter closed, leaving one final album unreleased.',
        ],
      },
      {
        heading: 'A new name, not a blank slate',
        paragraphs: [
          'Crypto and Web3 offered a place to begin again. The artist entered under the name Pixler, carrying the eye of a photographer into pixels, collections, participation, and digital ownership.',
          'The Museum of Based Art grew from that restart: not simply a place to display finished work, but a place where collecting and participation could help give the work meaning.',
        ],
      },
    ],
    closing: 'The museum begins here. The photographs return later.',
  },
  {
    id: 'moba-one',
    room: 'MoBA #1',
    galleryId: 'moba-one',
    trailLabel: 'Chapter I',
    date: 'October 2024',
    title: 'The Museum Opens With 599 Faces',
    shortTitle: 'The Museum Opens',
    deck: 'Portraits of an Enjoyer turned the profile picture into a gallery of people, choices, and attention.',
    plaqueCopy: '599 pixel portraits ask a simple question: what happens when collecting becomes portraiture?',
    accent: '#f2b84b',
    stats: [
      { value: '599', label: 'pixel portraits' },
      { value: 'Exhibition 01', label: 'the first MoBA show' },
      { value: 'October 2024', label: 'the museum opens' },
    ],
    sections: [
      {
        heading: 'Portraits of an Enjoyer',
        paragraphs: [
          'MoBA #1 opened the Museum of Based Art with 599 pixel portraits. Each work sits between traditional portraiture and the profile pictures that represent people across the internet.',
          'Together, the portraits form more than a character set. They create a room full of digital identities—faces chosen, held, and carried by collectors.',
        ],
      },
      {
        heading: 'Collecting as meaning',
        paragraphs: [
          'The first exhibition established the museum’s central idea: the collector is not outside the artwork. Choosing a portrait gives it a place in a person’s identity and a place in the life of the collection.',
          'MoBA began as a gallery, but it was already becoming a social space built by the people who entered it.',
        ],
      },
    ],
    closing: 'To collect a portrait was to decide that it mattered.',
  },
  {
    id: 'holiday-potluck',
    room: 'Holiday Potluck',
    galleryId: 'holiday',
    trailLabel: 'Chapter II',
    date: 'December 2024',
    title: 'The Museum Becomes an Event',
    shortTitle: 'Art That Does Something',
    deck: 'The Holiday Potluck brought artists and audiences together—and made the artworks active parts of the experience.',
    plaqueCopy: 'A holiday collaboration turns artworks into gifts, actions, and shared experiences.',
    accent: '#d8ff65',
    stats: [
      { value: '11', label: 'unique artworks' },
      { value: '1,200+', label: 'editions collected' },
      { value: '1 gift', label: 'burned to reveal more' },
    ],
    sections: [
      {
        heading: 'A collaborative exhibition',
        paragraphs: [
          'MoBA x Twisted Tweaks Holiday Potluck gathered 11 unique artworks into a seasonal exhibition. More than 1,200 editions were collected across the project.',
          'The potluck expanded the museum beyond a single artist. Different works, communities, and ideas shared one room—like dishes arriving at the same table.',
        ],
      },
      {
        heading: 'The artwork becomes an action',
        paragraphs: [
          'A Based Gift could be burned to reveal something else. The collection was no longer only something to look at; it could become a choice, an event, or a transformation.',
          'Soon after, Yes / Yes—created with OpenSea—introduced the heart that would echo through MoBA #2. The joke was gentle but decisive: whichever path you chose, the answer still led to yes.',
        ],
      },
    ],
    closing: 'The museum stopped being a container. It started behaving like a program.',
  },
  {
    id: 'moba-two',
    room: 'MoBA #2',
    galleryId: 'moba-two',
    trailLabel: 'Chapter III',
    date: 'April 2025',
    title: 'The Audience Curates the Museum',
    shortTitle: 'Curated Hearts',
    deck: 'MoBA #2 let creation, destruction, and community votes shape what the final exhibition became.',
    plaqueCopy: '2,222 works shaped by community curation—and one !createbox left standing after 49 burns.',
    accent: '#61dce8',
    stats: [
      { value: '2,222', label: 'works in the collection' },
      { value: '50 → 1', label: '!createboxes after 49 burns' },
      { value: '50+', label: 'artists and contributors' },
    ],
    sections: [
      {
        heading: 'Creation through decision',
        paragraphs: [
          'MoBA #2: Curated Hearts began with 50 !createboxes. Forty-nine were burned, leaving one sole surviving box—now owned by MonkeyDHashy—as a 1/1.',
          'More than 50 artists and community contributors became part of the collection. The heart from Yes / Yes multiplied into many styles, voices, and interpretations.',
        ],
      },
      {
        heading: 'Curation becomes visible',
        paragraphs: [
          'Through !curate, community votes in Discord influenced rankings, rarity, and the final shape of the collection—including works that had not yet been revealed.',
          'The audience did not simply visit the exhibition after it was finished. It helped determine what the exhibition would become.',
        ],
      },
    ],
    closing: 'Here, curation was not a label placed after the art. It was part of making the art.',
  },
  {
    id: 'one-final-album',
    room: 'Photography Room',
    galleryId: 'photography',
    trailLabel: 'Chapter IV',
    date: 'June 2025',
    title: 'The Past Arrives Late',
    shortTitle: 'One Final Album',
    deck: 'The oldest chapter in Pixler’s story became the newest chapter in the museum.',
    plaqueCopy: 'A final journey through the American West becomes Pixler’s first—and only—photographic release.',
    accent: '#d8cfb7',
    stats: [
      { value: '200+', label: 'photographs curated' },
      { value: '2,669', label: 'editions minted' },
      { value: '1 final journey', label: 'through the American West' },
    ],
    sections: [
      {
        heading: 'The album left behind',
        paragraphs: [
          'Before MoBA, before the hearts, and before Glowbuds, there was one final photographic journey. Yosemite’s backcountry, the Lost Coast, Big Sur, the Oregon coast, the Four Pass Loop, and the Maroon Bells became its landscape.',
          'More than 200 photographs were gathered and curated from that body of work. The album waited while the artist moved into a new medium and a new name.',
        ],
      },
      {
        heading: 'Released after the future',
        paragraphs: [
          'One Final Album arrived in June 2025, after the digital museum had already taken shape. Its 2,669 editions became the first—and only—photographic release under the name Pixler.',
          'The sequence folds time back on itself: the earliest work entered the museum last, allowing the origin story to be seen only after everything it eventually became.',
        ],
      },
    ],
    closing: 'The museum looked forward long enough to finally make room for its past.',
  },
  {
    id: 'glowbud-world',
    room: 'Glowbud Atrium',
    galleryId: 'lobby',
    trailLabel: 'Chapter V',
    date: 'Summer 2025',
    title: 'The Museum Becomes a Living World',
    shortTitle: 'From Museum to Garden',
    deck: 'Glowbuds carried the museum’s ideas into characters, motion, membership, tokens, and a world that could keep growing.',
    plaqueCopy: 'Seeds become characters. Collectors become residents. The wall is no longer the edge of the artwork.',
    accent: '#8fe3d8',
    stats: [
      { value: '300', label: 'glowing seed memberships' },
      { value: '3,333', label: 'Glowbuds released' },
      { value: 'August 12', label: '$GROW launches' },
    ],
    sections: [
      {
        heading: 'Planting the world',
        paragraphs: [
          'The Glowbuds universe began on Abstract with Glowbi. On August 2, A Mysterious Bag of Glowing Seeds introduced a 300-piece membership collection. Ten days later, $GROW launched through Clanker as its first token on Abstract.',
          'On August 15, 3,333 Glowbuds arrived: characters designed to be collected, dressed, animated, and carried into an expanding world.',
        ],
      },
      {
        heading: 'The thread through everything',
        paragraphs: [
          'Glowbuds combined the practices developed across the museum: pixel art, collecting, character design, AI video, token mechanics, participation, and worldbuilding.',
          'The role of curation kept widening—from selecting pixels, to gathering artists, to community voting, to recovering an artist’s past, and finally to tending a living world.',
        ],
      },
    ],
    closing: 'The museum did not disappear. It learned how to grow.',
  },
] as const

export const MUSEUM_LORE_BY_ID = Object.fromEntries(
  MUSEUM_LORE_CHAPTERS.map((chapter) => [chapter.id, chapter]),
) as Record<MuseumLoreId, MuseumLoreChapter>

export function museumLoreTrailPosition(id: MuseumLoreId) {
  return MUSEUM_LORE_CHAPTERS.findIndex((chapter) => chapter.id === id)
}
