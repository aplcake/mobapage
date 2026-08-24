'use client'

import { type CSSProperties, useEffect } from 'react'
import {
  MUSEUM_LORE_BY_ID,
  MUSEUM_LORE_CHAPTERS,
  museumLoreTrailPosition,
  type MuseumLoreId,
} from './museumLore'
import styles from './MuseumLorePanel.module.css'

export function MuseumLorePanel({
  chapterId,
  onClose,
  onNavigate,
}: {
  chapterId: MuseumLoreId | null
  onClose: () => void
  onNavigate: (chapterId: MuseumLoreId) => void
}) {
  useEffect(() => {
    if (!chapterId) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [chapterId, onClose])

  if (!chapterId) return null
  const chapter = MUSEUM_LORE_BY_ID[chapterId]
  const trailIndex = museumLoreTrailPosition(chapterId)
  const previous = MUSEUM_LORE_CHAPTERS[trailIndex - 1] ?? null
  const next = MUSEUM_LORE_CHAPTERS[trailIndex + 1] ?? null
  const panelStyle = { '--lore-accent': chapter.accent } as CSSProperties

  return (
    <div className={styles.scrim} onPointerDown={onClose} data-testid="museum-lore-scrim">
      <article
        className={styles.panel}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="museum-lore-title"
        aria-describedby="museum-lore-deck"
        onPointerDown={(event) => event.stopPropagation()}
        data-testid="museum-lore-panel"
      >
        <header className={styles.header}>
          <div className={styles.chapterMark} aria-hidden="true">
            <span>{String(trailIndex + 1).padStart(2, '0')}</span>
            <i />
          </div>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>{chapter.trailLabel} · {chapter.room}</span>
            <h2 id="museum-lore-title">{chapter.title}</h2>
            <p id="museum-lore-deck">{chapter.deck}</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} autoFocus aria-label="Close museum story">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className={styles.dateRule}>
          <span>{chapter.date}</span>
          <i aria-hidden="true" />
          <small>Museum story {trailIndex + 1} of {MUSEUM_LORE_CHAPTERS.length}</small>
        </div>

        <div className={styles.body}>
          <aside className={styles.stats} aria-label="At a glance">
            {chapter.stats.map((stat) => (
              <div key={`${stat.value}-${stat.label}`}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </aside>

          <div className={styles.story}>
            {chapter.sections.map((section) => (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
            <blockquote>{chapter.closing}</blockquote>
          </div>
        </div>

        <footer className={styles.footer}>
          <small>Museum history · adapted from the artist archive</small>
          <nav aria-label="Museum story trail">
            {previous ? (
              <button type="button" onClick={() => onNavigate(previous.id)}>
                <span aria-hidden="true">←</span>
                <span><small>Previous</small><strong>{previous.shortTitle}</strong></span>
              </button>
            ) : <span />}
            {next ? (
              <button type="button" onClick={() => onNavigate(next.id)}>
                <span><small>Next</small><strong>{next.shortTitle}</strong></span>
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button type="button" onClick={onClose}>
                <span><small>Return to</small><strong>Glowbud Garden</strong></span>
                <span aria-hidden="true">×</span>
              </button>
            )}
          </nav>
        </footer>
      </article>
    </div>
  )
}
