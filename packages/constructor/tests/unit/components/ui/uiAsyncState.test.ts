import { describe, it, expect } from 'vitest'
import {
  UI_ASYNC_STATE_ROOT_CLASS,
  resolveUiAsyncStateClasses,
} from '@/components/ui/uiAsyncState'
import { resolveUiAlertClasses } from '@/components/ui/uiAlert'

/**
 * `UiAsyncState` — the one "failed to load" card, built from the kit alert
 * (`3461:5236`, Type = Error) and a Secondary S-32 button (`3333:5860`),
 * because the kit draws no error state of its own (open question 4).
 */

describe('the failed-to-load card', () => {
  it('settles the three paddings the tree had on the middle one, 48', () => {
    // Call sites carried py-8, py-12 and py-16. py-12 is 48 at a 16 root and
    // the kit spacing step nearest the median.
    expect(UI_ASYNC_STATE_ROOT_CLASS).toContain('py-12')
    expect(UI_ASYNC_STATE_ROOT_CLASS).not.toContain('py-8')
    expect(UI_ASYNC_STATE_ROOT_CLASS).not.toContain('py-16')
  })

  it('spans the slot it is dropped into', () => {
    expect(UI_ASYNC_STATE_ROOT_CLASS).toContain('w-full')
  })

  it('keeps a hook class', () => {
    expect(resolveUiAsyncStateClasses().root).toContain('ui-async-state')
  })

  it('owns the rhythm and nothing else — colour and box come from the alert', () => {
    const root = resolveUiAsyncStateClasses().root
    expect(root).not.toContain('border')
    expect(root).not.toContain('ring-')
    expect(root).not.toContain('bg-')
    expect(root).not.toContain('text-')
    expect(root).not.toContain('rounded')
  })

  it('no longer centres its text — the kit alert is left-aligned', () => {
    // Every replaced copy was `text-center`; the kit alert is a left-aligned
    // row of icon + text. Re-adding it would silently un-kit the card.
    expect(UI_ASYNC_STATE_ROOT_CLASS).not.toContain('text-center')
  })

  it('renders on the error tone of the alert', () => {
    const alert = resolveUiAlertClasses('error')
    expect(alert.root).toContain('bg-red-surface')
    expect(alert.root).toContain('ring-red-border')
    expect(alert.icon).toContain('text-red-content')
  })
})

describe('embed scale', () => {
  it('spells its padding in rem-based Tailwind', () => {
    expect(UI_ASYNC_STATE_ROOT_CLASS).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
    expect(UI_ASYNC_STATE_ROOT_CLASS).not.toMatch(/\bpy-\[/)
  })
})
