import rawTrackerData from './glowbudsTraitTrackerData.json'

export type GlowbudsTrackerStatus =
  | 'complete'
  | 'likely-match'
  | 'partial'
  | 'not-started'
  | 'review-needed'

export type GlowbudsTrackerConfidence = 'high' | 'medium' | 'low'

export type GlowbudsTraitTrackerRow = {
  sourceCategory: string
  sourceTrait: string
  studioCategory: string | null
  studioTrait: string | null
  status: GlowbudsTrackerStatus
  confidence: GlowbudsTrackerConfidence
  observedSampleCount: number | null
  notes: string
}

export type GlowbudsTraitTrackerCategoryTotal = {
  category: string
  expectedValues: number
}

export type GlowbudsTraitTrackerSource = {
  collectionName: string
  collectionUrl: string
  chain: string
  contract: string
  metadataBase: string
  tokenRange: string
  categoryCountSource: string
  valueSource: string
  sampledTokens: number
}

type GlowbudsTraitTrackerData = {
  source: GlowbudsTraitTrackerSource
  categoryTotals: GlowbudsTraitTrackerCategoryTotal[]
  rows: GlowbudsTraitTrackerRow[]
}

const trackerData = rawTrackerData as GlowbudsTraitTrackerData

export const GLOWBUDS_TRAIT_TRACKER_SOURCE = trackerData.source
export const GLOWBUDS_TRAIT_CATEGORY_TOTALS = trackerData.categoryTotals
export const GLOWBUDS_TRAIT_TRACKER_ROWS = trackerData.rows

export const GLOWBUDS_TRACKER_STATUS_LABELS: Record<GlowbudsTrackerStatus, string> = {
  complete: 'Complete',
  'likely-match': 'Likely Match',
  partial: 'Partial',
  'not-started': 'Not Started',
  'review-needed': 'Review Needed',
}

export function getGlowbudsTraitTrackerSummary(rows = GLOWBUDS_TRAIT_TRACKER_ROWS) {
  const counts = rows.reduce<Record<GlowbudsTrackerStatus, number>>(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    {
      complete: 0,
      'likely-match': 0,
      partial: 0,
      'not-started': 0,
      'review-needed': 0,
    },
  )
  const sourceValueCount = rows.length
  const modeledOrLikely = counts.complete + counts['likely-match']
  const needsWork = sourceValueCount - modeledOrLikely

  return {
    sourceValueCount,
    modeledOrLikely,
    needsWork,
    counts,
  }
}
