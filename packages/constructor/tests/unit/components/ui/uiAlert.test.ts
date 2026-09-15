import { describe, it, expect } from 'vitest'
import {
  UI_ALERT_ACTIONS_CLASS,
  UI_ALERT_DESCRIPTION_CLASS,
  UI_ALERT_ICON_CLASS,
  UI_ALERT_ROOT_CLASS,
  UI_ALERT_TITLE_CLASS,
  UI_ALERT_TONES,
  resolveUiAlertClasses,
  resolveUiAlertRole,
  type UiAlertType,
} from '@/components/ui/uiAlert'

/**
 * `UiAlert` class map — Figma `3461:5236`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const TYPES: UiAlertType[] = ['default', 'info', 'success', 'warning', 'error']

describe('kit alert — Figma 3461:5236', () => {
  it('carries all five types of the kit and no sixth', () => {
    expect(Object.keys(UI_ALERT_TONES).sort()).toEqual([...TYPES].sort())
  })

  it('paints each semantic type from its own kit slot trio', () => {
    // border → semantic/border, background → semantic/surface,
    // icon → semantic/content. Mixing the slots is the failure this pins.
    expect(UI_ALERT_TONES.info.box).toContain('border-blue-border')
    expect(UI_ALERT_TONES.info.box).toContain('bg-blue-surface')
    expect(UI_ALERT_TONES.info.icon).toContain('text-blue-content')

    expect(UI_ALERT_TONES.success.box).toContain('border-green-border')
    expect(UI_ALERT_TONES.success.box).toContain('bg-green-surface')
    expect(UI_ALERT_TONES.success.icon).toContain('text-green-content')

    expect(UI_ALERT_TONES.warning.box).toContain('border-amber-border')
    expect(UI_ALERT_TONES.warning.box).toContain('bg-amber-surface')
    expect(UI_ALERT_TONES.warning.icon).toContain('text-amber-content')

    expect(UI_ALERT_TONES.error.box).toContain('border-red-border')
    expect(UI_ALERT_TONES.error.box).toContain('bg-red-surface')
    expect(UI_ALERT_TONES.error.icon).toContain('text-red-content')
  })

  it('keeps default neutral — white box, ink-300 hairline, ink icon', () => {
    // alert/border/default is #eaeaeb, which is --color-ink-300 since the
    // DP-15258 token fix (app.css).
    expect(UI_ALERT_TONES.default.box).toContain('bg-white')
    expect(UI_ALERT_TONES.default.box).toContain('border-ink-300')
    expect(UI_ALERT_TONES.default.icon).toContain('text-ink-900')
  })

  it('holds the kit box geometry: radius 16, padding 16, gap 12', () => {
    expect(UI_ALERT_ROOT_CLASS).toContain('rounded-2xl')
    expect(UI_ALERT_ROOT_CLASS).toContain('p-4')
    expect(UI_ALERT_ROOT_CLASS).toContain('gap-3')
    expect(UI_ALERT_ROOT_CLASS).toContain('border')
    expect(UI_ALERT_ROOT_CLASS).toContain('items-start')
  })

  it('sizes the icon 24 and never lets it shrink', () => {
    expect(UI_ALERT_ICON_CLASS).toContain('size-6')
    expect(UI_ALERT_ICON_CLASS).toContain('shrink-0')
  })

  it('types the text as kit header s over body', () => {
    // header s = 18/24 medium, body = 16/24 regular in ink-700.
    expect(UI_ALERT_TITLE_CLASS).toContain('text-lg/6')
    expect(UI_ALERT_TITLE_CLASS).toContain('font-medium')
    expect(UI_ALERT_TITLE_CLASS).toContain('text-ink-900')
    expect(UI_ALERT_DESCRIPTION_CLASS).toContain('text-base')
    expect(UI_ALERT_DESCRIPTION_CLASS).toContain('text-ink-700')
  })

  it('lets a long text column shrink instead of pushing the icon out', () => {
    expect(UI_ALERT_ROOT_CLASS).toContain('w-full')
    expect(resolveUiAlertClasses().text).toContain('min-w-0')
    expect(resolveUiAlertClasses().text).toContain('flex-1')
  })

  it('wraps the action row instead of overflowing a narrow embed', () => {
    expect(UI_ALERT_ACTIONS_CLASS).toContain('flex-wrap')
    expect(UI_ALERT_ACTIONS_CLASS).toContain('items-center')
  })

  it('resolves every type into the same six-slot shape', () => {
    for (const type of TYPES) {
      const classes = resolveUiAlertClasses(type)
      expect(Object.keys(classes).sort()).toEqual([
        'actions',
        'description',
        'icon',
        'root',
        'text',
        'title',
      ])
      expect(classes.root).toContain(UI_ALERT_ROOT_CLASS)
      expect(classes.root).toContain(UI_ALERT_TONES[type].box)
      expect(classes.icon).toContain(UI_ALERT_TONES[type].icon)
    }
  })

  it('defaults to the neutral type', () => {
    expect(resolveUiAlertClasses()).toEqual(resolveUiAlertClasses('default'))
  })

  it('keeps a hook class on every slot so a call site can reach it', () => {
    const classes = resolveUiAlertClasses('info')
    expect(classes.root).toContain('ui-alert ')
    expect(classes.root).toContain('ui-alert--info')
    expect(classes.icon).toContain('ui-alert__icon')
    expect(classes.text).toContain('ui-alert__text')
    expect(classes.title).toContain('ui-alert__title')
    expect(classes.description).toContain('ui-alert__description')
    expect(classes.actions).toContain('ui-alert__actions')
  })
})

describe('screen readers — only a failure interrupts', () => {
  it('announces error and warning as alert, the rest as status', () => {
    expect(resolveUiAlertRole('error')).toBe('alert')
    expect(resolveUiAlertRole('warning')).toBe('alert')
    expect(resolveUiAlertRole('info')).toBe('status')
    expect(resolveUiAlertRole('success')).toBe('status')
    expect(resolveUiAlertRole('default')).toBe('status')
    expect(resolveUiAlertRole()).toBe('status')
  })
})

describe('embed scale — the alert may not opt out of the root font-size', () => {
  it('spells every length in rem-based Tailwind, never px/vw/vh/em', () => {
    for (const type of TYPES) {
      for (const value of Object.values(resolveUiAlertClasses(type))) {
        expect(value).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
      }
    }
  })

  it('carries no arbitrary length value — the one bracket is a colour', () => {
    for (const type of TYPES) {
      for (const value of Object.values(resolveUiAlertClasses(type))) {
        expect(value).not.toMatch(/\b[wh]-\[/)
        expect(value).not.toMatch(/\b(p|m|gap)[trblxy]?-\[/)
        expect(value).not.toMatch(/\btext-\[(?!#)/)
      }
    }
  })
})
