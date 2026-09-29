import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ── Switching the theme must not move the page — DP-15450, Concept Selection 2
 *
 * Her words: «При перемиканні світлої/темної теми змінюється позиція progress
 * bar і розмір карток концептів. → При перемиканні теми layout не має стрибати;
 * позиції та розміри елементів мають залишатися стабільними.»
 *
 * Three separate things had to be true, and only one of them needed fixing:
 *
 * 1. **The progress bar.** It used to live inside the scrolling left pane; the
 *    header rework (her remark Concept Selection 5) moved it to
 *    `UiWizardHeader`, above both columns. Nothing in the pane can move it now.
 * 2. **Card size.** The grid is `auto-fill` over `--wizard-concept-card-min`,
 *    so a card follows the COLUMN width — and the column reserves its
 *    scrollbar gutter whether or not the content overflows, so the column
 *    width does not change when a taller or shorter list arrives.
 * 3. **The list itself.** This is what jumped. Every theme switch refetches,
 *    and while the request was in flight the grid was replaced by a fixed
 *    SIX-tile skeleton — so the block went N cards → 6 tiles → M cards and
 *    everything under it moved twice. `useApi` keeps the previous `data` until
 *    the new result lands, so the skeleton is now asked for on the FIRST load
 *    only and the cards swap in place.
 *
 * All four screens that carry the theme segment are pinned, not just step 2:
 * the segment is drawn on step 2, the CEO re-select, the revision flow and the
 * draft edit flow, and they had the same gate.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

const step2 = read('views/wizard/ConceptSelectionView.vue')
const draftEdit = read('views/draft-edit/DraftConceptEditView.vue')
const ceoReselect = read('views/alternative-selection/AlternativeConceptView.vue')
const revision = read('views/revision-response/RevisionConceptView.vue')

const grid = read('components/constructor/alternative-selection/ConceptGrid.vue')
const skeleton = read('components/constructor/skeletons/ConceptGridSkeleton.vue')
const header = read('components/ui/UiWizardHeader.vue')
const appCss = read('styles/app.css')

describe('the skeleton belongs to the first load, not to every refetch', () => {
  it('step 2 — the screen the remark is filed against', () => {
    expect(step2).toContain('const showSkeleton = computed(() => !hasFetched.value)')
    expect(step2).not.toContain('!hasFetched.value || loading.value')
    // The refetch itself stays: light and dark are different lists.
    expect(step2).toContain('watch(selectedMode, loadConcepts)')
  })

  it('the draft edit flow', () => {
    expect(draftEdit).toContain('const showSkeleton = computed(() => !hasFetched.value)')
    expect(draftEdit).not.toContain('!hasFetched.value || loading.value')
  })

  it('the CEO re-select flow, whose whole page used to flip to skeletons', () => {
    expect(ceoReselect).toContain(
      'const isReady = computed(\n  () => hasFetchedConcepts.value && hasFetchedPoConcept.value\n)',
    )
    expect(ceoReselect).not.toContain('!poConceptLoading.value')
    expect(ceoReselect).not.toMatch(/isReady[\s\S]{0,200}!loading\.value/)
  })

  it('the revision flow', () => {
    const gate = revision.slice(
      revision.indexOf('const showGridSkeleton'),
      revision.indexOf('async function loadConcepts'),
    )
    expect(gate).toContain('!hasFetchedConcepts.value')
    expect(gate).not.toContain('loading.value ||')
  })

  it('none of the four still takes `loading` off the list composable', () => {
    // Nothing reads it any more, and leaving it destructured is how it creeps
    // back into a gate.
    for (const view of [step2, draftEdit, ceoReselect, revision]) {
      expect(view).not.toMatch(/(^|[,{\s])loading\s*,/m)
    }
  })
})

describe('the two other halves of her remark hold by construction', () => {
  it('the progress rule is in the header, above the panes', () => {
    expect(header).toContain('role="progressbar"')
    expect(step2).not.toContain('progressbar')
  })

  it('the grid and its skeleton size cards off the same variable', () => {
    const template =
      '[grid-template-columns:repeat(auto-fill,minmax(var(--wizard-concept-card-min),1fr))]'
    expect(grid).toContain(template)
    expect(skeleton).toContain(template)
  })

  it('the left pane reserves its scrollbar gutter, so the column width is fixed', () => {
    const rule = appCss.slice(appCss.indexOf('.wizard-scrollbar {'))
    expect(rule).toContain('scrollbar-gutter: stable')
  })
})
