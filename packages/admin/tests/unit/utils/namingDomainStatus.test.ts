import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildDomainModeBody,
  canSaveDomainMode,
  domainPreviewProblem,
  formatUsd,
  initialDomainMode,
  parsePurchasePrice,
  resolveNamingPrice,
  resolveNamingStatusBadge,
} from '@/utils/namingDomainStatus'

/*
 * Domain status in the admin (docs/architecture/domain-status-plan.md).
 * Sofia's resold domains showed «$15» because one column held two prices and
 * the table showed it for every status; the only manual status was a free
 * pick of Available / Sold / Unknown, and her «Available» hid a $7 888 price.
 */

describe('resolveNamingPrice', () => {
  it('Available → the registration price', () => {
    expect(resolveNamingPrice({ availability_status: 'available', price: 15, purchase_price: null })).toEqual({
      amount: '$15',
      kind: 'registration',
    })
  })

  it('For sale → the purchase price, not the $15 registration one', () => {
    expect(resolveNamingPrice({ availability_status: 'for_sale', price: 15, purchase_price: 2685 })).toEqual({
      amount: '$2 685',
      kind: 'purchase',
    })
  })

  it('Sold and Unknown → no price, even with an old $15 in the row', () => {
    expect(resolveNamingPrice({ availability_status: 'sold', price: 15, purchase_price: null })).toBeNull()
    expect(resolveNamingPrice({ availability_status: 'unknown', price: 15, purchase_price: 900 })).toBeNull()
  })
})

describe('domainPreviewProblem', () => {
  it('on the stage the missing registrar is a note, not an error: nothing is broken there', () => {
    expect(domainPreviewProblem('Domain check service not configured', true)).toEqual({
      text: 'На тестовому стенді не перевіряється, чи домен вільний. Ціна викупу перевіряється.',
      error: false,
    })
  })

  it('anywhere else it is an error, and so is a failed check — the stage included', () => {
    expect(domainPreviewProblem('Domain check service not configured', false)).toEqual({
      text: 'Перевірка доменів на цьому сервері недоступна',
      error: true,
    })
    expect(domainPreviewProblem('HTTP 502', true)).toEqual({ text: 'Не вдалося перевірити домен', error: true })
    expect(domainPreviewProblem(null, false).error).toBe(true)
  })
})

describe('formatUsd', () => {
  it('groups thousands and keeps real cents only', () => {
    expect(formatUsd(7888)).toBe('$7 888')
    expect(formatUsd(12500)).toBe('$12 500')
    expect(formatUsd(9.5)).toBe('$9.50')
  })
})

describe('resolveNamingStatusBadge', () => {
  it('a badge for each status, For sale in its own colour', () => {
    expect(resolveNamingStatusBadge('for_sale')).toEqual({ modifier: 'for-sale', label: '$ For sale' })
    expect(resolveNamingStatusBadge('available').modifier).toBe('available')
    expect(resolveNamingStatusBadge('sold').modifier).toBe('sold')
    expect(resolveNamingStatusBadge(null).modifier).toBe('unknown')
  })
})

describe('the Automatic / For sale choice', () => {
  it('a manual row opens as For sale, everything else as Automatic', () => {
    expect(initialDomainMode('admin_override')).toBe('for_sale')
    expect(initialDomainMode('pananames')).toBe('automatic')
    expect(initialDomainMode('manual')).toBe('automatic')
    expect(initialDomainMode(null)).toBe('automatic')
  })

  it('For sale cannot be saved without a positive price', () => {
    expect(canSaveDomainMode('for_sale', '')).toBe(false)
    expect(canSaveDomainMode('for_sale', '0')).toBe(false)
    expect(canSaveDomainMode('for_sale', 'вартість')).toBe(false)
    expect(canSaveDomainMode('for_sale', '2685')).toBe(true)
    expect(canSaveDomainMode('automatic', '')).toBe(true)
  })

  it('the price field takes what people type', () => {
    expect(parsePurchasePrice('$2 685')).toBe(2685)
    expect(parsePurchasePrice('7,888')).toBe(7888)
    expect(parsePurchasePrice('99.5')).toBe(99.5)
    expect(parsePurchasePrice('-5')).toBeNull()
  })

  it('For sale sends the status and the price', () => {
    expect(buildDomainModeBody('for_sale', '2685', false)).toEqual({
      availability_status: 'for_sale',
      purchase_price: 2685,
    })
  })

  it('back to Automatic from For sale asks the server to recheck; plain Automatic sends nothing', () => {
    expect(buildDomainModeBody('automatic', '2685', true)).toEqual({ domain_check_source: 'manual' })
    expect(buildDomainModeBody('automatic', '', false)).toEqual({})
  })
})

describe('NamingsView wiring', () => {
  const view = readFileSync(resolve(__dirname, '../../../src/views/NamingsView.vue'), 'utf8')
  // The create window is its own component in the orders version — the
  // Orders page opens it too.
  const createModal = readFileSync(resolve(__dirname, '../../../src/components/library/NamingCreateModal.vue'), 'utf8')

  it('both modals carry the choice, the old manual Available / Sold list is gone', () => {
    expect(view.match(/<NamingDomainModeField/g)).toHaveLength(1)
    expect(createModal.match(/<NamingDomainModeField/g)).toHaveLength(1)
    expect(view).not.toContain('Override auto-check')
    expect(createModal).not.toContain('Pananames')
    // «Available» as a tab meant «not used in a brand yet» and read as «domain free».
    expect(view).toContain('Не використані')
    expect(view).not.toMatch(/<option value="available">/)
  })

  it('a concept is picked by typing — in the filter and in both windows (owner, 07.10)', () => {
    // The filter and the edit window here; the create window too, wherever it lives.
    expect((view.match(/<SearchSelect/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(view).not.toMatch(/<select/)
  })

  it('the table shows the price by status, not the raw column', () => {
    expect(view).toContain('resolveNamingPrice(n)')
    expect(view).not.toContain("n.price != null ? `$${n.price}`")
    // No «реєстрація» / «викуп» under the amount — the badge already says it.
    expect(view).not.toContain('price-kind')
  })

  it('row actions are a pencil and a bin in one line, the brand badge never wraps (owner, 06.10)', () => {
    // Since 07.10 every table's row actions are one component, `RowAction`.
    expect(view.match(/<RowAction[^>]*kind="edit"/g)).toHaveLength(2)
    expect(view.match(/<RowAction[^>]*kind="delete"/g)).toHaveLength(2)
    const rowAction = readFileSync(resolve(__dirname, '../../../src/components/ui/RowAction.vue'), 'utf8')
    expect(rowAction).toContain("'@phosphor-icons/core/regular/pencil-simple.svg?raw'")
    expect(rowAction).toContain("'@phosphor-icons/core/regular/trash.svg?raw'")
    // Marks in the table are Phosphor glyphs through PhosphorIcon, like every icon of the admin.
    for (const glyph of ['regular/arrow-up', 'regular/arrow-down', 'fill/warning-circle-fill']) {
      expect(view).toContain(`'@phosphor-icons/core/${glyph}.svg?raw'`)
    }
    expect(view).not.toMatch(/<svg|<path/)
    expect(view.match(/label="Редагувати"/g)).toHaveLength(2)
    expect(view.match(/label="Видалити"/g)).toHaveLength(2)
    const badge = view.slice(view.indexOf('&__usage-badge {'), view.indexOf('&--used {', view.indexOf('&__usage-badge {')))
    expect(badge).toContain('white-space: nowrap')
    expect(badge).not.toContain('max-width')
  })

  it('hints describe the status plainly, without orders to the reader or «команда» (owner, 06.10)', () => {
    const src = (path: string) => readFileSync(resolve(__dirname, '../../../src', path), 'utf8')
    const field = src('components/namings/NamingDomainModeField.vue')
    // Since 07.10 the status words live in the card behind a price or a status.
    const card = src('utils/namingPriceCheck.ts')
    for (const text of [view, field, card, src('components/namings/NamingPriceCheckModal.vue')]) {
      expect(text).not.toMatch(/Ставите|команда|нічна перевірка|[Сс]истема сама/)
    }
    expect(card).toContain("'Статус встановлено вручну.'")
    // The 06.10 hint «…не оновлюються автоматично» stopped being true on 07.10:
    // the price of a domain for sale is now set and kept by the price check.
    expect(field).not.toContain('не оновлюються автоматично')
    expect(field).toContain('Статус і ціна визначаються автоматично')
  })

  it('Save and Create stay off while For sale has no price', () => {
    expect(createModal).toContain(':disabled="!canCreate"')
    expect(view).toContain(':disabled="!canSaveEdit"')
  })
})
