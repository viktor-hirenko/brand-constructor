import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { phosphorPaths } from '@brand-constructor/shared'

/*
 * DP-15859 — the glyphs of the Admin sidebar.
 *
 * The designer's mapping table `5658:39246`, section "Admin sidebar", gives
 * five rows `Use case · Current · → · Phosphor name · Weight`; `Users` has no
 * row and the owner chose Phosphor `Users` for it. Sidebar `5382:30672` draws
 * each glyph 20×20 with the label 8 after it.
 *
 * What is pinned is the BINDING, not a mention: for each menu label, the
 * identifier in its `icon:` field must be imported from exactly that file of
 * `@phosphor-icons/core`, and the folder in the path is the weight. Swapping
 * two imports, pointing one at `fill/`, or putting an HTML entity back into a
 * row turns this file red.
 */

const SOURCE = readFileSync(
  resolve(__dirname, '../../../src/components/ui/AppSidebar.vue'),
  'utf8',
)
const TEMPLATE = SOURCE.slice(SOURCE.indexOf('<template>'), SOURCE.lastIndexOf('</template>'))
const STYLE = SOURCE.slice(SOURCE.indexOf('<style'))

/** `5658:39246` "Admin sidebar" rows, plus the owner's `Users`. */
const EXPECTED: ReadonlyArray<readonly [label: string, file: string]> = [
  ['Бренди', 'regular/tag.svg'],
  ['Концепти', 'regular/lightbulb.svg'],
  ['Неймінги', 'regular/text-aa.svg'],
  ['PR-пакети', 'regular/megaphone.svg'],
  ['UI-компоненти', 'regular/squares-four.svg'],
  ['Користувачі', 'regular/users.svg'],
]

/** identifier → path inside `@phosphor-icons/core`, from the import lines. */
function phosphorImports(source: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of source.matchAll(
    /^import\s+(\w+)\s+from\s+'@phosphor-icons\/core\/([\w/-]+\.svg)\?raw'/gm,
  )) {
    out.set(m[1], m[2])
  }
  return out
}

/** menu label → identifier in its `icon:` field. */
function navIcons(source: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of source.matchAll(/\{\s*label:\s*'([^']+)',[^}]*?\bicon:\s*(\w+)\b/g)) {
    out.set(m[1], m[2])
  }
  return out
}

describe('AppSidebar — Phosphor glyphs from the mapping table', () => {
  const imports = phosphorImports(SOURCE)
  const icons = navIcons(SOURCE)

  it('has exactly the six menu rows, no more and no fewer', () => {
    expect([...icons.keys()]).toEqual(EXPECTED.map(([label]) => label))
  })

  it.each(EXPECTED)('%s is bound to @phosphor-icons/core/%s', (label, file) => {
    const id = icons.get(label)
    expect(id, `no icon identifier for "${label}"`).toBeDefined()
    expect(imports.get(id!)).toBe(file)
  })

  it('draws every one of them in weight Regular', () => {
    for (const file of imports.values()) expect(file.startsWith('regular/')).toBe(true)
  })

  it('points at files that exist in the package and are Phosphor glyphs', () => {
    const require = createRequire(resolve(__dirname, '../../../package.json'))
    for (const file of imports.values()) {
      const svg = readFileSync(require.resolve(`@phosphor-icons/core/${file}`), 'utf8')
      expect(phosphorPaths(svg).length).toBeGreaterThan(0)
    }
  })

  it('closes the collapsed menu with Phosphor X Regular, not the ✕ character', () => {
    // "Close → X, Regular" of `5658:39246`; the button only shows below 1280.
    expect(imports.get('close')).toBe('regular/x.svg')
    expect(TEMPLATE).toMatch(/<PhosphorIcon\s+:svg="close"\s+class="sidebar__close-icon"/)
    expect(TEMPLATE).not.toContain('✕')
  })

  it('carries no HTML-entity glyph and no v-html any more', () => {
    expect(SOURCE).not.toMatch(/icon:\s*'/)
    expect(SOURCE).not.toMatch(/&#\d+;/)
    expect(TEMPLATE).not.toContain('v-html')
    expect(TEMPLATE).toMatch(/<PhosphorIcon\s+:svg="item\.icon"\s+class="sidebar__link-icon"/)
  })

  it('sizes the glyph 20×20 and sets the label 8 after it (`5382:30672`)', () => {
    const icon = STYLE.match(/&__link-icon\s*\{([^}]*)\}/)
    expect(icon).not.toBeNull()
    expect(icon![1]).toMatch(/\bwidth:\s*20px;/)
    expect(icon![1]).toMatch(/\bheight:\s*20px;/)
    const link = STYLE.match(/&__link\s*\{([^{}]*)/)
    expect(link).not.toBeNull()
    expect(link![1]).toMatch(/\bgap:\s*\$spacing-2;/)
  })
})

describe('phosphorPaths', () => {
  it('returns every path of a Phosphor file in order', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">' +
      '<path d="M1,1Z" opacity="0.2"/><path d="M2,2Z"/></svg>'
    expect(phosphorPaths(svg)).toEqual(['M1,1Z', 'M2,2Z'])
  })

  it('refuses a file that is not a Phosphor glyph', () => {
    expect(() => phosphorPaths('<svg viewBox="0 0 24 24"><path d="M0Z"/></svg>')).toThrow()
    expect(() => phosphorPaths('<svg viewBox="0 0 256 256"></svg>')).toThrow()
  })
})
