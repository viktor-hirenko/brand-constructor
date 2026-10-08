import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { NamingPriceCheck, NamingPriceSourceReading } from '@brand-constructor/shared'
import {
  describeDomainCard,
  describePricePreview,
  describeSourceReading as describeSourceReadingRaw,
  formatCheckDate,
  initialPriceMode,
  looksLikeDomain,
  sitePricesRows,
  sitePricesState,
  sitePricesSummary,
  needsDecision,
  MANUAL_STALE_DAYS,
  keptOffer,
  priceCellExtras,
  priceDecisionErrorText,
  priceOffer,
  recheckKind,
  type CheckedNaming,
} from '@/utils/namingPriceCheck'

/*
 * The price check in the namings table (docs/architecture/domain-price-sync-plan.md,
 * «Предложение после просмотра владельцем»). The first version put three lines
 * of small text under every price, and the owner could not tell what had
 * happened, who had set the price, or whether anything was his to do. Now the
 * table shows a price and a status, at most one mark beside the price and one
 * button when a decision is a person's; the card says the rest in sentences.
 */

// Midday UTC: the same day and month in any time zone the tests run in.
const AT = '2026-10-07T12:00:00.000Z'
const NOW = new Date('2026-10-08T12:00:00.000Z')

/** Non-breaking spaces as plain ones — `formatUsd` groups thousands with them. */
const plain = (text: string) => text.replace(/\u00A0/g, ' ')

function check(kind: NamingPriceCheck['kind'], rest: Partial<NamingPriceCheck> = {}): NamingPriceCheck {
  return { kind, date: AT, source: null, url: null, amount: null, prev: null, sources: [], ...rest }
}

function forSale(price: number, rest: Partial<CheckedNaming> = {}): CheckedNaming {
  return {
    domain: 'darkmont.com',
    price: null,
    purchase_price: price,
    availability_status: 'for_sale',
    domain_checked_at: null,
    domain_check_source: 'admin_override',
    status: 'active',
    used_in_brand_id: null,
    price_check: null,
    price_auto: true,
    ...rest,
  }
}

const automatic = (rest: Partial<CheckedNaming> = {}): CheckedNaming =>
  forSale(0, { purchase_price: null, availability_status: 'sold', domain_check_source: 'pananames', price_auto: false, ...rest })

/** The card as a person reads it. */
const card = (n: CheckedNaming) => {
  const c = describeDomainCard(n)
  return plain([c.headline, ...c.details].join(' '))
}

describe('«Залишити свою» can be taken back', () => {
  const offer = { source: 'afternic' as const, amount: 97000 }

  it('a price a person typed, with the marketplace’s offer turned down: the same offer is there to reopen', () => {
    const n = forSale(1200, { price_auto: false, price_check: check('differs', offer) })
    expect(keptOffer(n)).toEqual(offer)
  })

  it('not while the offer is open, not for a naming used in a brand, not for a row that is not For sale', () => {
    expect(keptOffer(forSale(1200, { price_auto: false, price_check: check('proposal', offer) }))).toBeNull()
    expect(keptOffer(forSale(1200, { price_auto: false, status: 'used', price_check: check('differs', offer) }))).toBeNull()
    expect(keptOffer(automatic({ price_check: check('differs', offer) }))).toBeNull()
  })

  it('a price that follows a marketplace reads «differs» while a new one waits for its second day — that is no turned-down offer', () => {
    expect(keptOffer(forSale(2795, { price_auto: true, price_check: check('differs', { source: 'afternic', amount: 2995 }) }))).toBeNull()
  })

  it('the card has the button, beside «Закрити», and only for those who edit namings', () => {
    const modal = readFileSync(resolve(__dirname, '../../../src/components/namings/NamingPriceCheckModal.vue'), 'utf8')
    expect(modal).toContain('const kept = computed(() => (props.canWrite ? keptOffer(props.naming) : null))')
    expect(modal).toMatch(/<template v-else-if="kept">[\s\S]*@click="emit\('decide', 'reopen'\)"[\s\S]*Змінити рішення/)
  })
})

describe('beside the price in the table', () => {
  it('a marketplace’s price that did not change: nothing', () => {
    const n = forSale(2795, { price_check: check('verified', { source: 'afternic' }) })
    expect(priceCellExtras(n, NOW)).toEqual({ previous: null, trend: null, trendTitle: null, manual: false, manualSince: null, manualTitle: null })
  })

  it('the marketplace raised the price: an arrow up and the old price, for a week', () => {
    const n = forSale(2995, { price_check: check('updated', { source: 'afternic', prev: 2795 }) })
    const extras = priceCellExtras(n, NOW)
    expect(plain(extras.previous ?? '')).toBe('$2 795')
    expect(extras.trend).toBe('up')
    expect(plain(extras.trendTitle ?? '')).toBe('Ціна зросла: було $2 795')
    expect(priceCellExtras(n, new Date('2026-10-15T12:00:00.000Z'))).toMatchObject({ previous: null, trend: null })
  })

  it('the marketplace lowered it: an arrow down', () => {
    const n = forSale(2595, { price_check: check('updated', { source: 'afternic', prev: 2795 }) })
    const extras = priceCellExtras(n, NOW)
    expect(extras.trend).toBe('down')
    expect(plain(extras.trendTitle ?? '')).toBe('Ціна знизилась: було $2 795')
  })

  it('a price a person typed: «вручну» — before any check too', () => {
    expect(priceCellExtras(forSale(1200, { price_auto: false }), NOW)).toMatchObject({ previous: null, trend: null, manual: true })
    expect(priceCellExtras(forSale(1200, { price_auto: undefined }), NOW).manual).toBe(true)
  })

  // Nothing checks a price a person typed when no marketplace lists the
  // domain, so its age is the only sign it may be stale (the owner, 08.10:
  // «выбрал вручную, а потом забыл»).
  it('…and once nobody saved the record for a month, the day stands beside it: this year without the year, another with it', () => {
    const now = new Date('2026-10-08T12:00:00.000Z')
    const typed = (updated_at: string) => priceCellExtras(forSale(1200, { price_auto: false, updated_at }), now)
    expect(typed('2026-08-12 08:30:00')).toMatchObject({
      manualSince: '12.08',
      manualTitle: 'Ціну введено вручну, автоматично вона не змінюється. Запис востаннє змінювали 12.08.2026.',
    })
    expect(typed('2025-11-03 08:30:00').manualSince).toBe('03.11.25')
    expect(MANUAL_STALE_DAYS).toBe(30)
    expect(typed('2026-09-08 11:00:00').manualSince).toBe('08.09')
    expect(typed('2026-09-08 13:00:00').manualSince).toBeNull()
  })

  it('a fresh one is «вручну» alone — the column stays as wide as it was; its day is in the tooltip', () => {
    const now = new Date('2026-10-08T12:00:00.000Z')
    expect(priceCellExtras(forSale(1200, { price_auto: false, updated_at: '2026-10-06 09:00:00' }), now)).toMatchObject({
      manual: true,
      manualSince: null,
      manualTitle: 'Ціну введено вручну, автоматично вона не змінюється. Запис востаннє змінювали 06.10.2026.',
    })
  })

  it('no date in the record, or one that is no date: «вручну» alone, and its sentence without a day', () => {
    for (const updated_at of [undefined, '', 'yesterday']) {
      expect(priceCellExtras(forSale(1200, { price_auto: false, updated_at }), NOW)).toMatchObject({
        manual: true,
        manualSince: null,
        manualTitle: 'Ціну введено вручну, автоматично вона не змінюється.',
      })
    }
  })

  it('a price that follows a marketplace carries no day: it is checked every night', () => {
    const n = forSale(2795, { updated_at: '2025-09-12 08:30:00', price_check: check('verified', { source: 'afternic' }) })
    expect(priceCellExtras(n, NOW)).toMatchObject({ manual: false, manualSince: null, manualTitle: null })
  })

  it('a row that is not For sale has no marks, whatever is left in the record', () => {
    const n = automatic({ purchase_price: 1500, price_check: check('delisted', { prev: 1500 }) })
    expect(priceCellExtras(n, NOW)).toEqual({ previous: null, trend: null, trendTitle: null, manual: false, manualSince: null, manualTitle: null })
  })
})

describe('«Потрібне рішення» — the one thing a person acts on', () => {
  it('only when the server offers a price to take', () => {
    const offer = check('proposal', { source: 'afternic', amount: 97000 })
    expect(needsDecision(forSale(1200, { price_auto: false, price_check: offer }))).toBe(true)
    expect(needsDecision(forSale(1200, { price_check: check('differs', { source: 'afternic', amount: 97000 }) }))).toBe(false)
    expect(needsDecision(forSale(1200, { price_check: check('not_found') }))).toBe(false)
    expect(needsDecision(forSale(1200))).toBe(false)
  })

  it('never for a naming used in a brand: there is nothing to decide', () => {
    const offer = check('proposal', { source: 'afternic', amount: 97000 })
    expect(needsDecision(forSale(1200, { status: 'used', price_check: offer }))).toBe(false)
  })

  it('what «Взяти ціну сайту» sends', () => {
    expect(priceOffer(check('proposal', { source: 'namecheap', amount: 2685 }))).toEqual({ source: 'namecheap', amount: 2685 })
    expect(priceOffer(check('differs', { source: 'namecheap', amount: 2685 }))).toBeNull()
    expect(priceOffer(null)).toBeNull()
  })
})

describe('the card: who set the price, when it was checked, what happens next', () => {
  it('a marketplace’s price', () => {
    expect(card(forSale(2685, { price_check: check('verified', { source: 'namecheap' }) }))).toBe(
      'Продається власником за $2 685. Ціна з Namecheap, перевірено 07.10. Оновлюється автоматично щодня.'
    )
  })

  it('the marketplace changed it and the system followed', () => {
    expect(card(forSale(2685, { price_check: check('updated', { source: 'namecheap', prev: 2600 }) }))).toBe(
      'Продається власником за $2 685. 07.10 ціна на Namecheap змінилася: було $2 600. Запис оновлено автоматично.'
    )
  })

  it('a new price seen once: it will be written the next day', () => {
    expect(card(forSale(2795, { price_check: check('differs', { source: 'afternic', amount: 2995 }) }))).toBe(
      'Продається власником за $2 795. На Afternic ціна вже $2 995 (перевірено 07.10). Якщо наступного дня вона та сама, запис оновиться автоматично.'
    )
  })

  it('a typed price the marketplace disagrees with: the question', () => {
    const n = forSale(1200, { price_auto: false, price_check: check('proposal', { source: 'afternic', amount: 97000 }) })
    expect(card(n)).toBe(
      'Продається власником за $1 200. Ціну введено вручну. На Afternic домен продається за $97 000 (перевірено 07.10).'
    )
  })

  it('a typed price a person chose to keep', () => {
    const n = forSale(2600, { price_auto: false, price_check: check('differs', { source: 'namecheap', amount: 2685 }) })
    expect(card(n)).toBe(
      'Продається власником за $2 600. Ціну введено вручну, автоматично вона не змінюється. На Namecheap — $2 685 (перевірено 07.10).'
    )
  })

  it('a jump of the marketplace’s own price waits for a person', () => {
    const n = forSale(2795, { price_check: check('proposal', { source: 'afternic', amount: 5600 }) })
    expect(card(n)).toBe(
      'Продається власником за $2 795. Ціна на Afternic змінилася більш ніж удвічі: тепер $5 600. Така зміна не записується без підтвердження.'
    )
  })

  it('the listing is gone: what will happen', () => {
    expect(card(forSale(2795, { price_check: check('not_found') }))).toBe(
      'Продається власником за $2 795. 07.10 оголошення не знайдено на жодному сайті. Якщо його не буде три перевірки поспіль, статус For sale зніметься автоматично.'
    )
  })

  it('a typed price and no listing anywhere: nothing will change', () => {
    expect(card(forSale(1234, { price_auto: false, price_check: check('not_found_manual') }))).toBe(
      'Продається власником за $1 234. Ціну введено вручну, автоматично вона не змінюється. На Afternic, Sedo, Namecheap оголошення немає (перевірено 07.10).'
    )
  })

  it('offers only; no answer; not checked yet', () => {
    expect(card(forSale(2795, { price_check: check('no_fixed_price', { source: 'sedo' }) }))).toContain(
      'без фіксованої ціни в доларах. Ціна в записі не змінюється.'
    )
    expect(card(forSale(2795, { price_check: check('unread') }))).toContain(
      'Сайти не відповіли. Остання вдала перевірка — 07.10. Ціна і статус не змінюються.'
    )
    expect(card(forSale(2795, { price_auto: false }))).toBe(
      'Продається власником за $2 795. Ціну введено вручну. Afternic, Sedo, Namecheap ще не перевірялися. Перевірка — щодня вранці.'
    )
  })

  it('«For sale» taken off by the system: what it was and when', () => {
    const n = automatic({ availability_status: 'unknown', domain_check_source: 'manual', purchase_price: 1500, price_check: check('delisted', { prev: 1500 }) })
    expect(card(n)).toBe(
      'Невідомо, чи домен вільний. Домен продавався за $1 500. 07.10 оголошення зникло з усіх сайтів, статус For sale знято автоматично. Якщо домен з’явиться у продажу на Afternic, Sedo, Namecheap, статус For sale і ціна встановляться автоматично.'
    )
  })

  it('a taken domain nobody sells: the card says the sites were asked, when, and that For sale will come by itself', () => {
    expect(card(automatic({ domain_checked_at: '2026-10-07 12:00:00', price_check: check('not_listed') }))).toBe(
      'Домен зайнятий. Перевірено автоматично 07.10. На Afternic, Sedo, Namecheap домен не продається. Перевірено 07.10. Якщо домен з’явиться у продажу, статус For sale і ціна встановляться автоматично.'
    )
  })

  it('the stage, where nobody says whether a domain is free: still «не продається», never «перевірки ще не було»', () => {
    const text = card(automatic({ availability_status: 'unknown', domain_check_source: 'manual', price_check: check('not_listed') }))
    expect(text).toBe(
      'Невідомо, чи домен вільний. На Afternic, Sedo, Namecheap домен не продається. Перевірено 07.10. Якщо домен з’явиться у продажу, статус For sale і ціна встановляться автоматично.'
    )
    expect(text).not.toContain('перевірки ще не було')
  })

  it('a taken domain: offers only; a site that did not answer; sites not asked yet', () => {
    expect(card(automatic({ price_check: check('no_fixed_price') }))).toContain(
      'На Afternic, Sedo, Namecheap домен не має фіксованої ціни в доларах. Перевірено 07.10.'
    )
    expect(card(automatic({ price_check: check('unread') }))).toContain('Не всі сайти відповіли. Остання вдала перевірка — 07.10.')
    expect(card(automatic({ domain_checked_at: '2026-10-07 12:00:00' }))).toBe(
      'Домен зайнятий. Перевірено автоматично 07.10. Afternic, Sedo, Namecheap ще не перевірялися. Якщо домен з’явиться у продажу, статус For sale і ціна встановляться автоматично.'
    )
  })

  it('a free domain; a status nobody checked yet; an old manual status', () => {
    expect(card(automatic({ availability_status: 'available', price: 15 }))).toBe('Домен вільний. Реєстрація — $15. Перевірено автоматично.')
    expect(card(automatic({ availability_status: 'unknown', domain_check_source: 'manual' }))).toContain(
      'Невідомо, чи домен вільний. Afternic, Sedo, Namecheap ще не перевірялися.'
    )
    expect(card(automatic({ availability_status: 'sold', domain_check_source: 'admin_override' }))).toBe(
      'Домен зайнятий. Статус встановлено вручну.'
    )
  })

  it('a naming used in a brand is said to be fixed, and promised no change', () => {
    const n = forSale(2795, { status: 'used', price_check: check('differs', { source: 'afternic', amount: 2995 }) })
    expect(card(n)).toBe(
      'Продається власником за $2 795. Назву закріплено за брендом, запис не змінюється. На Afternic — $2 995 (перевірено 07.10).'
    )
    expect(card(forSale(2795, { status: 'used', price_check: check('not_found') }))).not.toContain('зніметься')
  })
})

describe('the card: what each marketplace asks', () => {
  const describeSourceReading = (r: NamingPriceSourceReading) => plain(describeSourceReadingRaw(r))
  const reading = (rest: Partial<NamingPriceSourceReading>): NamingPriceSourceReading => ({
    source: 'sedo',
    outcome: 'listed',
    amount: null,
    currency: null,
    min_offer: null,
    url: null,
    read_at: AT,
    ...rest,
  })

  it('a fixed price in dollars', () => {
    expect(describeSourceReading(reading({ amount: 2995, currency: 'USD' }))).toBe('$2 995')
  })

  it('a price in euros is shown as it is, not as dollars', () => {
    expect(describeSourceReading(reading({ outcome: 'no_fixed_price', amount: 1300, currency: 'EUR' }))).toBe('1 300 EUR')
  })

  it('offers only, with and without a minimum', () => {
    expect(describeSourceReading(reading({ outcome: 'no_fixed_price', min_offer: 2000 }))).toBe(
      'лише пропозиції, від $2 000'
    )
    expect(describeSourceReading(reading({ outcome: 'no_fixed_price' }))).toBe('без фіксованої ціни')
  })

  it('no listing and no answer are different words', () => {
    expect(describeSourceReading(reading({ outcome: 'absent' }))).toBe('не знайдено')
    expect(describeSourceReading(reading({ outcome: 'unread', amount: 2995 }))).toBe('не перевірено')
  })
})

describe('the edit window opens on the choice the row has', () => {
  it('a marketplace’s price and any automatic status — «Автоматично»', () => {
    expect(initialPriceMode({ domain_check_source: 'admin_override', price_auto: true })).toBe('automatic')
    expect(initialPriceMode({ domain_check_source: 'pananames', price_auto: false })).toBe('automatic')
    expect(initialPriceMode({ domain_check_source: 'manual' })).toBe('automatic')
  })

  it('a typed price, and an old manual status that still asks for one, — «Своя ціна»', () => {
    expect(initialPriceMode({ domain_check_source: 'admin_override', price_auto: false })).toBe('for_sale')
    expect(initialPriceMode({ domain_check_source: 'admin_override' })).toBe('for_sale')
  })
})

describe('recheckKind — what «Перевірити зараз» rechecks', () => {
  const row = (rest: object) => ({
    domain: 'darkmont.com',
    availability_status: 'sold' as const,
    domain_check_source: 'pananames' as const,
    used_in_brand_id: null,
    ...rest,
  })

  it('an automatic row — the domain, as before', () => {
    expect(recheckKind(row({}))).toBe('domain')
    expect(recheckKind(row({ domain_check_source: 'manual', availability_status: 'unknown' }))).toBe('domain')
  })

  it('a «For sale» row — its price at the marketplaces', () => {
    expect(recheckKind(row({ availability_status: 'for_sale', domain_check_source: 'admin_override' }))).toBe('price')
  })

  it('nothing to recheck: an old manual status, a naming used in a brand, no domain', () => {
    expect(recheckKind(row({ availability_status: 'available', domain_check_source: 'admin_override' }))).toBeNull()
    expect(recheckKind(row({ used_in_brand_id: 'brand_1' }))).toBeNull()
    expect(
      recheckKind(row({ availability_status: 'for_sale', domain_check_source: 'admin_override', used_in_brand_id: 'brand_1' }))
    ).toBeNull()
    expect(recheckKind(row({ domain: null }))).toBeNull()
  })
})

describe('formatCheckDate, priceDecisionErrorText', () => {
  it('day and month — of an ISO date and of the database’s own; nothing for no date', () => {
    expect(formatCheckDate('2026-01-05T12:00:00.000Z')).toBe('05.01')
    expect(formatCheckDate('2026-01-05 12:00:00')).toBe('05.01')
    expect(formatCheckDate(null)).toBe('')
    expect(formatCheckDate('not a date')).toBe('')
  })

  it('the server’s refusal of a stale offer, in words', () => {
    expect(priceDecisionErrorText('The marketplace price has changed')).toBe(
      'Ціна на сайті вже інша. Дані в таблиці оновлено.'
    )
    expect(priceDecisionErrorText('Internal Server Error')).toBe('Не вдалося зберегти')
  })
})

describe('the three sites in the create and edit windows', () => {
  const reading = (
    source: NamingPriceSourceReading['source'],
    outcome: NamingPriceSourceReading['outcome'],
    amount: number | null = null
  ): NamingPriceSourceReading => ({ source, outcome, amount, currency: amount == null ? null : 'USD', min_offer: null, url: null, read_at: AT })
  const everywhere = [reading('afternic', 'listed', 3495), reading('sedo', 'listed', 3495), reading('namecheap', 'listed', 3480)]
  const nowhere = [reading('afternic', 'absent'), reading('sedo', 'absent'), reading('namecheap', 'absent')]

  it('a domain for sale: the price, the site it is from, and that a save writes it — only when «Автоматично» is on', () => {
    const preview = { sources: everywhere, price: 3495, source: 'afternic' as const }
    expect(plain(describePricePreview(preview, true))).toBe(
      'Продається власником за $3 495 — ціна з Afternic. Після збереження: статус For sale і ця ціна.'
    )
    expect(plain(describePricePreview(preview, false))).toBe('Продається власником за $3 495 — ціна з Afternic.')
  })

  it('nobody sells it; offers only; a site that did not answer — three different sentences', () => {
    expect(describePricePreview({ sources: nowhere, price: null, source: null }, true)).toBe(
      'На Afternic, Sedo, Namecheap домен не продається.'
    )
    expect(
      describePricePreview({ sources: [reading('afternic', 'no_fixed_price'), ...nowhere.slice(1)], price: null, source: null }, true)
    ).toBe('На Afternic, Sedo, Namecheap домен не має фіксованої ціни в доларах.')
    expect(
      describePricePreview({ sources: [reading('afternic', 'unread'), ...nowhere.slice(1)], price: null, source: null }, true)
    ).toBe('Не всі сайти відповіли. Ціну буде перевірено після збереження.')
  })

  // The frame keeps its height in every state: the same three rows and a
  // sentence (or its skeleton) — the owner counted four jumps of the window.
  const at = (over: Partial<Parameters<typeof sitePricesState>[0]>) =>
    sitePricesState({ domain: 'joystones.com', free: false, saved: false, loading: false, failed: false, ready: false, ...over })

  it('the state of the frame: nothing typed, being asked, answered, saved, failed, free', () => {
    expect(at({ domain: '' })).toBe('idle')
    expect(at({ domain: 'joystones' })).toBe('idle')
    expect(at({ loading: true })).toBe('loading')
    // Between the keystroke and the answer there is never an empty frame.
    expect(at({})).toBe('loading')
    expect(at({ ready: true })).toBe('ready')
    expect(at({ ready: true, loading: true })).toBe('loading')
    expect(at({ failed: true })).toBe('failed')
    expect(at({ saved: true, loading: true })).toBe('saved')
    expect(at({ free: true, saved: true })).toBe('free')
  })

  it('always the same three rows in the same order — only the value changes', () => {
    const sites = (state: Parameters<typeof sitePricesRows>[0], sources: NamingPriceSourceReading[] | null) =>
      sitePricesRows(state, sources).map(r => [r.label, r.value === null ? null : plain(r.value)])
    expect(sites('idle', null)).toEqual([['Afternic', '—'], ['Sedo', '—'], ['Namecheap', '—']])
    expect(sites('loading', everywhere)).toEqual([['Afternic', null], ['Sedo', null], ['Namecheap', null]])
    expect(sites('ready', everywhere)).toEqual([['Afternic', '$3 495'], ['Sedo', '$3 495'], ['Namecheap', '$3 480']])
    expect(sites('saved', nowhere)).toEqual([['Afternic', 'не знайдено'], ['Sedo', 'не знайдено'], ['Namecheap', 'не знайдено']])
    // A site the check never stored still has its row.
    expect(sites('saved', everywhere.slice(0, 1))).toEqual([['Afternic', '$3 495'], ['Sedo', '—'], ['Namecheap', '—']])
    expect(sites('free', everywhere)).toEqual([['Afternic', '—'], ['Sedo', '—'], ['Namecheap', '—']])
    expect(sites('failed', null)).toHaveLength(3)
  })

  it('the sentence above the rows: a hint, a skeleton while asked, the answer, the date of a saved check', () => {
    const given = { preview: { sources: everywhere, price: 3495, source: 'afternic' as const }, automatic: true, saved: null }
    expect(sitePricesSummary('idle', given)).toBe('Введіть домен — тут з’являться ціни викупу на Afternic, Sedo, Namecheap.')
    expect(sitePricesSummary('loading', given)).toBeNull()
    expect(plain(sitePricesSummary('ready', given) ?? '')).toContain('Продається власником за $3 495 — ціна з Afternic.')
    expect(sitePricesSummary('saved', { ...given, saved: nowhere })).toBe('Остання перевірка — 07.10.')
    expect(sitePricesSummary('failed', given)).toBe('Не вдалося перевірити сайти. Ціну буде визначено після збереження.')
    expect(sitePricesSummary('free', given)).toBe('Домен вільний — викуповувати не потрібно.')
  })

  it('the sites are asked about a domain, not about every keystroke', () => {
    for (const text of ['hunteria.com', ' Betwood.COM ', 'https://www.preland.com/page', 'my-site.co.uk']) {
      expect(looksLikeDomain(text), text).toBe(true)
    }
    for (const text of ['', 'hunteria', 'hunteria.', 'hunteria.c', '.com', 'a b']) expect(looksLikeDomain(text), text).toBe(false)
  })
})
