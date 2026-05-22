#!/usr/bin/env node
/**
 * Fails if inline <svg> is found outside components/icons/ in Vue files.
 * Usage: node scripts/check-inline-icons.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const PACKAGES_DIR = join(ROOT, 'packages')
const ICONS_DIR_SEGMENT = `${join('components', 'icons')}${join('/')}`

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

const violations = []

for (const file of walk(PACKAGES_DIR)) {
  if (file.includes(ICONS_DIR_SEGMENT)) continue
  const content = readFileSync(file, 'utf8')
  if (/<svg[\s>]/i.test(content)) {
    violations.push(relative(ROOT, file))
  }
}

if (violations.length > 0) {
  console.error(`Found inline SVG in ${violations.length} file(s) outside components/icons/:\n`)
  for (const file of violations) {
    console.error(`  - ${file}`)
  }
  process.exit(1)
}

console.log('No inline SVG violations found outside components/icons/.')
