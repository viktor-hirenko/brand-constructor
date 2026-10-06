import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildDomainModeBody,
  canSaveDomainMode,
  domainPreviewErrorText,
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

describe('domainPreviewErrorText', () => {
  it('says in Ukrainian why the stage shows no check', () => {
    expect(domainPreviewErrorText('Domain check service not configured')).toBe('Перевірка доменів тут вимкнена')
    expect(domainPreviewErrorText('HTTP 502')).toBe('Не вдалося перевірити домен')
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

  it('both modals carry the choice, the old manual Available / Sold list is gone', () => {
    expect(view.match(/<NamingDomainModeField/g)).toHaveLength(2)
    expect(view).not.toContain('Override auto-check')
    // «Available» as a tab meant «not used in a brand yet» and read as «domain free».
    expect(view).toContain('Не використані')
    expect(view).not.toMatch(/<option value="available">/)
  })

  it('the table shows the price by status, not the raw column', () => {
    expect(view).toContain('resolveNamingPrice(n)')
    expect(view).not.toContain("n.price != null ? `$${n.price}`")
    // No «реєстрація» / «викуп» under the amount — the badge already says it.
    expect(view).not.toContain('price-kind')
  })

  it('row actions are a pencil and a bin in one line, the brand badge never wraps (owner, 06.10)', () => {
    expect(view).toContain("import pencilSimple from '@phosphor-icons/core/regular/pencil-simple.svg?raw'")
    expect(view).toContain("import trash from '@phosphor-icons/core/regular/trash.svg?raw'")
    expect(view.match(/aria-label="Редагувати"/g)).toHaveLength(2)
    expect(view.match(/aria-label="Видалити"/g)).toHaveLength(2)
    const badge = view.slice(view.indexOf('&__usage-badge {'), view.indexOf('&--used {', view.indexOf('&__usage-badge {')))
    expect(badge).toContain('white-space: nowrap')
    expect(badge).not.toContain('max-width')
  })

  it('Save and Create stay off while For sale has no price', () => {
    expect(view).toContain(':disabled="!canCreate"')
    expect(view).toContain(':disabled="!canSaveEdit"')
  })
})
