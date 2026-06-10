import type { LevelData, LevelId } from "../levelTypes"
import { optionDOverworldSeed } from "./overworld.optionD.seed"
import { glowbudWizardCaveSeed } from "./cave.glowbudWizard.seed"

export const seedLevels = [optionDOverworldSeed, glowbudWizardCaveSeed] satisfies LevelData[]

export const seedLevelById: Record<LevelId, LevelData> = {
  "option-d-overworld": optionDOverworldSeed,
  "glowbud-wizard-cave": glowbudWizardCaveSeed,
}

export { optionDOverworldSeed, glowbudWizardCaveSeed }
