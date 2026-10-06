import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * C-29 of `docs/design-audit/edit-flow-scenarios.md`: the CEO's «Затвердити бриф
 * зі змінами?» has «Повернути на доопрацювання» as its second button, and the
 * dialog's cross / Esc / backdrop fired the same event — closing the window
 * returned the brief to the author and sent the «повернуто» message.
 *
 * Tests read the SOURCE for bindings: `vitest.config.ts` runs in `node`.
 */
const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

describe('closing the approve-with-changes dialog only closes it', () => {
  it('the dialog can tell closing from its second button', () => {
    const modal = read('components/ui/ConfirmationModal.vue')
    expect(modal).toMatch(/<UiModal[^>]*@close="onModalClose"/)
    expect(modal).toMatch(/if \(props\.separateDismiss\) emit\('dismiss'\)\s*else emit\('cancel'\)/)
  })

  it('the CEO approve dialog closes on the cross without a status change', () => {
    const view = read('views/wizard/BriefReviewView.vue')
    const dialog = view.slice(view.indexOf('v-if="showApproveConfirm"'))
    const tag = dialog.slice(0, dialog.indexOf('/>'))
    expect(tag).toMatch(/\bseparate-dismiss\b/)
    expect(tag).toMatch(/@dismiss="cancelApproveConfirm"/)
    expect(view).toMatch(/function cancelApproveConfirm\(\) \{\s*showApproveConfirm\.value = false\s*\}/)
  })
})
