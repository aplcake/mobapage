import rawReferenceIndex from './glowbudsTraitReferenceIndex.json'
import rawProductionRules from './glowbudsTraitProductionRules.json'
import type {
  GlowbudsTraitTrackerRow,
  GlowbudsTrackerStatus,
} from './glowbudsTraitTracker'

export type GlowbudsProductionComplexity = 'small' | 'medium' | 'large'
export type GlowbudsProductionAction = 'resolve' | 'verify' | 'build'
export type GlowbudsProductionPriority = 'P0' | 'P1' | 'P2' | 'P3'

export type GlowbudsTraitReferenceSample = {
  tokenId: number
  name: string
  imageIpfs: string
  imageUrl: string
  openSeaUrl: string
  attributes: Record<string, string>
}

type GlowbudsTraitReferenceRow = {
  sourceCategory: string
  sourceTrait: string
  observedSampleCount: number
  samples: GlowbudsTraitReferenceSample[]
}

type GlowbudsTraitReferenceIndex = {
  source: {
    collectionName: string
    metadataBase: string
    sampledTokenRange: string
    sampledTokens: number
    representativeRule: string
  }
  rows: GlowbudsTraitReferenceRow[]
}

export type GlowbudsProductionQueueItem = {
  key: string
  row: GlowbudsTraitTrackerRow
  action: GlowbudsProductionAction
  priority: GlowbudsProductionPriority
  phase: string
  complexity: GlowbudsProductionComplexity
  batchSize: number
  samples: GlowbudsTraitReferenceSample[]
  brief: string
}

type CategoryProfile = {
  order: number
  phase: string
  complexity: GlowbudsProductionComplexity
  batchSize: number
  implementationNote: string
}

type GlowbudsProductionRules = {
  categoryProfiles: Record<string, CategoryProfile>
  qualityGates: Array<{ id: string; label: string }>
}

const referenceIndex = rawReferenceIndex as GlowbudsTraitReferenceIndex
const productionRules = rawProductionRules as GlowbudsProductionRules
const CATEGORY_PROFILES = productionRules.categoryProfiles

export const GLOWBUDS_QUALITY_GATES = productionRules.qualityGates

const referenceByKey = new Map(
  referenceIndex.rows.map((row) => [
    getGlowbudsTraitKey(row.sourceCategory, row.sourceTrait),
    row,
  ]),
)

function actionForStatus(status: GlowbudsTrackerStatus): GlowbudsProductionAction {
  if (status === 'review-needed') return 'resolve'
  if (status === 'likely-match' || status === 'partial') return 'verify'
  return 'build'
}

function priorityFor(
  action: GlowbudsProductionAction,
  profile: CategoryProfile,
): GlowbudsProductionPriority {
  if (action === 'resolve' || action === 'verify') return 'P0'
  if (profile.order <= 5) return 'P1'
  if (profile.order <= 8) return 'P2'
  return 'P3'
}

function actionRank(action: GlowbudsProductionAction) {
  if (action === 'resolve') return 0
  if (action === 'verify') return 1
  return 2
}

function buildReferenceLine(samples: GlowbudsTraitReferenceSample[]) {
  if (samples.length === 0) {
    return 'No representative token is available yet; resolve the source identity before modeling.'
  }
  return `Use representative Glowbuds ${samples
    .map((sample) => `#${sample.tokenId}`)
    .join(', ')} as the visual source set.`
}

function buildProductionBrief(
  row: GlowbudsTraitTrackerRow,
  action: GlowbudsProductionAction,
  profile: CategoryProfile,
  samples: GlowbudsTraitReferenceSample[],
) {
  const target = `${row.sourceCategory} trait "${row.sourceTrait}"`
  const mapping = row.studioTrait
    ? `${row.studioCategory} "${row.studioTrait}"`
    : 'a new dedicated studio trait'
  const actionGoal =
    action === 'resolve'
      ? `Resolve the exact identity of the Glowbuds ${target} before assigning or building it.`
      : action === 'verify'
        ? `Verify whether ${mapping} is the one-to-one 3D match for the Glowbuds ${target}; rename it to the source trait when confirmed, or unmap it and schedule a separate build.`
        : `Build the Glowbuds ${target} as ${mapping} in the composable 3D Trait Studio.`

  return [
    `Goal: ${actionGoal}`,
    `Context: ${buildReferenceLine(samples)} ${profile.implementationNote}`,
    'Deliverable: One reusable code-native trait component and one tracker mapping; do not bundle another source trait into this pass.',
    'Done when: The source identity reads immediately; silhouette and outline are clean; every attachment is intentionally embedded; no mesh floats, pokes through, or becomes visible through an occluder; front, both obliques, back, top, idle, and hop are reviewed.',
    'Boundaries: Preserve all completed traits, shared animation behavior, camera controls, and the one-source-to-one-studio-trait rule. Change approach after two failed cosmetic tweaks and solve persistent fit problems in geometry.',
  ].join('\n')
}

export function getGlowbudsTraitKey(sourceCategory: string, sourceTrait: string) {
  return `${sourceCategory}::${sourceTrait}`
}

export function getGlowbudsReferenceSource() {
  return referenceIndex.source
}

export function getGlowbudsTraitReferences(
  sourceCategory: string,
  sourceTrait: string,
) {
  return referenceByKey.get(getGlowbudsTraitKey(sourceCategory, sourceTrait))?.samples ?? []
}

export function getGlowbudsOneToOneConflicts(rows: GlowbudsTraitTrackerRow[]) {
  const assignments = new Map<string, GlowbudsTraitTrackerRow[]>()

  for (const row of rows) {
    if (!row.studioCategory || !row.studioTrait) continue
    const key = `${row.studioCategory}::${row.studioTrait}`
    const assigned = assignments.get(key) ?? []
    assigned.push(row)
    assignments.set(key, assigned)
  }

  return [...assignments.entries()]
    .filter(([, assigned]) => assigned.length > 1)
    .map(([studioKey, assigned]) => ({ studioKey, rows: assigned }))
}

export function getGlowbudsProductionQueue(rows: GlowbudsTraitTrackerRow[]) {
  return rows
    .filter((row) => row.status !== 'complete')
    .map<GlowbudsProductionQueueItem>((row) => {
      const profile = CATEGORY_PROFILES[row.sourceCategory] ?? {
        order: 99,
        phase: 'Needs classification',
        complexity: 'large' as const,
        batchSize: 1,
        implementationNote: 'Resolve the trait slot and attachment contract before modeling.',
      }
      const action = actionForStatus(row.status)
      const samples = getGlowbudsTraitReferences(row.sourceCategory, row.sourceTrait)
      return {
        key: getGlowbudsTraitKey(row.sourceCategory, row.sourceTrait),
        row,
        action,
        priority: priorityFor(action, profile),
        phase: profile.phase,
        complexity: profile.complexity,
        batchSize: profile.batchSize,
        samples,
        brief: buildProductionBrief(row, action, profile, samples),
      }
    })
    .sort((left, right) => {
      const actionDifference = actionRank(left.action) - actionRank(right.action)
      if (actionDifference !== 0) return actionDifference
      const leftOrder = CATEGORY_PROFILES[left.row.sourceCategory]?.order ?? 99
      const rightOrder = CATEGORY_PROFILES[right.row.sourceCategory]?.order ?? 99
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return (
        (right.row.observedSampleCount ?? 0)
        - (left.row.observedSampleCount ?? 0)
        || left.row.sourceTrait.localeCompare(right.row.sourceTrait)
      )
    })
}
