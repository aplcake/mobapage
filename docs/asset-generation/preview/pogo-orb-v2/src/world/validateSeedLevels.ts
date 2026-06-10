import { formatValidationResult, validateProjectLevels } from "./debugValidation"
import { seedLevels } from "./levels/index.seed"

export function validateSeedLevels(): string {
  return validateProjectLevels(seedLevels)
    .map(formatValidationResult)
    .join("\n\n")
}
