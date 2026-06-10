import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'docs', 'validation')
const OUT_FILE = path.join(OUT_DIR, 'lab-boundary-check.json')
const SOURCE_FILE_RE = /\.(?:tsx?|jsx?|mjs)$/

const LABS = {
  vacuum: {
    label: 'Vacuum lab',
    root: 'src/vacuum',
    routes: ['app/vacuum-lab/page.tsx'],
    entry: 'src/vacuum/VacuumLab.tsx',
    forbidden: ['src/liquid', 'src/experiment'],
  },
  slime: {
    label: 'Locked slime prototype',
    root: 'src/liquid',
    routes: ['app/slime-prototype/page.tsx'],
    entry: 'src/liquid/LockedSlimePrototype.tsx',
    forbidden: ['src/vacuum', 'src/experiment'],
  },
  experiment: {
    label: 'Experimental lab',
    root: 'src/experiment',
    routes: ['app/experiment-lab/page.tsx'],
    entry: 'src/experiment/ExperimentLab.tsx',
    forbidden: ['src/vacuum', 'src/liquid'],
  },
}

const REQUIRED_BOUNDARY_DOCS = [
  'docs/LAB_OWNERSHIP.md',
  'docs/agent-briefs/README.md',
  'docs/agent-briefs/VACUUM_AGENT.md',
  'docs/agent-briefs/SLIME_AGENT.md',
  'docs/agent-briefs/EXPERIMENT_AGENT.md',
  'app/AGENTS.md',
  'src/AGENTS.md',
  'src/vacuum/AGENTS.md',
  'src/liquid/AGENTS.md',
  'src/experiment/AGENTS.md',
]

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function relativeToRoot(filePath) {
  return normalize(path.relative(ROOT, filePath))
}

function isWithin(candidate, ownerRoot) {
  return candidate === ownerRoot || candidate.startsWith(`${ownerRoot}/`)
}

async function exists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath))
    return true
  } catch {
    return false
  }
}

async function listFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir)
  const entries = await readdir(absoluteDir, { withFileTypes: true }).catch(() => [])
  const files = []

  for (const entry of entries) {
    const relativeEntry = normalize(path.join(relativeDir, entry.name))
    if (entry.isDirectory()) {
      files.push(...await listFiles(relativeEntry))
    } else if (SOURCE_FILE_RE.test(entry.name)) {
      files.push(relativeEntry)
    }
  }

  return files
}

function extractImports(source) {
  const specs = new Set()
  const importExportRe = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s*)?['"]([^'"]+)['"]/g
  const dynamicImportRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  for (const match of source.matchAll(importExportRe)) {
    specs.add(match[1])
  }
  for (const match of source.matchAll(dynamicImportRe)) {
    specs.add(match[1])
  }

  return Array.from(specs)
}

function resolveLocalImport(fromFile, specifier) {
  if (specifier.startsWith('@/')) {
    return normalize(path.join('src', specifier.slice(2)))
  }
  if (!specifier.startsWith('.')) return null
  return relativeToRoot(path.resolve(ROOT, path.dirname(fromFile), specifier))
}

async function importsForFile(file) {
  const source = await readFile(path.join(ROOT, file), 'utf8')
  return extractImports(source)
    .map((specifier) => ({ specifier, resolved: resolveLocalImport(file, specifier) }))
    .filter((item) => item.resolved)
}

function owningLabForImport(resolved) {
  for (const [labName, lab] of Object.entries(LABS)) {
    if (isWithin(resolved, lab.root)) return labName
  }
  return null
}

const violations = []
const labFileCounts = {}

for (const [labName, lab] of Object.entries(LABS)) {
  const files = await listFiles(lab.root)
  labFileCounts[labName] = files.length

  if (!(await exists(lab.entry))) {
    violations.push(`${lab.label} entry is missing: ${lab.entry}`)
  }

  for (const file of files) {
    const imports = await importsForFile(file)
    for (const item of imports) {
      const forbiddenRoot = lab.forbidden.find((blockedRoot) => isWithin(item.resolved, blockedRoot))
      if (forbiddenRoot) {
        violations.push(`${file} imports ${item.specifier}, crossing into ${forbiddenRoot}`)
      }
    }
  }
}

for (const [labName, lab] of Object.entries(LABS)) {
  for (const route of lab.routes) {
    const imports = await importsForFile(route)
    const importedLabs = imports
      .map((item) => ({ ...item, labName: owningLabForImport(item.resolved) }))
      .filter((item) => item.labName)

    if (!importedLabs.some((item) => item.labName === labName)) {
      violations.push(`${route} does not import its owning ${lab.label} entry`)
    }

    for (const item of importedLabs) {
      if (item.labName !== labName) {
        violations.push(`${route} imports ${item.specifier}, crossing from ${labName} route into ${item.labName}`)
      }
    }
  }
}

for (const requiredDoc of REQUIRED_BOUNDARY_DOCS) {
  if (!(await exists(requiredDoc))) {
    violations.push(`Missing boundary handoff file: ${requiredDoc}`)
  }
}

const payload = {
  pass: violations.length === 0,
  labs: Object.fromEntries(
    Object.entries(LABS).map(([labName, lab]) => [
      labName,
      {
        root: lab.root,
        routes: lab.routes,
        entry: lab.entry,
        filesChecked: labFileCounts[labName] ?? 0,
        mayNotImport: lab.forbidden,
      },
    ]),
  ),
  requiredBoundaryDocs: REQUIRED_BOUNDARY_DOCS,
  violations,
}

await mkdir(OUT_DIR, { recursive: true })
await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`)

if (!payload.pass) {
  console.error(JSON.stringify(payload, null, 2))
  process.exit(1)
}

console.log(JSON.stringify(payload, null, 2))
