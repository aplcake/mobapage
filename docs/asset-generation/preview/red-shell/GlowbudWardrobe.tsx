import { useEffect, useRef } from 'react'
import type { GlowbudTraitLoadout } from '../../code-examples/RedShellIdleCritterAsset.example'
import {
  GLOWBUD_CATEGORY_LABELS,
  GLOWBUD_PLAYER_CATEGORIES,
  glowbudTraitOptions,
  type GlowbudPlayerCategory,
  type GlowbudTraitCategory,
} from './glowbudsTraitCatalog'

export type GlowbudWardrobeCategory = GlowbudPlayerCategory | 'flytrap'

type GlowbudWardrobeProps = {
  open: boolean
  traits: GlowbudTraitLoadout
  activeCategory: GlowbudWardrobeCategory
  onCategoryChange: (category: GlowbudWardrobeCategory) => void
  onTraitChange: (category: GlowbudTraitCategory, value: string) => void
  onClose: () => void
  onUndress: () => void
  onRandomize: () => void
  onReset: () => void
  onReveal: () => void
}

export function GlowbudWardrobe({
  open,
  traits,
  activeCategory,
  onCategoryChange,
  onTraitChange,
  onClose,
  onUndress,
  onRandomize,
  onReset,
  onReveal,
}: GlowbudWardrobeProps) {
  const categoryNavRef = useRef<HTMLElement>(null)
  const optionGridRef = useRef<HTMLDivElement>(null)
  const categories: GlowbudWardrobeCategory[] = [...GLOWBUD_PLAYER_CATEGORIES]
  if (traits.head === 'venus-flytrap') categories.splice(categories.indexOf('head') + 1, 0, 'flytrap')
  const safeCategory = categories.includes(activeCategory) ? activeCategory : 'head'
  const options = glowbudTraitOptions(safeCategory)
  const selectedValue = traits[safeCategory] ?? ''
  const selectedOption = options.find((option) => option.value === selectedValue)

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'

      const centerSelected = (container: HTMLElement | null) => {
        const selected = container?.querySelector<HTMLElement>('[aria-pressed="true"]')
        if (!container || !selected) return
        const containerBounds = container.getBoundingClientRect()
        const selectedBounds = selected.getBoundingClientRect()
        const selectedCenter = selectedBounds.left + selectedBounds.width / 2
        const containerCenter = containerBounds.left + containerBounds.width / 2
        const left = container.scrollLeft + selectedCenter - containerCenter
        container.scrollTo({ left: Math.max(0, left), behavior })
      }

      centerSelected(categoryNavRef.current)
      centerSelected(optionGridRef.current)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open, safeCategory, selectedValue])

  if (!open) return null

  return (
    <aside
      className="wardrobe-drawer"
      aria-label="Glowbud wardrobe"
      data-category={safeCategory}
    >
      <header className="wardrobe-heading">
        <span className="wardrobe-cabinet-badge" aria-hidden="true">Dress</span>
        <div className="wardrobe-heading-copy">
          <span>Museum wardrobe</span>
          <strong>{GLOWBUD_CATEGORY_LABELS[safeCategory]} cabinet</strong>
          <small>{selectedOption?.label ?? GLOWBUD_CATEGORY_LABELS[safeCategory]} equipped</small>
        </div>
        <button
          type="button"
          className="panel-close"
          aria-label="Close wardrobe"
          title="Close"
          onClick={onClose}
        >
          X
        </button>
      </header>

      <div className="wardrobe-body">
        <nav ref={categoryNavRef} className="wardrobe-categories" aria-label="Trait categories">
          {categories.map((category, index) => (
            <button
              key={category}
              type="button"
              aria-pressed={safeCategory === category}
              onClick={() => onCategoryChange(category)}
            >
              <span className="wardrobe-category-number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{GLOWBUD_CATEGORY_LABELS[category]}</span>
            </button>
          ))}
        </nav>

        <section className="wardrobe-options" aria-label={`${GLOWBUD_CATEGORY_LABELS[safeCategory]} options`}>
          <div className="wardrobe-section-title" aria-live="polite">
            <span>Now wearing</span>
            <strong>{selectedOption?.label ?? GLOWBUD_CATEGORY_LABELS[safeCategory]}</strong>
          </div>
          <div ref={optionGridRef} className="wardrobe-option-grid">
            {options.map((option) => {
              const selected = selectedValue === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  className="wardrobe-option"
                  aria-pressed={selected}
                  title={option.sublabel}
                  onClick={() => onTraitChange(safeCategory, option.value)}
                >
                  {option.swatch ? (
                    <span
                      className="wardrobe-swatch"
                      style={{ backgroundColor: option.swatch }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="wardrobe-option-mark" aria-hidden="true">
                      {selected ? 'ON' : option.label.slice(0, 1)}
                    </span>
                  )}
                  <span className="wardrobe-option-copy">
                    <strong>{option.label}</strong>
                    <small>{option.sublabel}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="wardrobe-actions">
        <button type="button" onClick={onReset}>Original</button>
        <button type="button" onClick={onUndress}>Undress</button>
        <button type="button" onClick={onRandomize}>Remix</button>
        <button type="button" className="wardrobe-reveal" onClick={onReveal}>Grand Reveal</button>
      </footer>
    </aside>
  )
}
