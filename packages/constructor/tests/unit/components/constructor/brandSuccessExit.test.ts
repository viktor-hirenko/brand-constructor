import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The success screen's third button (owner 30.09): inside the Admin the old
 * «Повернутись на головну» sent the frame to the wizard's own landing — a page
 * from the standalone days with no way back to the list. The Admin's home is
 * Brands, and the header cross already gets there through `postClose`.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const view = readFileSync(`${SRC}views/BrandSuccessView.vue`, 'utf8')

/** Everything below the doc comments — so a word quoted in prose is not a hit. */
const code = view.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')

function handlerBody(name: string): string {
  const start = code.indexOf(`function ${name}(`)
  expect(start).toBeGreaterThan(-1)
  return code.slice(start, code.indexOf('\n}', start))
}

describe('success screen — the way out goes to the brand list', () => {
  it('names the button after where it goes', () => {
    expect(code).toContain('До списку брендів')
    expect(code).not.toContain('Повернутись на головну')
  })

  it('closes the wizard the same way the header cross does when embedded', () => {
    const body = handlerBody('handleBackToBrands')
    expect(body).toContain('isEmbedded()')
    expect(body).toContain('postClose()')
    // The landing is only the fallback outside the Admin, after the embedded return.
    expect(body.indexOf('postClose()')).toBeLessThan(body.indexOf("router.push('/')"))
    expect(code).toContain('@click="handleBackToBrands"')
  })

  it('keeps «Створити новий бриф» on a clean step 1', () => {
    const body = handlerBody('handleNewBrief')
    expect(body).toContain('store.reset()')
    expect(body).toContain("router.push('/constructor/step/1')")
  })
})
