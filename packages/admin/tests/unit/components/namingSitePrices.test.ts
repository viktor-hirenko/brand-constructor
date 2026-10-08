import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * The three marketplaces' prices stand in the create and edit windows
 * themselves (docs/architecture/domain-price-sync-plan.md, 08.10). The owner
 * typed a domain, saw no price, and could not find the card behind the table
 * that had it — twice. `packages/admin` mounts no components in tests, so this
 * guard reads the markup: a window that stops passing its domain to the block
 * loses the prices without any other test noticing.
 */

const src = (path: string) => resolve(__dirname, '../../../src', path)
const read = (path: string) => readFileSync(src(path), 'utf8')
const template = (source: string) => source.slice(source.indexOf('<template>'), source.lastIndexOf('</template>'))

const FIELD = read('components/namings/NamingDomainModeField.vue')
const BLOCK = read('components/namings/NamingSitePrices.vue')
const VIEW = template(read('views/NamingsView.vue'))
// The version with orders keeps the create window in its own file.
const CREATE = existsSync(src('components/library/NamingCreateModal.vue'))
  ? template(read('components/library/NamingCreateModal.vue'))
  : VIEW

/** The opening tag of the field whose radio group has this name. */
function fieldTag(markup: string, name: string): string {
  const at = markup.indexOf(`name="${name}"`)
  expect(at, name).toBeGreaterThan(-1)
  return markup.slice(markup.lastIndexOf('<NamingDomainModeField', at), markup.indexOf('/>', at))
}

describe('the marketplaces’ prices in the create and edit windows', () => {
  it('the field both windows share shows the block for the domain it is given', () => {
    const markup = template(FIELD)
    expect(markup).toContain('<NamingSitePrices')
    expect(markup).toContain(':domain="domain"')
    expect(markup).toContain(':saved-sources="savedSources"')
  })

  it('the create window passes the domain being typed', () => {
    expect(fieldTag(CREATE, 'create-domain-mode')).toMatch(/:domain="(newDomain|domain)"/)
  })

  it('the edit window passes the domain and what the last check stored, so a saved domain is not asked about again', () => {
    const tag = fieldTag(VIEW, 'edit-domain-mode')
    expect(tag).toContain(':domain="editDomain"')
    expect(tag).toContain(':saved-domain="editSavedDomain"')
    expect(tag).toContain(':saved-sources="editSavedSources"')
  })

  it('the block asks the server’s preview, waits for the typing to stop, and is silent for a saved or a free domain', () => {
    expect(BLOCK).toContain("'/api/namings/external/preview-price'")
    expect(BLOCK).toMatch(/setTimeout\(\(\) => void ask\(domain\), WAIT_MS\)/)
    expect(BLOCK).toMatch(/if \(off\.value \|\| props\.free \|\| saved\.value \|\| !looksLikeDomain\(domain\)\) return/)
  })

  // The window must not move while a domain is typed (the owner, 08.10: four
  // jumps, +181 px, the field he typed in went up 91 px). So nothing here
  // appears late: the frame, its three rows and the line under the field are
  // in the window from the start, and only their content changes.
  it('the frame is always rendered — only the server’s «switched off» removes it', () => {
    const markup = template(BLOCK)
    expect(markup.match(/v-if="([^"]+)"[^>]*class="site-prices"/)?.[1]).toBe('!off')
    expect(markup).toContain('v-for="row in rows"')
    expect(markup).toContain('site-prices__bone')
    expect(BLOCK).toMatch(/&__summary \{[^}]*min-height: calc\(#\{\$line\} \* 2\)/)
    expect(BLOCK).toMatch(/&__row \{[^}]*height: \$line/)
  })

  it('the line under the domain field is always rendered and one row tall, in both windows', () => {
    for (const [markup, style, name] of [
      [CREATE, CREATE === VIEW ? read('views/NamingsView.vue') : read('components/library/NamingCreateModal.vue'), 'create'],
      [VIEW, read('views/NamingsView.vue'), 'edit'],
    ] as const) {
      const tags = markup.match(/<div[^>]*class="[a-z-]+__domain-preview"[^>]*>/g) ?? []
      expect(tags.length, name).toBeGreaterThan(0)
      for (const tag of tags) expect(tag, name).not.toContain('v-if')
      expect(style, name).toMatch(/&__domain-preview \{[^}]*min-height: 28px/)
    }
  })
})

