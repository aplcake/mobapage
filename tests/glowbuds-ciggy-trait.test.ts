import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workspaceRoot = process.cwd()
const avatarSource = readFileSync(
  resolve(workspaceRoot, 'docs/asset-generation/code-examples/RedShellIdleCritterAsset.example.tsx'),
  'utf8',
)
const mappingSource = readFileSync(
  resolve(workspaceRoot, 'docs/asset-generation/preview/red-shell/glowbudsDisplayMapping.ts'),
  'utf8',
)
const trackerData = JSON.parse(
  readFileSync(
    resolve(workspaceRoot, 'docs/asset-generation/preview/red-shell/glowbudsTraitTrackerData.json'),
    'utf8',
  ),
) as {
  rows: Array<{
    sourceCategory: string
    sourceTrait: string
    studioTrait?: string
    status: string
    notes: string
  }>
}

describe('Glowbuds Ciggy mouth trait', () => {
  it('keeps one exact query-loadable Ciggy mapping', () => {
    const ciggyRows = trackerData.rows.filter(
      (row) => row.sourceCategory === 'Mouth' && row.sourceTrait === 'Ciggy',
    )

    expect(ciggyRows).toHaveLength(1)
    expect(ciggyRows[0]).toMatchObject({ studioTrait: 'Ciggy', status: 'complete' })
    expect(mappingSource).toContain("'Mouth::Ciggy': mapping('mouth', 'Ciggy', { mouth: 'ciggy' })")
  })

  it('uses dimensional sections, a true endpoint ember, and depth-safe animated smoke', () => {
    const ciggyStart = avatarSource.indexOf('type CigarettePoint')
    const ciggyEnd = avatarSource.indexOf('function WoozyMouth', ciggyStart)
    const ciggySource = avatarSource.slice(ciggyStart, ciggyEnd)

    expect(ciggyStart).toBeGreaterThan(-1)
    expect(ciggyEnd).toBeGreaterThan(ciggyStart)
    expect(ciggySource).toContain('function CigaretteSegment')
    expect(ciggySource).toContain('function CiggySmoke')
    expect(ciggySource).toContain('function CiggyMouth')
    expect(ciggySource).toContain('start={mouthRoot}')
    expect(ciggySource).toContain('end={tip}')
    expect(ciggySource).toContain('<pointLight color="#ff7a35"')
    expect(ciggySource).toContain('hop.airborne * 0.012')
    expect(ciggySource).not.toContain('hop.arc')
  })
})
