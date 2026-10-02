import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ── DP-15450, work 04: the concept edit screen opened from the final review ──
 *
 * Her two remarks:
 *
 *   Final review 3 · HIGH — «При переході з Final Review у редагування Concept
 *   Selection лейаут сторінки відображається некоректно. → Незалежно від точки
 *   входу сторінка редагування має мати той самий лейаут і пропорції колонок,
 *   що й при звичайному переході на цей крок.»
 *
 *   Final review 4 · MEDIUM — «При переході з Final Review у редагування
 *   Concept Selection відсутня можливість замовити новий концепт. → Додати
 *   кнопку "Замовити новий концепт", як у звичайному сценарії цього кроку.»
 *
 * **THE TWO DRAWINGS ARE OF TWO DIFFERENT SCREENS, AND THIS FILE IS WHERE THAT
 * IS WRITTEN DOWN.** The tracker used to say the edit screen lays concepts out
 * in two fixed columns and therefore "argues" with the board. It does not:
 *
 *   - `4492:27189` — the pair «Ваш попередній вибір» / «Вибір CEO»
 *     (`4492:27194`, two 246 frames at x=0 and x=254). That is the screen
 *     entered AFTER the CEO proposed a concept: `RevisionConceptView`
 *     (`po-edit/*`). `EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS` lives there and
 *     nowhere else, and this file pins that it stays;
 *   - `4463:15952` — in her section `4463:14684` («Product view / Edit Concept
 *     & External name»), where a red arrow runs from the review's «Редагувати»
 *     into it. No pair at all: the theme switch on its own row (219×40 at y=0),
 *     the grid (5 cards of 161,33 three to a row), a 222×40 order button at
 *     y=418,67, the comment Input at y=586,67. That is THIS screen, and it
 *     agrees with the board.
 *
 * So the owner's blocking question resolved by measurement rather than by a
 * choice. Owner, 29.09: «Делай так, как просит дизайнер, так, как она
 * нарисовала.»
 *
 * Tests read the SOURCE: `vitest.config.ts` runs in `node`, and the edit view
 * cannot be mounted there (it reaches for the router and the API on setup).
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

const draftEdit = read('views/draft-edit/DraftConceptEditView.vue')
const step2 = read('views/wizard/ConceptSelectionView.vue')
const revisionEdit = read('views/revision-response/RevisionConceptView.vue')
const editFlowLayout = read('constants/editFlowLayout.ts')
const paneMetrics = read('composables/useWizardPaneMetrics.ts')

/** The template half of a single-file component — comments carry her node ids. */
const templateOf = (source: string) => source.slice(source.indexOf('<template>'))

describe('Final review 3 — the edit screen is laid out like the step itself', () => {
  it('the theme switch stands on its own row, with no section label beside it', () => {
    const tpl = templateOf(draftEdit)
    expect(tpl).not.toContain('EditFlowSectionLabel')
    expect(tpl).not.toContain('Концепти<')
    expect(draftEdit).not.toContain('EditFlowSectionLabel')
  })

  it('nothing caps that row at 506 any more', () => {
    // `max-w-[31.625rem]` is 31,625 × 16 = 506, while the column's content is
    // 527 at 1440 and 815 at 1920 — the switch stopped short of the grid's
    // right edge and the gap widened with the window.
    expect(templateOf(draftEdit)).not.toContain('max-w-[31.625rem]')
  })

  /**
   * The BINDING, again — swapping this class for a hand-written two-column grid
   * left the import line in place and the first cut of this test green.
   */
  it('the block around switch, grid and button is the step-2 one: gap-4', () => {
    expect(templateOf(draftEdit)).toContain(
      ':class="EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS"'
    )
    expect(editFlowLayout).toContain(
      "export const EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS = 'gap-4'"
    )
    expect(templateOf(step2)).toContain('flex flex-col gap-4')
  })

  it('and nothing on this screen lays concepts out in two fixed columns', () => {
    expect(templateOf(draftEdit)).not.toContain('grid-cols-2')
  })

  it('both screens draw the cards with the same grid component', () => {
    for (const source of [draftEdit, step2]) {
      expect(source).toContain(
        "import ConceptGrid from '@/components/constructor/alternative-selection/ConceptGrid.vue'"
      )
    }
  })

  it('both screens get their column widths from the same measurement, which never asks the layout mode', () => {
    expect(paneMetrics).not.toContain('layoutMode')
    expect(paneMetrics).toContain('resolveWizardPaneGeometry')
  })

  it('the empty list reads the same on both screens', () => {
    for (const source of [draftEdit, step2]) {
      expect(source).toContain('Концептів поки немає. Створіть новий.')
    }
  })
})

describe('Final review 4 — ordering a new concept is offered here too', () => {
  /**
   * **Pin the element, not the import line.** The first cut of this test was
   * happy with the import plus the two label strings, and a mutation that
   * renamed the TAG — leaving import and props untouched, so the button never
   * rendered — went green. Same trap as the constant that an import line also
   * names (work 7). So: find the actual element, then read its props out of it.
   */
  it('the order button is rendered on the screen, with the step-2 labels', () => {
    expect(draftEdit).toContain(
      "import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'"
    )

    const element = templateOf(draftEdit).match(/<BriefOrderButton\b[\s\S]*?\/>/)
    expect(element, 'no <BriefOrderButton> element in the template').not.toBeNull()

    const [tag] = element as RegExpMatchArray
    expect(tag).toContain('create-label="Замовити новий концепт"')
    expect(tag).toContain('created-label="Бриф концепту створено"')
    expect(tag).toContain(':is-created="isCreatingNew"')
  })

  it('all four of its actions are wired on that element, not just "create"', () => {
    const [tag] = templateOf(draftEdit).match(/<BriefOrderButton\b[\s\S]*?\/>/) as RegExpMatchArray
    for (const handler of ['@create=', '@view=', '@edit=', '@delete=']) {
      expect(tag).toContain(handler)
    }
    expect(tag).toContain("store.openBriefPreview('concept', { allowEdit: !orderLocked })")
    // brief «В роботі»: no new order, the existing one is view-only
    expect(tag).toContain(':locked="orderLocked"')
  })

  /**
   * `toContain('<NewConceptModal')` was green when the tag was renamed to
   * `<NewConceptModalXX` — the old name is a PREFIX of the new one. Third way
   * this file found to be green on a broken screen, so the tag names are
   * matched with a boundary.
   */
  it('the brief modal and both confirmations came with it', () => {
    const tpl = templateOf(draftEdit)
    expect(tpl).toMatch(/<NewConceptModal[\s/>]/)
    expect(tpl.match(/<ConfirmationModal[\s/>]/g) ?? []).toHaveLength(2)
    expect(tpl).toContain('Видалити бриф?')
    expect(tpl).toContain('Обрати цей концепт?')
  })

  it('picking a card while a brief exists asks first, as on step 2', () => {
    expect(draftEdit).toContain('function confirmSwitchSelection()')
    expect(draftEdit).toContain('showSwitchConfirm.value = true')
  })

  it('«Далі» still counts an ordered brief as a valid pick', () => {
    expect(draftEdit).toContain(
      'const primaryDisabled = computed(() => !selectedId.value && !hasBrief.value)'
    )
  })
})

describe('the OTHER edit screen — the one after the CEO proposed a concept — is untouched', () => {
  /**
   * Bound, not merely imported — an import line names the constant too, so
   * `toContain` on the file would stay green while the template stopped using
   * it. Both of her pair blocks («Ваш попередній вибір», «Вибір CEO») carry it.
   */
  it('the fixed pair of columns is still bound, and only on the revision screen', () => {
    expect(editFlowLayout).toContain('EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS')

    const bindings =
      templateOf(revisionEdit).match(/:class="EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS"/g) ?? []
    expect(bindings.length).toBeGreaterThanOrEqual(2)

    expect(draftEdit).not.toContain('EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS')
  })

  it('it keeps both captions, as `5395:107475` words them', () => {
    expect(revisionEdit).toContain('Вибір замовника')
    expect(revisionEdit).toContain('Вибір CEO')
    expect(revisionEdit).toContain('Доступні концепти')
  })

  /**
   * Her `4492:27189` draws no order button here. The brief-orders plan, phase
   * 4 («не из макетов», approved by the owner 01.10), adds it: a brief back
   * from the CEO may order a new concept. It goes UNDER the alternatives, so
   * the drawn pair above stays as she drew it (`revisionOrderScreens.test.ts`).
   */
  it('and the order button sits under the alternatives, not in her pair (phase 4)', () => {
    const template = templateOf(revisionEdit)
    expect(template.indexOf('<BriefOrderButton')).toBeGreaterThan(template.indexOf('Доступні концепти'))
  })
})
