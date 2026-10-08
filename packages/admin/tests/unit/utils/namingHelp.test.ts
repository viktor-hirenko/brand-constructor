import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveNamingStatusBadge } from '@/utils/namingDomainStatus'
import { DOMAIN_FILTERS } from '@/utils/namingFilters'
import {
  DOMAIN_CARD_HINT,
  FILTER_HINTS,
  HELP_FOOTNOTE,
  HELP_SECTIONS,
  PRICE_COLUMN_HINT,
  STATUS_COLUMN_HINT,
  STATUS_HINTS,
  priceHint,
  statusHint,
} from '@/utils/namingHelp'

/*
 * What the namings table does not say of itself (the owner, 08.10: «думай как
 * пользователь, который видит это впервые»). The texts are here, apart from
 * the markup, so that a new status or a new quick filter cannot appear without
 * its sentence — and so that the tone of the tab's hints holds (06.10: the
 * hints describe, they do not give orders).
 */

const read = (path: string) => readFileSync(resolve(__dirname, '../../../src', path), 'utf8')
const VIEW = read('views/NamingsView.vue')
const MODAL = read('components/namings/NamingHelpModal.vue')

const EVERY_TEXT = [
  DOMAIN_CARD_HINT,
  PRICE_COLUMN_HINT,
  STATUS_COLUMN_HINT,
  HELP_FOOTNOTE,
  ...Object.values(STATUS_HINTS),
  ...Object.values(FILTER_HINTS),
  ...HELP_SECTIONS.flatMap(s => [s.title, ...s.lines]),
  priceHint('for_sale') ?? '',
  priceHint('available') ?? '',
]

describe('the sentences', () => {
  it('every quick filter above the table has one', () => {
    for (const filter of DOMAIN_FILTERS) expect(FILTER_HINTS[filter.id], filter.id).toMatch(/\.$/)
    expect(Object.keys(FILTER_HINTS).sort()).toEqual(DOMAIN_FILTERS.map(f => f.id).sort())
  })

  it('every status the table can show has one, under the word the badge shows', () => {
    for (const status of ['available', 'sold', 'for_sale', 'unknown'] as const) {
      const word = resolveNamingStatusBadge(status).label.replace(/^\S+\s/, '')
      expect(STATUS_HINTS[status].startsWith(`${word} — `), status).toBe(true)
    }
    // A status nobody listed reads as «not checked yet», never as nothing.
    expect(statusHint('something new')).toBe(STATUS_HINTS.unknown)
    expect(statusHint(null)).toBe(STATUS_HINTS.unknown)
    expect(statusHint('for_sale')).toBe('For sale — домен зайнятий, але власник його продає.')
  })

  it('the «Ціна» column holds two prices, and each cell says which one it is', () => {
    expect(PRICE_COLUMN_HINT).toContain('вартість реєстрації')
    expect(PRICE_COLUMN_HINT).toContain('продає власник')
    expect(priceHint('for_sale')).toBe('Ціна, за яку домен продає власник.')
    expect(priceHint('available')).toBe('Вартість реєстрації вільного домену.')
    // Any other row has a dash for a price: nothing to explain.
    expect(priceHint('sold')).toBeUndefined()
  })

  it('describe, not order: no imperative, no «команда», no «нічна перевірка», no «система сама»', () => {
    for (const text of EVERY_TEXT) {
      expect(text, text).not.toMatch(/Ставите|команда|нічна перевірка|[Сс]истема сама/)
      expect(text, text).not.toMatch(/(^|[\s«(])(Натисн|Оберіть|Виберіть|Введіть|Відкрийте|Перевірте|Зверніть)/)
    }
  })

  it('«Як це працює» is one screen: four questions, fifteen lines at most', () => {
    expect(HELP_SECTIONS.map(s => s.title)).toEqual(['Статус домену', 'Звідки статус і ціна', 'Коли потрібне рішення', 'Своя ціна викупу'])
    expect(HELP_SECTIONS.flatMap(s => s.lines).length).toBeLessThanOrEqual(15)
    for (const site of ['Afternic', 'Sedo', 'Namecheap']) expect(HELP_SECTIONS[1].lines.join(' ')).toContain(site)
  })
})

describe('where they stand', () => {
  it('the «Ціна» and «Статус домену» headers answer the pointer with a sentence, and carry no mark', () => {
    expect(VIEW).toContain('<span :title="PRICE_COLUMN_HINT">Ціна</span>')
    expect(VIEW).toContain('<span :title="STATUS_COLUMN_HINT">Статус домену</span>')
    // An «i» beside «Ціна» sat off the line and read as a thing of its own
    // («непонятно, что это за буковка и для чего она», the owner, 08.10).
    expect(VIEW).not.toContain('th-hint')
  })

  it('a price, a status badge and every quick filter answer the pointer with theirs', () => {
    expect(VIEW).toContain(':title="priceHint(n.availability_status)"')
    expect(VIEW).toContain(':title="statusHint(n.availability_status)"')
    expect(VIEW).toContain(':title="FILTER_HINTS[f.id]"')
  })

  // A price, a status and the red mark all opened the same card, each with a
  // look of its own: «зачем и цена, и статус открывают одну карточку» (the
  // owner, 08.10). The card is about the domain — the domain opens it.
  it('one way into the card — the domain, and it looks a link; a price and a status are text', () => {
    const row = VIEW.slice(VIEW.indexOf('<tr v-for="n in sortedExternal"'), VIEW.indexOf('<tr v-if="sortedInternal.length === 0"'))
    expect(row).toMatch(/class="namings-view__cell-button namings-view__domain-link"\s*:title="DOMAIN_CARD_HINT"\s*@click\.stop="openPriceWindow\(n\.id\)"/)
    // The domain, and the red «Потрібне рішення» mark: there a person has to act.
    expect(row.match(/openPriceWindow\(n\.id\)/g)).toHaveLength(2)
    expect(row).toContain('<span v-if="resolveNamingPrice(n)" class="namings-view__price-cell"')
    expect(row).not.toMatch(/<button[^>]*namings-view__(price-cell|status-badge)/)
    expect(VIEW).toMatch(/&__domain-link \{[^}]*color: \$color-primary;/)
    expect(HELP_FOOTNOTE).toContain('відкривається з назви домену')
  })

  it('«вручну» says on hover when the record was last saved; a month-old one shows the day and changes colour', () => {
    expect(VIEW).toContain(':title="priceCellExtras(n).manualTitle ?? undefined"')
    expect(VIEW).toContain(`:class="{ 'namings-view__price-manual--stale': priceCellExtras(n).manualSince }"`)
    expect(VIEW).toContain(`вручну<template v-if="priceCellExtras(n).manualSince"> · {{ priceCellExtras(n).manualSince }}</template>`)
  })

  it('«Як це працює?» stands beside the quick filters of External Naming only and opens the window', () => {
    expect(VIEW).toContain(`<button v-if="activeTab === 'external'" type="button" class="namings-view__help-link" @click="showHelp = true">`)
    expect(VIEW).toContain('<NamingHelpModal v-if="showHelp" @close="showHelp = false" />')
    expect(MODAL).toContain('title="Як це працює"')
    expect(MODAL).toContain('v-for="section in HELP_SECTIONS"')
  })
})
