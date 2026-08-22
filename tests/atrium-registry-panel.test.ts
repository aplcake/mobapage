import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const panelSource = readFileSync(new URL('../src/museum/formal-room/AtriumRegistryPanel.tsx', import.meta.url), 'utf8')
const stylesSource = readFileSync(new URL('../src/museum/formal-room/AtriumRegistryPanel.module.css', import.meta.url), 'utf8')

describe('one-step personal atrium builder', () => {
  it('builds the safe default atrium automatically and keeps customization secondary', () => {
    expect(panelSource).toContain("type PanelView = 'quick' | 'customize'")
    expect(panelSource).toContain("useState<PanelView>('quick')")
    expect(panelSource).toContain('automatic: true')
    expect(panelSource).toContain('void installSelection({')
    expect(panelSource).toContain('Connect once. We build the atrium.')
    expect(panelSource).toContain('Building your atrium…')
    expect(panelSource).not.toContain('Install Atrium')
    expect(panelSource).toContain("setView('customize')")
    expect(panelSource).toContain('installedAddress === address')
    expect(panelSource).toContain("atriumIsLive ? 'Your atrium is alive.'")
    expect(panelSource.indexOf('void installSelection({')).toBeLessThan(panelSource.indexOf('if (!open) return null'))
    expect(panelSource).not.toContain("type PanelView = 'garden' | 'walls' | 'review'")
    expect(panelSource).not.toContain('Review installation')
    expect(panelSource).not.toContain('Next: choose art')
  })

  it('shows a spatial preview made from the selected collection', () => {
    expect(panelSource).toContain('function AtriumDiorama(')
    expect(panelSource).toContain('selectedResidents')
    expect(panelSource).toContain('selectedWallArtworks')
    expect(stylesSource).toContain('perspective: 820px')
    expect(stylesSource).toContain('.dioramaWall')
    expect(stylesSource).toContain('.residentStage')
  })

  it('installs only the server-rechecked safe subset', () => {
    expect(panelSource).toContain('const safeIdentities = [...result.installation.glowbuds, ...result.installation.artworks]')
    expect(panelSource).toContain('Unavailable items were safely skipped')
    expect(panelSource).toContain('body.assets.filter((asset) => Boolean(asset.imageUrl))')
    expect(panelSource).toContain('onError={() => markMediaUnavailable(asset.key)}')
    expect(panelSource).toContain("setLiveMessage('One unavailable preview was removed from the installation.')")
    expect(panelSource).not.toContain('const installedAssets = [...glowbuds, ...wallArt]')
  })

  it('does not offer unusable customization when the wallet has no compatible assets', () => {
    expect(panelSource).toContain("if (!defaultGlowbudKeys.length && !defaultArtworkKeys.length) {")
    expect(panelSource).toContain('No compatible atrium pieces were found.')
    expect(panelSource).toContain("{readyCount ? <button type=\"button\" className={styles.customizeButton}")
  })

  it('keeps public-address entry behind a secondary disclosure', () => {
    expect(panelSource).toContain('<details className={styles.publicAccess}>')
    expect(panelSource).toContain('<summary>Use a public address</summary>')
    expect(panelSource).toContain('No signature · no transaction')
  })
})
