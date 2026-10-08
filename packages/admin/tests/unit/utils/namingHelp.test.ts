import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveNamingStatusBadge } from '@/utils/namingDomainStatus'
import { DOMAIN_FILTERS } from '@/utils/namingFilters'
import {
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
  PRICE_COLUMN_HINT,
  STATUS_COLUMN_HINT,
  HELP_FOOTNOTE,
  ...Object.values(STATUS_HINTS),
  ...Object.values(FILTER_HINTS),
  ...HELP_SECTIONS.flatMap(s => [s.title, ...s.lines]),
  priceHint('for_sale'),
  priceHint('available'),
  priceHint('sold'),
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
    expect(statusHint('something new', false)).toBe(STATUS_HINTS.unknown)
    expect(statusHint(null, false)).toBe(STATUS_HINTS.unknown)
  })

  it('a badge that opens the card says so; one that does not — only what the status means', () => {
    expect(statusHint('for_sale', true)).toBe('For sale — домен зайнятий, але власник його продає. Подробиці — у картці домену.')
    expect(statusHint('for_sale', false)).toBe('For sale — домен зайнятий, але власник його продає.')
  })

  it('the «Ціна» column holds two prices, and each cell says which one it is', () => {
    expect(PRICE_COLUMN_HINT).toContain('вартість реєстрації')
    expect(PRICE_COLUMN_HINT).toContain('продає власник')
    expect(priceHint('for_sale')).toContain('Ціна, за яку домен продає власник.')
    expect(priceHint('available')).toContain('Вартість реєстрації вільного домену.')
    expect(priceHint('for_sale')).not.toBe(priceHint('available'))
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
  it('the «Ціна» header carries a mark with the sentence; «Статус домену» answers the pointer without one', () => {
    expect(VIEW).toContain(':title="PRICE_COLUMN_HINT" :aria-label="PRICE_COLUMN_HINT"')
    // That header is the widest thing in its column: a mark there widened the
    // table by 20 px and pushed «Автор» further under the actions (08.10).
    expect(VIEW).toContain('<span :title="STATUS_COLUMN_HINT">Статус домену</span>')
    expect(VIEW.match(/namings-view__th-hint-icon" \/>/g)).toHaveLength(1)
  })

  it('a price, a status badge and every quick filter answer the pointer with theirs', () => {
    expect(VIEW).toContain(':title="priceHint(n.availability_status)"')
    expect(VIEW).toContain(':title="statusHint(n.availability_status, !!n.domain)"')
    expect(VIEW).toContain(':title="FILTER_HINTS[f.id]"')
  })

  it('what opens the card looks it: a dotted line under a price, a mark after a status that is a button', () => {
    expect(VIEW).toMatch(/button\.namings-view__price-cell \{\s*text-decoration: underline dotted/)
    expect(VIEW).toMatch(/button\.namings-view__status-badge::after \{\s*content: '›'/)
  })

  it('«Як це працює?» stands beside the quick filters of External Naming only and opens the window', () => {
    expect(VIEW).toContain(`<button v-if="activeTab === 'external'" type="button" class="namings-view__help-link" @click="showHelp = true">`)
    expect(VIEW).toContain('<NamingHelpModal v-if="showHelp" @close="showHelp = false" />')
    expect(MODAL).toContain('title="Як це працює"')
    expect(MODAL).toContain('v-for="section in HELP_SECTIONS"')
  })
})
