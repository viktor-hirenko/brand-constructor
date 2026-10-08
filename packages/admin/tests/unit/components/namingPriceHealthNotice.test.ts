import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * The line above the namings table on a night the price check did not reach a
 * marketplace (docs/architecture/domain-price-sync-plan.md, 08.10). A silent
 * marketplace changes no record, so without the line a stale price looks like
 * a checked one. `packages/admin` mounts no components in tests, so this guard
 * reads the markup — and the one thing the owner will not take: a block that
 * arrives after the table and pushes its rows down.
 */

const read = (path: string) => readFileSync(resolve(__dirname, '../../../src', path), 'utf8')
const NOTICE = read('components/namings/NamingPriceHealthNotice.vue')
const VIEW = read('views/NamingsView.vue')

describe('the price check’s line above the namings table', () => {
  it('a good night draws nothing', () => {
    expect(NOTICE).toContain('v-if="health?.problems.length"')
  })

  it('the sentences are the server’s — the same ones Slack gets', () => {
    expect(NOTICE).toContain('{{ problem.text }}')
    expect(NOTICE).toContain('role="status"')
  })

  it('stands above the External Naming table only, and only once the answer is in', () => {
    expect(VIEW).toContain(
      `<NamingPriceHealthNotice v-if="activeTab === 'external' && !priceHealthPending" :health="priceHealth" />`
    )
    expect(VIEW.indexOf('<NamingPriceHealthNotice')).toBeLessThan(VIEW.indexOf('<table class="namings-view__table"'))
  })

  it('the table waits for it, so the line comes with the rows and moves nothing', () => {
    expect(VIEW).toContain(`activeTab === 'external' ? extLoading || priceHealthPending : intLoading`)
  })

  it('a request that failed does not hold the table', () => {
    const load = VIEW.slice(VIEW.indexOf('async function loadPriceHealth()'), VIEW.indexOf('onMounted(() => {'))
    expect(load).toMatch(/catch \{\s*priceHealth\.value = null/)
    expect(load).toMatch(/finally \{\s*priceHealthPending\.value = false/)
    expect(VIEW).toMatch(/onMounted\(\(\) => \{[^}]*loadPriceHealth\(\)/)
  })
})
