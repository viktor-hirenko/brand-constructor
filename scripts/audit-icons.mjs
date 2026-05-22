#!/usr/bin/env node
/**
 * Scans Vue files for inline SVGs and groups duplicates by normalized path geometry.
 * Usage: node scripts/audit-icons.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = join(import.meta.dirname, '..')
const PACKAGES_DIR = join(ROOT, 'packages')
const ICONS_DIR_SEGMENT = `${join('components', 'icons')}${join('/')}`
const outputJson = process.argv.includes('--json')

const svgPattern = /<svg[\s\S]*?<\/svg>/gi
const viewBoxPattern = /viewBox="([^"]+)"/i
const shapePattern = /<(?:path|polyline|polygon|circle|rect|line)[^>]*>/gi

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue
      walk(full, files)
    } else if (entry.endsWith('.vue')) {
      files.push(full)
    }
  }
  return files
}

function normalizeSvgInner(inner) {
  const tags = inner.match(shapePattern) ?? []
  return tags
    .map((tag) =>
      tag
        .replace(/\sclass="[^"]*"/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .sort()
    .join('|')
}

function guessName(svg) {
  if (svg.includes('M20 6 9 17')) return 'check-circle'
  if (svg.includes('M18 6 6 18') && svg.includes('m6 6 12 12')) return 'close'
  if (svg.includes('polyline points="20 6 9 17 4 12"')) return 'check'
  if (svg.includes('rect width="18"') && svg.includes('m21 15')) return 'image-placeholder'
  if (svg.includes('M17.5 10.6323')) return 'chat-bubble'
  if (svg.includes('M7.99985 2.5')) return 'eye'
  const match = svg.match(/d="([^"]{0,32})/)
  return match ? match[1] : 'unknown'
}

const groups = new Map()

for (const file of walk(PACKAGES_DIR)) {
  if (file.includes(ICONS_DIR_SEGMENT)) continue
  const content = readFileSync(file, 'utf8')
  let index = 0
  for (const match of content.matchAll(svgPattern)) {
    index += 1
    const svg = match[0]
    const inner = svg.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>$/i, '')
    const viewBox = viewBoxPattern.exec(svg)?.[1] ?? 'unknown'
    const normalized = normalizeSvgInner(inner)
    const hash = createHash('md5').update(`${viewBox}|${normalized}`).digest('hex').slice(0, 8)
    const rel = relative(ROOT, file)

    if (!groups.has(hash)) {
      groups.set(hash, {
        hash,
        suggestedName: guessName(svg),
        viewBox,
        count: 0,
        files: [],
      })
    }

    const group = groups.get(hash)
    group.count += 1
    group.files.push({ file: rel, index })
  }
}

const inventory = [...groups.values()].sort((a, b) => b.count - a.count)

if (outputJson) {
  console.log(JSON.stringify(inventory, null, 2))
} else {
  console.log(`Inline SVG audit (${inventory.length} unique icons)\n`)
  for (const item of inventory) {
    console.log(`${String(item.count).padStart(2)}x  ${item.suggestedName}  viewBox=${item.viewBox}  hash=${item.hash}`)
    for (const { file } of item.files.slice(0, 4)) {
      console.log(`     ${file}`)
    }
    if (item.files.length > 4) {
      console.log(`     ... +${item.files.length - 4} more`)
    }
    console.log('')
  }
}
