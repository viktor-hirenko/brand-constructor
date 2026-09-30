import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { externalIdsOnConceptCancel } from '@/utils/revisionConceptCancel'
import { useAuthorRevisionDraft } from '@/stores/constructor/useAuthorRevisionDraft'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Owner 30.09: «Редагувати» у Concept → «Скасувати» wiped «Вибір замовника» of
 * External Naming. The fix must keep every other path of the flow as it was.
 */

function makeDraft() {
  return useAuthorRevisionDraft({
    brandId: ref(null),
    brandStatus: ref('needs_revision'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stepData: ref({} as any),
    editingSection: ref(null),
    editingSectionSnapshot: ref(null),
    restoreEditingSession: () => {},
  } as unknown as Parameters<typeof useAuthorRevisionDraft>[0])
}

describe('«Скасувати» on the revision concept screen and the external names', () => {
  it('straight «Редагувати» → «Скасувати»: names are left alone', () => {
    const d = makeDraft()
    expect(externalIdsOnConceptCancel(d.authorRevisionDraft.value)).toBeNull()
  })

  it('clicking another concept without «Далі»: still left alone', () => {
    const d = makeDraft()
    d.setAuthorRevisionPendingConcept('con-other')
    expect(externalIdsOnConceptCancel(d.authorRevisionDraft.value)).toBeNull()
  })

  it('after «Далі» with a new concept: the captured names come back', () => {
    const d = makeDraft()
    d.captureAuthorRevisionBaselineExternal(['exn-1', 'exn-2'])
    expect(externalIdsOnConceptCancel(d.authorRevisionDraft.value)).toEqual(['exn-1', 'exn-2'])
  })

  it('after «Далі» when the Author had no names: the empty list is a real baseline', () => {
    const d = makeDraft()
    d.captureAuthorRevisionBaselineExternal([])
    expect(externalIdsOnConceptCancel(d.authorRevisionDraft.value)).toEqual([])
  })

  it('a reset draft forgets the capture', () => {
    const d = makeDraft()
    d.captureAuthorRevisionBaselineExternal(['exn-1'])
    d.resetAuthorRevisionDraft()
    expect(externalIdsOnConceptCancel(d.authorRevisionDraft.value)).toBeNull()
  })

  it('the view goes through the guard, not the raw baseline', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../../src/views/revision-response/RevisionConceptView.vue', import.meta.url)),
      'utf8',
    )
    const cancel = src.slice(src.indexOf('function goCancel()'), src.indexOf('async function goDali()'))
    expect(cancel).toContain('externalIdsOnConceptCancel(store.authorRevisionDraft)')
    expect(cancel).not.toContain('selectedIds: [...store.authorRevisionDraft.baselineExternalIds]')
  })
})
