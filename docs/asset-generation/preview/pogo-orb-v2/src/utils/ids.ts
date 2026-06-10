export function makeId(prefix: string, label: string): string {
  return `${prefix}-${slugify(label)}`
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function assertUniqueIds(items: Array<{ id: string }>, groupName: string): string[] {
  const seen = new Set<string>()
  const duplicates: string[] = []

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.push(`${groupName}: ${item.id}`)
    }
    seen.add(item.id)
  }

  return duplicates
}
