import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { briefThemeOptions } from '@/utils/briefOrderLock'

/**
 * H-24 (`docs/design-audit/brief-holes.md`, run 02.10: T-030, U-11): on a brief
 * «В роботі» the «Світла / Темна тема» switch on the concept screen could be
 * pressed, while the server refuses any theme change there («Бриф уже в роботі:
 * режим light/dark змінити не можна.»). The other theme is now disabled; the
 * brief's own stays shown as chosen.
 */
describe('theme switch of a brief «В роботі»', () => {
  it('only the brief\'s own theme can be pressed', () => {
    expect(briefThemeOptions('dark', 'in_work')).toEqual([
      { value: 'light', label: 'Світла тема', disabled: true },
      { value: 'dark', label: 'Темна тема', disabled: false },
    ])
  })

  it('a draft and a brief on revision switch freely', () => {
    for (const status of ['draft', 'needs_revision']) {
      expect(briefThemeOptions('light', status).every(o => !o.disabled)).toBe(true)
    }
  })

  it('the concept edit screen draws the switch from these options', () => {
    const view = readFileSync(
      resolve(__dirname, '../../../src/views/draft-edit/DraftConceptEditView.vue'),
      'utf8'
    )
    expect(view).toMatch(/briefThemeOptions\(/)
    expect(view).toMatch(/:options="themeSegmentOptions"/)
  })
})
