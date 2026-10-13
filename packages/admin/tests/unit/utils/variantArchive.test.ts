import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VARIANT_STATUS_TABS, isArchivedVariant, variantArchiveAction } from '@/utils/variantArchive'

/*
 * DP-15450, visual components 5 — the last open remark of the designer's board:
 * «У варіантах Sidebar, Banners і Thumbnails досі доступні старі кольорові
 * варіанти компонентів. → Прибрати застарілі варіанти та залишити тільки
 * актуальні компоненти.»
 *
 * The library had one way to take a variant away, «Видалити», and it erases
 * the row: every brief that had picked the variant then shows its id instead
 * of its name and loses the layer in the phone preview. Four briefs of
 * production had picked the coloured ones.
 *
 * So a variant is put AWAY, not erased. The wizard's step 7 already leaves out
 * `archived` variants, while the review and the preview read all of them — an
 * archived variant is gone from the choice and stays in the briefs that have
 * it. The server has taken `status: 'archived'` all along; what was missing was
 * the button. The owner, 13.10: «Добавь архив, как ты написал».
 */

describe('a variant in the archive', () => {
  it('is told by its status alone', () => {
    expect(isArchivedVariant({ status: 'archived' })).toBe(true)
    expect(isArchivedVariant({ status: 'active' })).toBe(false)
    expect(isArchivedVariant({ status: 'used' })).toBe(false)
    expect(isArchivedVariant({ status: 'draft' })).toBe(false)
  })

  it('an active variant is offered the way into the archive', () => {
    expect(variantArchiveAction({ status: 'active' })).toEqual({ label: 'В архів', status: 'archived' })
  })

  it('an archived one — the way back, to the choice of step 7', () => {
    expect(variantArchiveAction({ status: 'archived' })).toEqual({ label: 'Повернути з архіву', status: 'active' })
  })

  it('a variant a brand has taken is not offered either: it is out of the choice already, and «active» would hand it out twice', () => {
    expect(variantArchiveAction({ status: 'used' })).toBeNull()
    expect(variantArchiveAction({ status: 'draft' })).toBeNull()
  })
})

describe('the tabs of the page', () => {
  it('all, the ones still on offer, and the archive — each is a filter the server knows', () => {
    expect(VARIANT_STATUS_TABS).toEqual([
      { status: 'all', label: 'Усі' },
      { status: 'active', label: 'Не використані' },
      { status: 'archived', label: 'В архіві' },
    ])
  })
})

describe('ComponentVariantsView puts a variant away and brings it back', () => {
  const SOURCE = readFileSync(resolve(__dirname, '../../../src/views/ComponentVariantsView.vue'), 'utf8')
  const TEMPLATE = SOURCE.slice(SOURCE.indexOf('<template>'), SOURCE.lastIndexOf('</template>'))

  it('by changing the status — the row stays, the briefs that picked it keep it', () => {
    const fn = SOURCE.slice(SOURCE.indexOf('async function toggleArchive('))
    const body = fn.slice(0, fn.indexOf('\n}\n'))
    expect(body).toContain('await apiPut(`/api/components/variants/${v.id}`, { status: action.status })')
    expect(body).not.toContain('apiDelete')
    // A refused change says so instead of leaving the card as it was in silence.
    expect(body).toContain("showError(err, 'save')")
  })

  it('the button is for those who may change the library, and says which way it goes', () => {
    expect(TEMPLATE).toMatch(/v-if="variantArchiveAction\(v\)"[\s\S]*?@click="toggleArchive\(v\)"[\s\S]*?\{\{ variantArchiveAction\(v\)\?\.label \}\}/)
    const actions = TEMPLATE.slice(TEMPLATE.indexOf('class="variant-card__actions"'))
    expect(TEMPLATE.slice(TEMPLATE.indexOf('<div v-if="canWrite" class="variant-card__actions">'))).toContain('toggleArchive(v)')
    expect(actions).toContain('Видалити')
  })

  it('an archived card says what that means', () => {
    expect(TEMPLATE).toMatch(/'variant-card--archived': isArchivedVariant\(v\)/)
    expect(TEMPLATE).toMatch(/v-if="isArchivedVariant\(v\)"[^>]*class="variant-card__archived"/)
    expect(TEMPLATE).toContain('Не пропонується на кроці Interface Components. У брифах, де його вже обрано, залишається.')
  })

  it('the tabs are the three filters', () => {
    expect(TEMPLATE).toMatch(/v-for="tab in VARIANT_STATUS_TABS"[\s\S]*?@click="statusFilter = tab\.status"/)
  })
})
