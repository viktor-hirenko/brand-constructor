import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { useTouchedFields } from '@/composables/useTouchedFields'

/**
 * H-38 (run 02.10: T-004): on step 1 the hints «Оберіть хоча б одну ГЕО» and
 * «Вкажіть дату запуску» showed only when a value was picked and then taken
 * away. Opening the GEO list or the calendar and leaving it empty said nothing,
 * and neither did a press on the greyed-out «Далі».
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`), so the wiring is read as text — the idiom of
 * `brandBasicsScreenVisual.test.ts` — and the touched-state composable it
 * leans on is driven for real.
 *
 * Shown red by putting back the four old files (step view, GEO select, date
 * picker, shell): every wiring case below fails.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

/** Everything below the doc comments — so a word quoted in prose is not a hit. */
function code(source: string): string {
  return source
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const stepView = code(read('views/wizard/BrandBasicsView.vue'))
const geoSelect = code(read('components/constructor/fields/GeoMultiSelect.vue'))
const datePicker = code(read('components/constructor/fields/DatePicker.vue'))
const shell = code(read('views/BriefShellView.vue'))

/** The `<Tag … />` or `<Tag …>` opening tag, attributes included. */
function openingTag(source: string, tag: string): string {
  const start = source.indexOf(`<${tag}`)
  expect(start).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf('>', start) + 1)
}

/** The body of the `watch(isOpen, …)` callback. */
function isOpenWatcher(source: string): string {
  const start = source.indexOf('watch(isOpen')
  expect(start).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf('\n})', start))
}

describe('touched state — what makes a required field speak', () => {
  it('starts quiet: no hint on a fresh screen', () => {
    const { touched } = useTouchedFields(['geo', 'launchDate'] as const, ref(0))
    expect(touched.geo).toBe(false)
    expect(touched.launchDate).toBe(false)
  })

  it('marks only the field the person left', () => {
    const { touched, touch } = useTouchedFields(['geo', 'launchDate'] as const, ref(0))
    touch('geo')
    expect(touched.geo).toBe(true)
    expect(touched.launchDate).toBe(false)
  })

  it('marks every field when the grey «Далі» is pressed', async () => {
    const presses = ref(0)
    const { touched } = useTouchedFields(['geo', 'launchDate'] as const, presses)
    presses.value++
    await nextTick()
    expect(touched.geo).toBe(true)
    expect(touched.launchDate).toBe(true)
  })

  it('works outside the shell, where nobody counts presses', () => {
    const { touched, touch } = useTouchedFields(['geo'] as const, null)
    touch('geo')
    expect(touched.geo).toBe(true)
  })
})

describe('step 1 — the hints come on leaving an empty field', () => {
  it('marks GEO when its list is left, not only when its value changes', () => {
    const tag = openingTag(stepView, 'GeoMultiSelect')
    expect(tag).toContain(`@blur="touch('geo')"`)
    expect(tag).toContain(`@update:model-value="touch('geo')"`)
  })

  it('marks the launch date when the calendar is left, not only when a day is picked', () => {
    const tag = openingTag(stepView, 'DatePicker')
    expect(tag).toContain(`@blur="touch('launchDate')"`)
    expect(tag).toContain(`@update:model-value="touch('launchDate')"`)
  })

  it('marks both on a press of the grey «Далі» the shell reports', () => {
    expect(stepView).toContain('useTouchedFields(')
    expect(stepView).toContain('useWizardBlockedNext()')
  })

  it('still shows a hint only while the field is empty', () => {
    expect(stepView).toContain('v-if="touched.geo && geo.length === 0"')
    expect(stepView).toContain('v-if="touched.launchDate && !launchDate"')
  })
})

describe('GEO select — says when the person is done with it', () => {
  it('emits `blur` when the list closes', () => {
    expect(geoSelect).toContain('defineEmits<{ blur: [] }>()')
    const watcher = isOpenWatcher(geoSelect)
    const closeBranch = watcher.slice(watcher.indexOf('} else {'))
    expect(closeBranch).toContain("emit('blur')")
  })

  it('closes the list on Tab out of the search', () => {
    expect(openingTag(geoSelect, 'div')).toContain('@focusout="handleFocusOut"')
  })
})

describe('date picker — says when the person is done with it', () => {
  it('emits `blur` when the calendar closes', () => {
    expect(datePicker).toContain('defineEmits<{ blur: [] }>()')
    const watcher = isOpenWatcher(datePicker)
    const closeBranch = watcher.slice(watcher.indexOf('} else {'))
    expect(closeBranch).toContain("emit('blur')")
  })

  it('emits `blur` when focus leaves the shut trigger', () => {
    expect(openingTag(datePicker, 'button')).toContain('@blur="handleTriggerBlur"')
  })
})

describe('wizard shell — a press on the grey «Далі» reaches the step', () => {
  it('hands the press count down to the step', () => {
    expect(shell).toContain('provide(WIZARD_BLOCKED_NEXT_KEY, blockedNextPresses)')
  })

  it('counts presses on the «Далі» footer while the step is not valid', () => {
    const start = shell.indexOf('primary-label="Далі"')
    expect(start).toBeGreaterThan(-1)
    const footer = shell.slice(start, shell.indexOf('>', start))
    expect(footer).toContain('@pointerdown="handleWizardFooterPointerDown"')

    const handler = shell.slice(
      shell.indexOf('function handleWizardFooterPointerDown('),
      shell.indexOf('\n}', shell.indexOf('function handleWizardFooterPointerDown('))
    )
    expect(handler).toContain('if (store.isCurrentStepValid) return')
    expect(handler).toContain("closest('button:disabled')")
    expect(handler).toContain('blockedNextPresses.value++')
  })
})
